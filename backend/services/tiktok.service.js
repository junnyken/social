/**
 * TikTok Publishing Service
 * Uses TikTok Content Posting API v2
 * Requires: TikTok OAuth2 Access Token
 * Docs: https://developers.tiktok.com/doc/content-posting-api-get-started
 * Note: Requires TikTok app review for production; sandbox mode for testing
 */

const axios = require('axios');

class TikTokService {
    constructor() {
        this.baseUrl = 'https://open.tiktokapis.com/v2';
    }

    /**
     * Initialize a video upload to TikTok
     * Flow: initUpload → upload video chunks → publish
     */
    async publishVideo(accessToken, videoUrl, caption = '', privacyLevel = 'SELF_ONLY') {
        try {
            // Step 1: Initialize upload
            const initRes = await axios.post(`${this.baseUrl}/post/publish/video/init/`, {
                post_info: {
                    title: caption.slice(0, 150), // TikTok title limit
                    privacy_level: privacyLevel, // SELF_ONLY, MUTUAL_FOLLOW_FRIENDS, FOLLOWER_OF_CREATOR, PUBLIC_TO_EVERYONE
                    disable_duet: false,
                    disable_comment: false,
                    disable_stitch: false
                },
                source_info: {
                    source: 'PULL_FROM_URL',
                    video_url: videoUrl
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const publishId = initRes.data.data?.publish_id;
            if (!publishId) throw new Error('Failed to initialize TikTok upload');

            // Step 2: Poll for upload status
            const status = await this._pollPublishStatus(accessToken, publishId);

            return {
                success: true,
                id: publishId,
                status,
                platform: 'tiktok'
            };
        } catch (error) {
            console.error('[TikTok] publishVideo Error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error?.message || error.message,
                platform: 'tiktok'
            };
        }
    }

    /**
     * Get TikTok creator info
     */
    async getCreatorInfo(accessToken) {
        try {
            const res = await axios.post(`${this.baseUrl}/post/publish/creator_info/query/`, {}, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            return res.data?.data || null;
        } catch (error) {
            console.error('[TikTok] getCreatorInfo Error:', error.response?.data || error.message);
            return null;
        }
    }

    /**
     * Poll publish status (TikTok processes videos asynchronously)
     */
    async _pollPublishStatus(accessToken, publishId, maxAttempts = 30, interval = 5000) {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const res = await axios.post(`${this.baseUrl}/post/publish/status/fetch/`, {
                    publish_id: publishId
                }, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                const status = res.data?.data?.status;
                if (status === 'PUBLISH_COMPLETE') return 'published';
                if (status === 'FAILED') throw new Error('TikTok publish failed: ' + JSON.stringify(res.data?.data));

                await new Promise(r => setTimeout(r, interval));
            } catch (error) {
                if (error.message.includes('publish failed')) throw error;
                // Retry on transient errors
            }
        }
        return 'processing'; // Still processing after timeout
    }
}

module.exports = new TikTokService();
