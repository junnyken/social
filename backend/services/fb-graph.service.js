const axios = require('axios');
const config = require('../config');

class FBGraphService {
    constructor() {
        this.baseURL = `https://graph.facebook.com/${config.fb.apiVersion}`;
    }

    /**
     * Validate Page/User Token
     */
    async validateToken(token) {
        try {
            const res = await axios.get(`${this.baseURL}/me?access_token=${token}`);
            return { valid: true, data: res.data };
        } catch (error) {
            return { valid: false, error: error.response?.data || error.message };
        }
    }

    /**
     * Post to a specific Page or Group
     */
    async publishPost(targetId, message, token, type = 'page') {
        try {
            // endpoint differs slightly: /{page-id}/feed or /{group-id}/feed
            const endpoint = `${this.baseURL}/${targetId}/feed`;
            const payload = {
                message,
                access_token: token
            };


            const response = await axios.post(endpoint, payload);
            return { success: true, id: response.data.id };

        } catch (error) {
            console.error(`[FB Graph] Publish Error:`, error.response?.data || error.message);
            return { success: false, error: error.response?.data?.error?.message || 'Unknown Graph Error' };
        }
    }
    
    /**
     * Fetch user Facebook Pages
     */
    async getAccounts(userToken) {
        try {

            const res = await axios.get(`${this.baseURL}/me/accounts?access_token=${userToken}`);
            return res.data;
        } catch(e) {
            return { error: 'Failed to fetch accounts' };
        }
    }
}

module.exports = new FBGraphService();
