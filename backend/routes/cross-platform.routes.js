const express = require('express');
const router = express.Router();
const dataService = require('../services/data.service');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

// Cross-platform summary
router.get('/summary', async (req, res) => {
    try {
        const logs = await dataService.getAll('logs') || [];
        const campaigns = await dataService.read('bulk_campaigns') || [];
        const experiments = await dataService.read('ab_experiments') || [];

        // Aggregate by platform
        const platformStats = {};
        const supportedPlatforms = ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube'];
        
        supportedPlatforms.forEach(p => {
            const pLogs = logs.filter(l => (l.platform || 'facebook') === p);
            const totalEngagement = pLogs.reduce((s, l) => s + (l.likes || 0) + (l.comments || 0) + (l.shares || 0), 0);
            platformStats[p] = {
                posts: pLogs.length,
                totalEngagement,
                avgEngagement: pLogs.length > 0 ? Math.round(totalEngagement / pLogs.length) : 0,
                totalReach: pLogs.reduce((s, l) => s + (l.reach || 0), 0),
                followers: pLogs.length > 0 ? (pLogs[pLogs.length - 1].followers || 0) : 0,
                connected: pLogs.length > 0
            };
        });

        // Growth trend (last 30 days)
        const now = Date.now();
        const thirtyDaysAgo = now - 30 * 86400000;
        const recentLogs = logs.filter(l => l.createdAt && new Date(l.createdAt).getTime() > thirtyDaysAgo);
        
        const dailyPosts = {};
        recentLogs.forEach(l => {
            const day = l.createdAt?.split('T')[0];
            if (day) dailyPosts[day] = (dailyPosts[day] || 0) + 1;
        });

        // Best performing platform
        const bestPlatform = Object.entries(platformStats)
            .filter(([, s]) => s.posts > 0)
            .sort((a, b) => b[1].avgEngagement - a[1].avgEngagement)[0];

        res.json({
            success: true,
            data: {
                platformStats,
                totalPosts: logs.length,
                totalCampaigns: campaigns.length,
                totalExperiments: experiments.length,
                bestPlatform: bestPlatform ? { name: bestPlatform[0], ...bestPlatform[1] } : null,
                dailyPosts,
                connectedPlatforms: Object.entries(platformStats).filter(([, s]) => s.connected).map(([p]) => p)
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Platform comparison (head-to-head)
router.get('/compare', async (req, res) => {
    try {
        const logs = await dataService.getAll('logs') || [];
        const platforms = (req.query.platforms || 'facebook,instagram').split(',');

        const comparison = {};
        platforms.forEach(p => {
            const pLogs = logs.filter(l => (l.platform || 'facebook') === p);
            const last30 = pLogs.filter(l => l.createdAt && (Date.now() - new Date(l.createdAt).getTime()) < 30 * 86400000);

            comparison[p] = {
                totalPosts: pLogs.length,
                recentPosts: last30.length,
                avgLikes: last30.length > 0 ? Math.round(last30.reduce((s, l) => s + (l.likes || 0), 0) / last30.length) : 0,
                avgComments: last30.length > 0 ? Math.round(last30.reduce((s, l) => s + (l.comments || 0), 0) / last30.length) : 0,
                avgShares: last30.length > 0 ? Math.round(last30.reduce((s, l) => s + (l.shares || 0), 0) / last30.length) : 0,
                avgReach: last30.length > 0 ? Math.round(last30.reduce((s, l) => s + (l.reach || 0), 0) / last30.length) : 0,
                growthRate: 0, // would calculate from historical data
                topPostType: 'image' // would calculate from data
            };
        });

        res.json({ success: true, data: comparison });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;
