const cron = require('node-cron');
const config = require('../config');
const dataService = require('./data.service');
const fbGraphV2 = require('./fb-graph-v2.service');
const cryptoSvc = require('./crypto.service');
const spinner = require('./spinner.service');
const logger = require('./logger.service');
const delaySvc = require('./delay.service');

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
        
        // In real app, filter where scheduledTime <= now and status == 'pending'
        // For Phase 1 mockup, we just grab pending ones
        const pending = schedule.filter(s => s.status === 'pending');
        
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
            
            // Send to FB using real token
            const pageToken = page.access_token;
            const result = await fbGraphV2.publishPagePost(pageToken, job.target.id, finalContent, job.images?.[0]);
            
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
}

module.exports = new SchedulerService();
