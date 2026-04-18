const cron = require('node-cron');
const config = require('../config');
const dataService = require('./data.service');
const fbGraph = require('./fb-graph.service');
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
        
        try {
            // Update status to processing
            await dataService.update('schedules', job.id, { status: 'processing' });
            
            // Spin content
            const finalContent = spinner.spin(job.content);
            
            // Artificial delay to look human
            await delaySvc.sleepForType('pagePost');
            
            // Send to FB
            // In Phase 2 this should fetch the actual token from accounts DB
            const result = await fbGraph.publishPost(job.target.id, finalContent, 'mock', job.target.type, job.images);
            
            if (result.success) {
                await dataService.update('schedules', job.id, { 
                    status: 'done', 
                    publishedId: result.id,
                    processedAt: new Date().toISOString()
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
