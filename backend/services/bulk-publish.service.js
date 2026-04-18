// ============================================================
// Bulk Publisher Service
// Publish to multiple platforms simultaneously with scheduling
// ============================================================

const dataService = require('./data.service');
const crypto = require('crypto');

class BulkPublishService {

    async getCampaigns() {
        return await dataService.read('bulk_campaigns') || [];
    }

    async getCampaign(id) {
        const campaigns = await this.getCampaigns();
        return campaigns.find(c => c.id === id) || null;
    }

    async createCampaign(data) {
        const campaigns = await this.getCampaigns();

        const campaign = {
            id: crypto.randomUUID(),
            name: data.name || `Campaign ${campaigns.length + 1}`,
            description: data.description || '',
            status: 'draft', // draft → scheduled → publishing → completed → failed
            platforms: data.platforms || ['facebook'],
            content: {
                text: data.text || '',
                imageUrl: data.imageUrl || null,
                videoUrl: data.videoUrl || null,
                link: data.link || null,
                hashtags: data.hashtags || [],
                cta: data.cta || ''
            },
            // Per-platform overrides
            platformOverrides: data.platformOverrides || {},
            // Scheduling
            scheduledAt: data.scheduledAt || null,
            timezone: data.timezone || 'Asia/Ho_Chi_Minh',
            // Publishing results
            results: [],
            // Metadata
            createdAt: new Date().toISOString(),
            publishedAt: null,
            completedAt: null,
            tags: data.tags || [],
            utmCampaign: data.utmCampaign || ''
        };

        campaigns.push(campaign);
        await dataService.write('bulk_campaigns', campaigns);
        return campaign;
    }

    async updateCampaign(id, updates) {
        const campaigns = await this.getCampaigns();
        const idx = campaigns.findIndex(c => c.id === id);
        if (idx === -1) throw new Error('Campaign not found');

        Object.assign(campaigns[idx], updates, { updatedAt: new Date().toISOString() });
        await dataService.write('bulk_campaigns', campaigns);
        return campaigns[idx];
    }

    async publishCampaign(id) {
        const campaigns = await this.getCampaigns();
        const idx = campaigns.findIndex(c => c.id === id);
        if (idx === -1) throw new Error('Campaign not found');

        const campaign = campaigns[idx];
        campaign.status = 'publishing';
        campaign.publishedAt = new Date().toISOString();
        campaign.results = [];

        // Simulate publishing to each platform
        for (const platform of campaign.platforms) {
            const override = campaign.platformOverrides[platform] || {};
            const content = {
                text: override.text || campaign.content.text,
                imageUrl: override.imageUrl || campaign.content.imageUrl,
                hashtags: override.hashtags || campaign.content.hashtags
            };

            try {
                // In production: call actual platform API
                // For now: simulate success with postId
                const postId = `${platform}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

                campaign.results.push({
                    platform,
                    status: 'success',
                    postId,
                    publishedAt: new Date().toISOString(),
                    url: this._generatePostUrl(platform, postId),
                    content: content.text.substring(0, 100)
                });
            } catch (err) {
                campaign.results.push({
                    platform,
                    status: 'failed',
                    error: err.message,
                    publishedAt: new Date().toISOString()
                });
            }
        }

        const allSuccess = campaign.results.every(r => r.status === 'success');
        const anySuccess = campaign.results.some(r => r.status === 'success');
        campaign.status = allSuccess ? 'completed' : (anySuccess ? 'partial' : 'failed');
        campaign.completedAt = new Date().toISOString();

        await dataService.write('bulk_campaigns', campaigns);
        return campaign;
    }

    async deleteCampaign(id) {
        let campaigns = await this.getCampaigns();
        campaigns = campaigns.filter(c => c.id !== id);
        await dataService.write('bulk_campaigns', campaigns);
    }

    async getStats() {
        const campaigns = await this.getCampaigns();
        const platformCounts = {};
        campaigns.forEach(c => {
            c.platforms.forEach(p => {
                platformCounts[p] = (platformCounts[p] || 0) + 1;
            });
        });

        return {
            total: campaigns.length,
            published: campaigns.filter(c => ['completed', 'partial'].includes(c.status)).length,
            scheduled: campaigns.filter(c => c.status === 'scheduled').length,
            draft: campaigns.filter(c => c.status === 'draft').length,
            failed: campaigns.filter(c => c.status === 'failed').length,
            platformCounts,
            totalPosts: campaigns.reduce((s, c) => s + c.results.filter(r => r.status === 'success').length, 0),
            recentCampaigns: campaigns.slice(-5).reverse()
        };
    }

    _generatePostUrl(platform, postId) {
        const urls = {
            facebook: `https://facebook.com/posts/${postId}`,
            instagram: `https://instagram.com/p/${postId}`,
            twitter: `https://twitter.com/status/${postId}`,
            linkedin: `https://linkedin.com/feed/update/${postId}`,
            tiktok: `https://tiktok.com/@user/video/${postId}`,
            youtube: `https://youtube.com/shorts/${postId}`
        };
        return urls[platform] || `#${postId}`;
    }
}

module.exports = new BulkPublishService();
