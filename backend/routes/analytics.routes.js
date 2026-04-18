const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analytics.service');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

router.get('/overview', async (req, res) => {
    try {
        const range = req.query.range || '30d';
        const stats = await analyticsService.getOverviewStats(range.replace('d', ''));
        res.json({ success: true, data: stats });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/trends', async (req, res) => {
    try {
        const range = req.query.range || '30d';
        const trends = await analyticsService.getPostingTrends(range.replace('d', ''));
        res.json({ success: true, data: trends });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/failures', async (req, res) => {
    try {
        const range = req.query.range || '30d';
        const failures = await analyticsService.getFailuresAnalysis(range.replace('d', ''));
        res.json({ success: true, data: failures });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/export', async (req, res) => {
    try {
        const range = req.query.range || '30d';
        const csv = await analyticsService.exportCSV(range.replace('d', ''));
        res.header('Content-Type', 'text/csv');
        res.attachment(`analytics_export_${range}.csv`);
        res.send(csv);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ── X3: Content Performance Heatmap ────────────────────────────
router.get('/heatmap', async (req, res) => {
    try {
        const dataService = require('../services/data.service');
        const logs = await dataService.getAll('logs') || [];
        
        // Build engagement heatmap from post history
        const heatmap = {};
        const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
        days.forEach(d => { heatmap[d] = new Array(24).fill(0); });
        const counts = {};
        days.forEach(d => { counts[d] = new Array(24).fill(0); });

        logs.forEach(log => {
            if (!log.createdAt) return;
            const date = new Date(log.createdAt);
            const day = days[date.getDay()];
            const hour = date.getHours();
            const engagement = (log.likes || 0) + (log.comments || 0) * 2 + (log.shares || 0) * 3;
            heatmap[day][hour] += engagement;
            counts[day][hour]++;
        });

        // Average out
        days.forEach(d => {
            for (let h = 0; h < 24; h++) {
                heatmap[d][h] = counts[d][h] > 0 ? Math.round(heatmap[d][h] / counts[d][h]) : 0;
            }
        });

        // Normalize to 0-100
        const maxVal = Math.max(...days.flatMap(d => heatmap[d]), 1);
        days.forEach(d => {
            heatmap[d] = heatmap[d].map(v => Math.round((v / maxVal) * 100));
        });

        res.json({ success: true, data: { heatmap, totalPosts: logs.length } });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ── X3: Top Performing Posts ───────────────────────────────────
router.get('/top-posts', async (req, res) => {
    try {
        const dataService = require('../services/data.service');
        const logs = await dataService.getAll('logs') || [];
        const limit = parseInt(req.query.limit) || 10;

        const scored = logs
            .map(log => ({
                id: log.id,
                content: (log.content || log.message || '').substring(0, 120),
                platform: log.platform || 'facebook',
                createdAt: log.createdAt,
                likes: log.likes || 0,
                comments: log.comments || 0,
                shares: log.shares || 0,
                reach: log.reach || 0,
                engagement: (log.likes || 0) + (log.comments || 0) * 2 + (log.shares || 0) * 3,
                type: log.mediaType || (log.imageUrl ? 'image' : 'text')
            }))
            .sort((a, b) => b.engagement - a.engagement)
            .slice(0, limit);

        res.json({ success: true, data: scored });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ── X3: Content Type Analysis ─────────────────────────────────
router.get('/content-types', async (req, res) => {
    try {
        const dataService = require('../services/data.service');
        const logs = await dataService.getAll('logs') || [];

        const types = { text: { count: 0, engagement: 0 }, image: { count: 0, engagement: 0 }, video: { count: 0, engagement: 0 }, link: { count: 0, engagement: 0 } };

        logs.forEach(log => {
            const type = log.mediaType || (log.imageUrl ? 'image' : log.videoUrl ? 'video' : log.link ? 'link' : 'text');
            if (!types[type]) types[type] = { count: 0, engagement: 0 };
            types[type].count++;
            types[type].engagement += (log.likes || 0) + (log.comments || 0) * 2 + (log.shares || 0) * 3;
        });

        // Calculate avg engagement per type
        const result = Object.entries(types).map(([type, data]) => ({
            type,
            count: data.count,
            totalEngagement: data.engagement,
            avgEngagement: data.count > 0 ? Math.round(data.engagement / data.count) : 0,
            percentage: logs.length > 0 ? Math.round((data.count / logs.length) * 100) : 0
        })).sort((a, b) => b.avgEngagement - a.avgEngagement);

        res.json({ success: true, data: result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;
