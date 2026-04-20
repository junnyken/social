const cron = require('node-cron');
const config = require('../config');
const dataService = require('./data.service');
const fbGraphV2 = require('./fb-graph-v2.service');
const cryptoSvc = require('./crypto.service');
const spinner = require('./spinner.service');
const logger = require('./logger.service');
const delaySvc = require('./delay.service');
const { checkAndRenewTokens } = require('./token-renewal.service');
const { emitToAll } = require('../config/socket-io');

class SchedulerService {
    constructor() {
        this.task = null;
        this.isRunning = false;
        // Keep reference to app to access websocket
        this.app = null;
    }

    setApp(app) {
        this.app = app;
    }

    start() {
        if (this.task) return;
        console.log('[Scheduler] Starting cron loop...');
        
        this.task = cron.schedule(config.scheduler.cronInterval, async () => {
            await this.processQueue();
        });
        
        this.task.start();
        this.isRunning = true;

        // Token renewal — daily at 3:00 AM
        cron.schedule('0 3 * * *', async () => {
            console.log('[Scheduler] 🔑 Running daily token renewal check...');
            try { await checkAndRenewTokens(); } catch (e) {
                console.error('[Scheduler] Token renewal error:', e.message);
            }
        });
        console.log('[Scheduler] 🔑 Token renewal cron scheduled (daily 3 AM)');
    }

    stop() {
        if (this.task) {
            this.task.stop();
            this.task = null;
        }
        this.isRunning = false;
        console.log('[Scheduler] Stopped.');
    }

    async processQueue() {
        console.log(`[Scheduler] Checking queue at ${new Date().toISOString()}...`);
        
        let targetHours = config.scheduler.operatingHours;
        const currentHour = new Date().getHours();
        
        // Check if within operating hours
        if (currentHour < targetHours.start || currentHour >= targetHours.end) {
            console.log('[Scheduler] Outside operating hours. Skipping.');
            return;
        }

        // Fetch queue
        const schedule = await dataService.read('schedules');
        
        // Filter pending jobs whose scheduled time has arrived or passed
        const pending = schedule.filter(s => s.status === 'pending' && (!s.scheduledAt || new Date(s.scheduledAt) <= new Date()));
        
        if (pending.length === 0) {
            return;
        }

        console.log(`[Scheduler] Found ${pending.length} pending jobs.`);
        
        // Process ONLY 1 job per tick to prevent spamming
        const job = pending[0];
        
        // Check Rate Limit Guard
        const account = await dataService.getById('accounts', job.accountId);
        if (!account) {
            console.warn(`[Scheduler] Account ${job.accountId} not found. Skipping job.`);
            return;
        }

        const todayKey = new Date().toISOString().slice(0, 10);
        const todayPosts = account.dailyPosts?.[todayKey] || account.postsToday || 0;

        if (todayPosts >= (config.rateLimits.dailyPostsPerAccount || 20)) {
            console.log(`[Scheduler] Rate limit reached for ${job.accountId}: ${todayPosts} today. Skipping.`);
            return;
        }

        const page = (account.pages || []).find(p => p.id === job.target.id);
        if (!page) {
             console.warn(`[Scheduler] Page ${job.target.id} not found on account ${job.accountId}.`);
             return;
        }

        try {
            // Update status to processing
            await dataService.update('schedules', job.id, { status: 'processing' });
            
            // Spin content
            const finalContent = spinner.spin(job.content);
            
            // Artificial delay to look human
            await delaySvc.sleepForType('pagePost');
            
            // Send to correct platform based on target.platform
            const pageToken = page.access_token;
            const platform = job.target?.platform || 'facebook';
            let result;

            switch (platform) {
                case 'instagram': {
                    const igService = require('./instagram.service');
                    const igId = await igService.getIGAccountId(pageToken, job.target.id);
                    if (!igId) { result = { success: false, error: 'No IG Business Account linked to this Page' }; break; }
                    if (job.images?.length > 1) {
                        result = await igService.publishCarousel(pageToken, igId, job.images, finalContent);
                    } else if (job.images?.[0]) {
                        result = await igService.publishImage(pageToken, igId, job.images[0], finalContent);
                    } else {
                        result = { success: false, error: 'Instagram requires at least 1 image or video' };
                    }
                    break;
                }
                case 'linkedin': {
                    const liService = require('./linkedin.service');
                    const liToken = account.linkedinToken || account.tokens?.linkedin;
                    const authorUrn = account.linkedinUrn || account.tokens?.linkedinUrn;
                    if (!liToken || !authorUrn) { result = { success: false, error: 'LinkedIn not connected' }; break; }
                    if (job.images?.[0]) {
                        result = await liService.publishImagePost(liToken, authorUrn, finalContent, job.images[0]);
                    } else {
                        result = await liService.publishPost(liToken, authorUrn, finalContent);
                    }
                    break;
                }
                case 'tiktok': {
                    const ttService = require('./tiktok.service');
                    const ttToken = account.tiktokToken || account.tokens?.tiktok;
                    if (!ttToken) { result = { success: false, error: 'TikTok not connected' }; break; }
                    if (!job.images?.[0]) { result = { success: false, error: 'TikTok requires a video URL' }; break; }
                    result = await ttService.publishVideo(ttToken, job.images[0], finalContent);
                    break;
                }
                case 'facebook':
                default:
                    result = await fbGraphV2.publishPagePost(pageToken, job.target.id, finalContent, job.images?.[0]);
                    break;
            }
            
            if (result.success) {
                // Update schedule status
                await dataService.update('schedules', job.id, { 
                    status: 'done', 
                    publishedId: result.id,
                    processedAt: new Date().toISOString()
                });

                // Update account daily usage counter
                await dataService.update('accounts', job.accountId, {
                    [`dailyPosts.${todayKey}`]: todayPosts + 1
                });

                await logger.log(job.accountId, job.target.name || job.target.id, finalContent, 'success', this.app);
            } else {
                const newRetries = (job.retries || 0) + 1;
                const newStatus = newRetries >= (job.maxRetries || 3) ? 'failed' : 'pending';
                await dataService.update('schedules', job.id, { 
                    status: newStatus, 
                    error: result.error,
                    retries: newRetries,
                    processedAt: new Date().toISOString()
                });
                await logger.log(job.accountId, job.target.name || job.target.id, finalContent, 'failed', this.app);
            }

        } catch (e) {
            console.error('[Scheduler] Job processing error:', e);
            const newRetries = (job.retries || 0) + 1;
            const newStatus = newRetries >= (job.maxRetries || 3) ? 'failed' : 'pending';
            await dataService.update('schedules', job.id, { 
                status: newStatus, 
                error: e.message,
                retries: newRetries,
                processedAt: new Date().toISOString()
            });
        }
    }

    // ── Evergreen Auto-Recycle ───────────────────────────────────
    startEvergreenCron() {
        if (this.evergreenTask) return;
        console.log('[Scheduler] Starting Evergreen auto-recycle cron (every 2h)...');
        this.evergreenTask = cron.schedule('0 */2 * * *', async () => {
            await this.processEvergreen();
        });
        this.evergreenTask.start();
    }

    async processEvergreen() {
        try {
            const evergreenService = require('./evergreen.service');
            const queues = await evergreenService.getQueues();
            const activeQueues = queues.filter(q => q.status === 'active');

            for (const queue of activeQueues) {
                // Check if current time matches schedule
                const now = new Date();
                const dayOfWeek = now.getDay(); // 0=Sun
                if (!queue.schedule?.daysOfWeek?.includes(dayOfWeek)) continue;

                const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                const matchesTimeSlot = (queue.schedule?.timesOfDay || []).some(t => {
                    // Match within 2-hour window
                    const [h] = t.split(':').map(Number);
                    return Math.abs(now.getHours() - h) <= 1;
                });
                if (!matchesTimeSlot) continue;

                // Get next eligible post
                const nextPosts = await evergreenService.getNextUp(queue.id, 1);
                if (nextPosts.length > 0) {
                    try {
                        await evergreenService.recyclePost(queue.id, nextPosts[0].id);
                        console.log(`[Evergreen] Auto-recycled post "${nextPosts[0].content?.substring(0, 40)}..." in queue "${queue.name}"`);
                    } catch (e) {
                        console.warn(`[Evergreen] Recycle failed for queue "${queue.name}": ${e.message}`);
                    }
                }
            }
        } catch (e) {
            console.error('[Evergreen] Cron error:', e.message);
        }
    }

    // ── Listening Auto-Fetch ────────────────────────────────────
    startListeningCron() {
        if (this.listeningTask) return;
        console.log('[Scheduler] Starting Listening auto-fetch cron (every 3h)...');
        this.listeningTask = cron.schedule('0 */3 * * *', async () => {
            await this.processListening();
        });
        this.listeningTask.start();
    }

    async processListening() {
        try {
            const listeningService = require('./listening.service');
            const keywords = await listeningService.getKeywords();
            if (!keywords || keywords.length === 0) return;

            // Fetch recent comments from all connected pages
            const accounts = await dataService.getAll('accounts');
            for (const account of accounts) {
                for (const page of (account.pages || [])) {
                    try {
                        const fbService = require('./fb-graph-v2.service');
                        // Get recent posts
                        const postsRes = await fbService.getPagePosts(page.access_token, page.id, 10);
                        const posts = postsRes?.data || [];

                        for (const post of posts) {
                            // Get comments for each post
                            try {
                                const commentsRes = await fbService.getPostComments(page.access_token, post.id, 25);
                                const comments = commentsRes?.data || [];

                                for (const comment of comments) {
                                    const text = comment.message || '';
                                    // Check if any keyword is mentioned
                                    for (const kw of keywords) {
                                        if (text.toLowerCase().includes(kw.term.toLowerCase())) {
                                            await listeningService.saveMention({
                                                keyword: kw.term,
                                                text: text,
                                                platform: 'facebook',
                                                author: comment.from?.name || 'Unknown',
                                                url: `https://facebook.com/${post.id}`,
                                                timestamp: comment.created_time || new Date().toISOString()
                                            });
                                        }
                                    }
                                }
                            } catch (e) { /* skip individual post errors */ }
                        }
                    } catch (e) {
                        console.warn(`[Listening] Error fetching page ${page.name}: ${e.message}`);
                    }
                }
            }
            console.log(`[Listening] Auto-fetch completed for ${keywords.length} keywords`);
        } catch (e) {
            console.error('[Listening] Cron error:', e.message);
        }
    }
}

module.exports = new SchedulerService();
