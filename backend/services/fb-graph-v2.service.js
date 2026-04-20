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

    // ══════════════════════════════════════════════════════════
    // ANALYTICS PRO — Demographics, Growth, Best Time
    // ══════════════════════════════════════════════════════════

    /**
     * Get Page audience demographics (age, gender, location)
     * Requires page_read_engagement permission and ≥100 fans
     */
    async getPageDemographics(pageToken, pageId) {
        const metrics = [
            'page_fans_gender_age',
            'page_fans_country',
            'page_fans_city'
        ].join(',');

        try {
            const res = await axios.get(`${this.baseUrl}/${pageId}/insights`, {
                params: { metric: metrics, period: 'lifetime', access_token: pageToken }
            });

            const raw = res.data.data || [];
            const result = { ageGender: {}, countries: {}, cities: {} };

            for (const metric of raw) {
                const values = metric.values?.[0]?.value || {};
                if (metric.name === 'page_fans_gender_age') {
                    // Transform: { "M.25-34": 150, "F.18-24": 90 } → structured
                    const genderGroups = { male: {}, female: {}, unknown: {} };
                    for (const [key, count] of Object.entries(values)) {
                        const [g, ageRange] = key.split('.');
                        const gKey = g === 'M' ? 'male' : g === 'F' ? 'female' : 'unknown';
                        genderGroups[gKey][ageRange] = (genderGroups[gKey][ageRange] || 0) + count;
                    }
                    result.ageGender = genderGroups;
                } else if (metric.name === 'page_fans_country') {
                    result.countries = values;
                } else if (metric.name === 'page_fans_city') {
                    result.cities = values;
                }
            }

            return result;
        } catch (error) {
            console.error('[FB Graph] getPageDemographics Error:', error.response?.data || error.message);
            // Return empty structure instead of throwing — page may have <100 followers
            return { ageGender: {}, countries: {}, cities: {}, error: error.response?.data?.error?.message || 'Demographics unavailable' };
        }
    }

    /**
     * Get Page follower growth (daily fan adds vs removes)
     */
    async getPageGrowth(pageToken, pageId, since = null, until = null) {
        const metrics = 'page_fan_adds_unique,page_fan_removes_unique,page_fans';
        const params = { metric: metrics, period: 'day', access_token: pageToken };
        if (since) params.since = since;
        if (until) params.until = until;

        try {
            const res = await axios.get(`${this.baseUrl}/${pageId}/insights`, { params });
            const raw = res.data.data || [];

            const growth = { dates: [], adds: [], removes: [], net: [], totalFans: [] };

            const fansData = raw.find(m => m.name === 'page_fans');
            const addsData = raw.find(m => m.name === 'page_fan_adds_unique');
            const removesData = raw.find(m => m.name === 'page_fan_removes_unique');

            const dayCount = addsData?.values?.length || fansData?.values?.length || 0;

            for (let i = 0; i < dayCount; i++) {
                const add = addsData?.values?.[i]?.value || 0;
                const remove = removesData?.values?.[i]?.value || 0;
                const fans = fansData?.values?.[i]?.value || 0;
                const dateStr = addsData?.values?.[i]?.end_time || fansData?.values?.[i]?.end_time || '';

                growth.dates.push(dateStr ? new Date(dateStr).toISOString().slice(0, 10) : '');
                growth.adds.push(add);
                growth.removes.push(remove);
                growth.net.push(add - remove);
                growth.totalFans.push(fans);
            }

            return growth;
        } catch (error) {
            console.error('[FB Graph] getPageGrowth Error:', error.response?.data || error.message);
            return { dates: [], adds: [], removes: [], net: [], totalFans: [], error: error.response?.data?.error?.message };
        }
    }

    /**
     * Analyze best posting times from historical post engagement data
     */
    async analyzeBestPostingTimes(pageToken, pageId) {
        try {
            const result = await this.getPagePosts(pageToken, pageId, 100);
            if (!result?.posts?.length) return { heatmap: {}, bestTimes: [] };

            // Build engagement heatmap: day × hour → avg engagement
            const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
            const heatmap = {};
            const counts = {};
            days.forEach(d => { heatmap[d] = new Array(24).fill(0); counts[d] = new Array(24).fill(0); });

            for (const post of result.posts) {
                const date = new Date(post.created_time);
                const day = days[date.getDay()];
                const hour = date.getHours();
                const engagement = (post.reactions?.summary?.total_count || 0)
                    + (post.comments?.summary?.total_count || 0) * 2
                    + (post.shares?.count || 0) * 3;

                heatmap[day][hour] += engagement;
                counts[day][hour]++;
            }

            // Average and normalize to 0-100
            days.forEach(d => {
                for (let h = 0; h < 24; h++) {
                    heatmap[d][h] = counts[d][h] > 0 ? Math.round(heatmap[d][h] / counts[d][h]) : 0;
                }
            });
            const maxVal = Math.max(...days.flatMap(d => heatmap[d]), 1);
            days.forEach(d => { heatmap[d] = heatmap[d].map(v => Math.round((v / maxVal) * 100)); });

            // Extract top 5 best time slots
            const slots = [];
            days.forEach((d, di) => {
                heatmap[d].forEach((v, h) => {
                    if (v > 0) slots.push({ day: d, dayIndex: di, hour: h, score: v });
                });
            });
            slots.sort((a, b) => b.score - a.score);
            const bestTimes = slots.slice(0, 5);

            return { heatmap, bestTimes, totalPostsAnalyzed: result.posts.length };
        } catch (error) {
            console.error('[FB Graph] analyzeBestPostingTimes Error:', error.response?.data || error.message);
            return { heatmap: {}, bestTimes: [], error: error.message };
        }
    }

    // ── Page Posts & Comments (for Listening) ─────────────────
    async getPagePosts(token, pageId, limit = 10) {
        try {
            const url = `${this.baseUrl}/${pageId}/posts?fields=id,message,created_time&limit=${limit}&access_token=${token}`;
            const res = await axios.get(url);
            return res.data;
        } catch (e) {
            console.error('[FB Graph] getPagePosts Error:', e.response?.data || e.message);
            return { data: [] };
        }
    }

    async getPostComments(token, postId, limit = 25) {
        try {
            const url = `${this.baseUrl}/${postId}/comments?fields=id,message,from,created_time&limit=${limit}&access_token=${token}`;
            const res = await axios.get(url);
            return res.data;
        } catch (e) {
            console.error('[FB Graph] getPostComments Error:', e.response?.data || e.message);
            return { data: [] };
        }
    }
}

module.exports = new FBGraphService();
