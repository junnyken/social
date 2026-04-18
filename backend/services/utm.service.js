// ============================================================
// UTM Builder & Link Tracking Service
// Auto-generate UTM params + track click performance
// ============================================================

const dataService = require('./data.service');

class UTMService {

    async getLinks() {
        return await dataService.read('utm_links') || [];
    }

    async createLink(data) {
        const links = await this.getLinks();
        const utmParams = {
            utm_source: data.source || 'socialhub',
            utm_medium: data.medium || 'social',
            utm_campaign: data.campaign || '',
            utm_content: data.content || '',
            utm_term: data.term || ''
        };

        // Build UTM URL
        const baseUrl = data.url.split('?')[0];
        const existingParams = new URLSearchParams(data.url.split('?')[1] || '');
        Object.entries(utmParams).forEach(([k, v]) => {
            if (v) existingParams.set(k, v);
        });
        const fullUrl = `${baseUrl}?${existingParams.toString()}`;

        // Generate short code
        const shortCode = this._generateShortCode();

        const link = {
            id: require('crypto').randomUUID(),
            originalUrl: data.url,
            utmUrl: fullUrl,
            shortCode,
            shortUrl: `/l/${shortCode}`,
            utmParams,
            postId: data.postId || null,
            platform: data.platform || 'facebook',
            createdAt: new Date().toISOString(),
            clicks: 0,
            clickHistory: [],
            lastClickedAt: null
        };

        links.push(link);
        await dataService.write('utm_links', links);
        return link;
    }

    async trackClick(shortCode, metadata = {}) {
        const links = await this.getLinks();
        const link = links.find(l => l.shortCode === shortCode);
        if (!link) return null;

        link.clicks = (link.clicks || 0) + 1;
        link.lastClickedAt = new Date().toISOString();
        link.clickHistory = link.clickHistory || [];
        link.clickHistory.push({
            timestamp: new Date().toISOString(),
            ip: metadata.ip || 'unknown',
            userAgent: (metadata.userAgent || '').substring(0, 100),
            referer: metadata.referer || ''
        });

        // Keep last 500 clicks
        if (link.clickHistory.length > 500) {
            link.clickHistory = link.clickHistory.slice(-500);
        }

        await dataService.write('utm_links', links);
        return link;
    }

    async getAnalytics() {
        const links = await this.getLinks();
        const totalClicks = links.reduce((sum, l) => sum + (l.clicks || 0), 0);
        const totalLinks = links.length;

        // Clicks by campaign
        const byCampaign = {};
        links.forEach(l => {
            const campaign = l.utmParams?.utm_campaign || 'Uncategorized';
            if (!byCampaign[campaign]) byCampaign[campaign] = { clicks: 0, links: 0 };
            byCampaign[campaign].clicks += l.clicks || 0;
            byCampaign[campaign].links++;
        });

        // Clicks by platform
        const byPlatform = {};
        links.forEach(l => {
            const platform = l.platform || 'other';
            if (!byPlatform[platform]) byPlatform[platform] = 0;
            byPlatform[platform] += l.clicks || 0;
        });

        // Top performing links
        const topLinks = [...links]
            .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
            .slice(0, 10)
            .map(l => ({
                id: l.id,
                url: l.originalUrl,
                utmUrl: l.utmUrl,
                campaign: l.utmParams?.utm_campaign,
                clicks: l.clicks,
                platform: l.platform,
                createdAt: l.createdAt
            }));

        // Clicks over time (last 30 days)
        const clicksByDay = {};
        const now = Date.now();
        links.forEach(l => {
            (l.clickHistory || []).forEach(click => {
                const day = click.timestamp?.split('T')[0];
                if (day && (now - new Date(day).getTime()) < 30 * 86400000) {
                    clicksByDay[day] = (clicksByDay[day] || 0) + 1;
                }
            });
        });

        return {
            totalClicks,
            totalLinks,
            byCampaign,
            byPlatform,
            topLinks,
            clicksByDay
        };
    }

    async deleteLink(id) {
        let links = await this.getLinks();
        links = links.filter(l => l.id !== id);
        await dataService.write('utm_links', links);
    }

    _generateShortCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let code = '';
        for (let i = 0; i < 7; i++) code += chars[Math.floor(Math.random() * chars.length)];
        return code;
    }
}

module.exports = new UTMService();
