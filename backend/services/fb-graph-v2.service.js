const axios = require('axios');
const config = require('../config');

class FBGraphService {
    constructor() {
        this.version = config.fb.apiVersion || 'v19.0';
        this.baseUrl = `https://graph.facebook.com/${this.version}`;
    }

    async getPagePosts(pageToken, pageId, limit = 25, after = null) {
        const fields = 'id,message,created_time,full_picture,permalink_url,shares,reactions.summary(true),comments.summary(true)';
        const params = { access_token: pageToken, fields, limit };
        if (after) params.after = after;

        try {
            const res = await axios.get(`${this.baseUrl}/${pageId}/feed`, { params });
            return {
                posts: res.data.data,
                paging: res.data.paging || null
            };
        } catch (error) {
            console.error('[FB Graph] getPagePosts Error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.error?.message || 'Failed to fetch page posts');
        }
    }

    async getPageInsights(pageToken, pageId, metric, period = 'day') {
        try {
            const res = await axios.get(`${this.baseUrl}/${pageId}/insights`, {
                params: { metric, period, access_token: pageToken }
            });
            return res.data.data;
        } catch (error) {
            console.error('[FB Graph] getPageInsights Error:', error.response?.data || error.message);
            throw new Error('Failed to fetch page insights: ' + (error.response?.data?.error?.message || ''));
        }
    }

    async getPostInsights(pageToken, postId) {
        const metrics = 'post_impressions,post_engaged_users,post_clicks,post_reactions_by_type_total';
        try {
            const res = await axios.get(`${this.baseUrl}/${postId}/insights`, {
                params: { metric: metrics, access_token: pageToken }
            });
            return res.data.data;
        } catch (error) {
            console.error('[FB Graph] getPostInsights Error:', error.response?.data || error.message);
            throw new Error('Failed to fetch post insights');
        }
    }

    async getPostComments(pageToken, postId, limit = 50) {
        const fields = 'id,message,created_time,from{id,name,picture}';
        try {
            const res = await axios.get(`${this.baseUrl}/${postId}/comments`, {
                params: { access_token: pageToken, fields, limit, order: 'reverse_chronological' }
            });
            return res.data.data;
        } catch (error) {
            console.error('[FB Graph] getPostComments Error:', error.response?.data || error.message);
            throw new Error('Failed to fetch post comments');
        }
    }

    async replyToComment(pageToken, commentId, message) {
        try {
            const res = await axios.post(`${this.baseUrl}/${commentId}/comments`, { message }, {
                params: { access_token: pageToken }
            });
            return res.data; // { id: 'new_comment_id' }
        } catch (error) {
            console.error('[FB Graph] replyToComment Error:', error.response?.data || error.message);
            throw new Error('Failed to reply to comment');
        }
    }

    async getConversations(pageToken, pageId, limit = 50) {
        const fields = 'id,updated_time,participants,messages.limit(20){id,message,created_time,from}';
        try {
            const res = await axios.get(`${this.baseUrl}/${pageId}/conversations`, {
                params: { access_token: pageToken, fields, limit }
            });
            return res.data;
        } catch (error) {
            console.error('[FB Graph] getConversations Error:', error.response?.data || error.message);
            throw new Error('Failed to fetch conversations');
        }
    }

    async publishPagePost(pageToken, pageId, message, imageUrl = null) {
        try {
            const endpoint = imageUrl
                ? `${this.baseUrl}/${pageId}/photos`
                : `${this.baseUrl}/${pageId}/feed`;
            
            const payload = imageUrl
                ? { message, url: imageUrl, access_token: pageToken }
                : { message, access_token: pageToken };
            
            const res = await axios.post(endpoint, payload);
            return { success: true, id: res.data.id || res.data.post_id };
        } catch (error) {
            console.error('[FB Graph] publishPagePost Error:', error.response?.data || error.message);
            return { success: false, error: error.response?.data?.error?.message || 'Publish failed' };
        }
    }
}

module.exports = new FBGraphService();
