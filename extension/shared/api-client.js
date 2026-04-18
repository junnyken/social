/**
 * API Wrapper mapped to our local Node.js Server
 */
window.ApiClient = {
    async fetch(endpoint, options = {}) {
        const url = `${window.FB_CONSTANTS.API_BASE_URL}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json'
            },
            // credentials: 'omit' // If we decide to use cookie auth from extension later
        };

        const config = { ...defaultOptions, ...options };
        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            return await response.json();
        } catch (e) {
            console.error(`[API Client] Fetch error at ${endpoint}:`, e);
            return { success: false, error: e.message };
        }
    },

    async getQueue() {
        return this.fetch('/queue');
    },

    async registerFailure(jobId, errorMsg) {
        // Technically mapped to a specific API later or logger directly
        console.log(`[API Client] Job ${jobId} failed: ${errorMsg}`);
    },

    async markSuccess(jobId) {
        console.log(`[API Client] Job ${jobId} succeeded`);
    }
};
