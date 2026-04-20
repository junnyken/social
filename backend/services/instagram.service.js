/**
 * Instagram Publishing Service
 * Uses Facebook Graph API (Instagram is owned by Meta)
 * Requires: IG Business Account ID + Page Access Token with instagram_content_publish permission
 * Flow: createMediaContainer → wait → publishMedia
 */

const axios = require('axios');
const config = require('../config');

class InstagramService {
    constructor() {
        this.version = config.fb?.apiVersion || 'v19.0';
        this.baseUrl = `https://graph.facebook.com/${this.version}`;
    }

    /**
     * Get Instagram Business Account ID for a Facebook Page
     */
    async getIGAccountId(pageToken, pageId) {
        try {
            const res = await axios.get(`${this.baseUrl}/${pageId}`, {
                params: { fields: 'instagram_business_account', access_token: pageToken }
            });
            return res.data?.instagram_business_account?.id || null;
        } catch (error) {
            console.error('[Instagram] getIGAccountId Error:', error.response?.data || error.message);
            return null;
        }
    }

    /**
     * Publish a single image post to Instagram
     */
    async publishImage(pageToken, igAccountId, imageUrl, caption = '') {
        try {
            // Step 1: Create media container
            const container = await axios.post(`${this.baseUrl}/${igAccountId}/media`, null, {
                params: {
                    image_url: imageUrl,
                    caption,
                    access_token: pageToken
                }
            });
            const containerId = container.data.id;

            // Step 2: Wait for container to be ready (poll status)
            await this._waitForContainer(pageToken, containerId);

            // Step 3: Publish
            const publish = await axios.post(`${this.baseUrl}/${igAccountId}/media_publish`, null, {
                params: { creation_id: containerId, access_token: pageToken }
            });

            return { success: true, id: publish.data.id, platform: 'instagram' };
        } catch (error) {
            console.error('[Instagram] publishImage Error:', error.response?.data || error.message);
            return { success: false, error: error.response?.data?.error?.message || error.message, platform: 'instagram' };
        }
    }

    /**
     * Publish a carousel (multiple images) to Instagram
     */
    async publishCarousel(pageToken, igAccountId, imageUrls = [], caption = '') {
        try {
            // Step 1: Create individual item containers
            const childIds = [];
            for (const url of imageUrls.slice(0, 10)) {
                const child = await axios.post(`${this.baseUrl}/${igAccountId}/media`, null, {
                    params: { image_url: url, is_carousel_item: true, access_token: pageToken }
                });
                childIds.push(child.data.id);
            }

            // Step 2: Create carousel container
            const container = await axios.post(`${this.baseUrl}/${igAccountId}/media`, null, {
                params: {
                    media_type: 'CAROUSEL',
                    children: childIds.join(','),
                    caption,
                    access_token: pageToken
                }
            });
            const containerId = container.data.id;

            await this._waitForContainer(pageToken, containerId);

            // Step 3: Publish
            const publish = await axios.post(`${this.baseUrl}/${igAccountId}/media_publish`, null, {
                params: { creation_id: containerId, access_token: pageToken }
            });

            return { success: true, id: publish.data.id, platform: 'instagram', type: 'carousel' };
        } catch (error) {
            console.error('[Instagram] publishCarousel Error:', error.response?.data || error.message);
            return { success: false, error: error.response?.data?.error?.message || error.message, platform: 'instagram' };
        }
    }

    /**
     * Publish a Reel (video) to Instagram
     */
    async publishReel(pageToken, igAccountId, videoUrl, caption = '', coverUrl = null) {
        try {
            const params = {
                media_type: 'REELS',
                video_url: videoUrl,
                caption,
                access_token: pageToken
            };
            if (coverUrl) params.cover_url = coverUrl;

            const container = await axios.post(`${this.baseUrl}/${igAccountId}/media`, null, { params });
            const containerId = container.data.id;

            // Videos take longer to process
            await this._waitForContainer(pageToken, containerId, 60, 5000);

            const publish = await axios.post(`${this.baseUrl}/${igAccountId}/media_publish`, null, {
                params: { creation_id: containerId, access_token: pageToken }
            });

            return { success: true, id: publish.data.id, platform: 'instagram', type: 'reel' };
        } catch (error) {
            console.error('[Instagram] publishReel Error:', error.response?.data || error.message);
            return { success: false, error: error.response?.data?.error?.message || error.message, platform: 'instagram' };
        }
    }

    /**
     * Get IG account insights
     */
    async getAccountInsights(pageToken, igAccountId, metric = 'impressions,reach,profile_views', period = 'day') {
        try {
            const res = await axios.get(`${this.baseUrl}/${igAccountId}/insights`, {
                params: { metric, period, access_token: pageToken }
            });
            return res.data.data;
        } catch (error) {
            console.error('[Instagram] getAccountInsights Error:', error.response?.data || error.message);
            return [];
        }
    }

    /**
     * Poll container status until ready or timeout
     */
    async _waitForContainer(pageToken, containerId, maxAttempts = 30, interval = 2000) {
        for (let i = 0; i < maxAttempts; i++) {
            const status = await axios.get(`${this.baseUrl}/${containerId}`, {
                params: { fields: 'status_code', access_token: pageToken }
            });
            if (status.data.status_code === 'FINISHED') return true;
            if (status.data.status_code === 'ERROR') throw new Error('Media container failed');
            await new Promise(r => setTimeout(r, interval));
        }
        throw new Error('Timeout waiting for media container');
    }
}

module.exports = new InstagramService();
