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

module.exports = router;
