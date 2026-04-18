const config = require('../config');

class DelayService {
    /**
     * Pauses execution for a calculated duration
     * @param {string} profile - 'pagePost', 'groupPost', 'betweenAccs'
     */
    async sleepForType(profile) {
        const bounds = config.delay[profile] || { min: 8, max: 15 };
        const jitterConfig = config.delay.jitter || { max: 30 };
        
        // minutes to ms
        const delayMs = (bounds.min + Math.random() * (bounds.max - bounds.min)) * 60 * 1000;
        
        // Add random jitter explicitly requested in seconds -> ms
        const jitter = Math.random() * jitterConfig.max;
        const jitterMs = jitter * 1000;
        
        const totalMs = Math.floor(delayMs + jitterMs);
        
        console.log(`[DelayService] Sleeping for ${totalMs}ms (${profile})`);
        return new Promise(resolve => setTimeout(resolve, totalMs));
    }
}

module.exports = new DelayService();
