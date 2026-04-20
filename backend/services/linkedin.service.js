/**
 * LinkedIn Publishing Service
 * Uses LinkedIn Marketing/Community Management API
 * Requires: OAuth2 Access Token + Organization URN (urn:li:organization:XXXXX)
 * Docs: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares
 */

const axios = require('axios');

class LinkedInService {
    constructor() {
        this.baseUrl = 'https://api.linkedin.com/v2';
        this.restUrl = 'https://api.linkedin.com/rest';
    }

    /**
     * Publish a text post / share to LinkedIn
     * @param {string} accessToken - LinkedIn OAuth2 token
     * @param {string} authorUrn - urn:li:person:XXX or urn:li:organization:XXX
     * @param {string} text - Post content
     * @param {string|null} articleUrl - Optional link to share
     * @param {string|null} articleTitle - Title for the link
     */
    async publishPost(accessToken, authorUrn, text, articleUrl = null, articleTitle = null) {
        try {
            const body = {
                author: authorUrn,
                lifecycleState: 'PUBLISHED',
                specificContent: {
                    'com.linkedin.ugc.ShareContent': {
                        shareCommentary: { text },
                        shareMediaCategory: articleUrl ? 'ARTICLE' : 'NONE'
                    }
                },
                visibility: {
                    'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
                }
            };

            // Add article if URL provided
            if (articleUrl) {
                body.specificContent['com.linkedin.ugc.ShareContent'].media = [{
                    status: 'READY',
                    originalUrl: articleUrl,
                    title: { text: articleTitle || articleUrl }
                }];
            }

            const res = await axios.post(`${this.baseUrl}/ugcPosts`, body, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'X-Restli-Protocol-Version': '2.0.0'
                }
            });

            return { success: true, id: res.headers['x-restli-id'] || res.data.id, platform: 'linkedin' };
        } catch (error) {
            console.error('[LinkedIn] publishPost Error:', error.response?.data || error.message);
            return { success: false, error: error.response?.data?.message || error.message, platform: 'linkedin' };
        }
    }

    /**
     * Publish an image post to LinkedIn (2-step: register upload → post)
     */
    async publishImagePost(accessToken, authorUrn, text, imageUrl) {
        try {
            // Step 1: Register upload
            const registerBody = {
                registerUploadRequest: {
                    recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
                    owner: authorUrn,
                    serviceRelationships: [{
                        relationshipType: 'OWNER',
                        identifier: 'urn:li:userGeneratedContent'
                    }]
                }
            };

            const registerRes = await axios.post(
                `${this.baseUrl}/assets?action=registerUpload`,
                registerBody,
                { headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
            );

            const uploadUrl = registerRes.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
            const asset = registerRes.data.value.asset;

            // Step 2: Upload the image
            const imageBuffer = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            await axios.put(uploadUrl, imageBuffer.data, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/octet-stream'
                }
            });

            // Step 3: Create share with uploaded image
            const postBody = {
                author: authorUrn,
                lifecycleState: 'PUBLISHED',
                specificContent: {
                    'com.linkedin.ugc.ShareContent': {
                        shareCommentary: { text },
                        shareMediaCategory: 'IMAGE',
                        media: [{
                            status: 'READY',
                            media: asset,
                            title: { text: 'Image' }
                        }]
                    }
                },
                visibility: {
                    'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
                }
            };

            const res = await axios.post(`${this.baseUrl}/ugcPosts`, postBody, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'X-Restli-Protocol-Version': '2.0.0'
                }
            });

            return { success: true, id: res.headers['x-restli-id'] || res.data.id, platform: 'linkedin' };
        } catch (error) {
            console.error('[LinkedIn] publishImagePost Error:', error.response?.data || error.message);
            return { success: false, error: error.response?.data?.message || error.message, platform: 'linkedin' };
        }
    }

    /**
     * Get LinkedIn profile info (ME)
     */
    async getProfile(accessToken) {
        try {
            const res = await axios.get(`${this.baseUrl}/me`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            return res.data;
        } catch (error) {
            console.error('[LinkedIn] getProfile Error:', error.response?.data || error.message);
            return null;
        }
    }

    /**
     * Get Organization info
     */
    async getOrganization(accessToken, orgId) {
        try {
            const res = await axios.get(`${this.baseUrl}/organizations/${orgId}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            return res.data;
        } catch (error) {
            console.error('[LinkedIn] getOrganization Error:', error.response?.data || error.message);
            return null;
        }
    }
}

module.exports = new LinkedInService();
