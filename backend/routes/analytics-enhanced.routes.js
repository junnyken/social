/**
 * Analytics Enhanced Routes — Phase B
 * Uses DashboardAnalyticsService which tries real Facebook Graph API first,
 * gracefully falls back to demo data when no pages are connected.
 */
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const dashAnalytics = require('../services/dashboard-analytics.service');

// GET /api/v1/analytics-enhanced/dashboard-summary
router.get('/dashboard-summary', requireAuth, async (req, res) => {
    try {
        const { range, compare } = req.query;
        const data = await dashAnalytics.getDashboardSummary(
            req.user?.id, 
            range || '30d', 
            compare === 'true'
        );
        res.json({ success: true, data });
    } catch (e) {
        console.error('[Analytics Enhanced] dashboard-summary error:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

// GET /api/v1/analytics-enhanced/post-performance
router.get('/post-performance', requireAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const data = await dashAnalytics.getTopPosts(req.user?.id, limit);
        res.json({ success: true, data });
    } catch (e) {
        console.error('[Analytics Enhanced] post-performance error:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

// GET /api/v1/analytics-enhanced/sentiment
router.get('/sentiment', requireAuth, async (req, res) => {
    try {
        const data = await dashAnalytics.getSentiment(req.user?.id);
        res.json({ success: true, data });
    } catch (e) {
        console.error('[Analytics Enhanced] sentiment error:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

// GET /api/v1/analytics-enhanced/engagement-breakdown
router.get('/engagement-breakdown', requireAuth, async (req, res) => {
    try {
        const { range } = req.query;
        const data = await dashAnalytics.getEngagementBreakdown(req.user?.id, range || '30d');
        res.json({ success: true, data });
    } catch (e) {
        console.error('[Analytics Enhanced] engagement-breakdown error:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;
