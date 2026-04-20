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
        const { range, compare, pageId } = req.query;
        const data = await dashAnalytics.getDashboardSummary(
            req.user?.id, 
            range || '30d', 
            compare === 'true',
            pageId
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
        const { pageId } = req.query;
        const data = await dashAnalytics.getTopPosts(req.user?.id, limit, pageId);
        res.json({ success: true, data });
    } catch (e) {
        console.error('[Analytics Enhanced] post-performance error:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

// GET /api/v1/analytics-enhanced/sentiment
router.get('/sentiment', requireAuth, async (req, res) => {
    try {
        const { pageId } = req.query;
        const data = await dashAnalytics.getSentiment(req.user?.id, pageId);
        res.json({ success: true, data });
    } catch (e) {
        console.error('[Analytics Enhanced] sentiment error:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

// GET /api/v1/analytics-enhanced/engagement-breakdown
router.get('/engagement-breakdown', requireAuth, async (req, res) => {
    try {
        const { range, pageId } = req.query;
        const data = await dashAnalytics.getEngagementBreakdown(req.user?.id, range || '30d', pageId);
        res.json({ success: true, data });
    } catch (e) {
        console.error('[Analytics Enhanced] engagement-breakdown error:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

// GET /api/v1/analytics-enhanced/demographics
router.get('/demographics', requireAuth, async (req, res) => {
    try {
        const { pageId } = req.query;
        let pages = await dashAnalytics.getConnectedPages(req.user?.id);
        if (pageId && pageId !== 'all') pages = pages.filter(p => p.id === pageId);

        if (pages.length === 0) {
            return res.json({ success: true, data: { ageGender: {}, countries: {}, cities: {}, note: 'No pages connected' } });
        }

        const fbGraphV2 = require('../services/fb-graph-v2.service');
        // Aggregate demographics across all selected pages
        const merged = { ageGender: { male: {}, female: {}, unknown: {} }, countries: {}, cities: {} };

        for (const page of pages) {
            const demo = await fbGraphV2.getPageDemographics(page.access_token, page.id);
            // Merge age/gender
            for (const gender of ['male', 'female', 'unknown']) {
                for (const [ageRange, count] of Object.entries(demo.ageGender?.[gender] || {})) {
                    merged.ageGender[gender][ageRange] = (merged.ageGender[gender][ageRange] || 0) + count;
                }
            }
            // Merge countries
            for (const [country, count] of Object.entries(demo.countries || {})) {
                merged.countries[country] = (merged.countries[country] || 0) + count;
            }
            // Merge cities
            for (const [city, count] of Object.entries(demo.cities || {})) {
                merged.cities[city] = (merged.cities[city] || 0) + count;
            }
        }

        res.json({ success: true, data: merged });
    } catch (e) {
        console.error('[Analytics Enhanced] demographics error:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

// GET /api/v1/analytics-enhanced/growth
router.get('/growth', requireAuth, async (req, res) => {
    try {
        const { pageId, since, until } = req.query;
        let pages = await dashAnalytics.getConnectedPages(req.user?.id);
        if (pageId && pageId !== 'all') pages = pages.filter(p => p.id === pageId);

        if (pages.length === 0) {
            return res.json({ success: true, data: { dates: [], adds: [], removes: [], net: [], totalFans: [] } });
        }

        const fbGraphV2 = require('../services/fb-graph-v2.service');
        // For simplicity, return growth for the first matching page
        const page = pages[0];
        const growth = await fbGraphV2.getPageGrowth(page.access_token, page.id, since, until);

        res.json({ success: true, data: growth });
    } catch (e) {
        console.error('[Analytics Enhanced] growth error:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

// GET /api/v1/analytics-enhanced/best-time
router.get('/best-time', requireAuth, async (req, res) => {
    try {
        const { pageId } = req.query;
        let pages = await dashAnalytics.getConnectedPages(req.user?.id);
        if (pageId && pageId !== 'all') pages = pages.filter(p => p.id === pageId);

        if (pages.length === 0) {
            return res.json({ success: true, data: { heatmap: {}, bestTimes: [], totalPostsAnalyzed: 0 } });
        }

        const fbGraphV2 = require('../services/fb-graph-v2.service');
        const page = pages[0];
        const analysis = await fbGraphV2.analyzeBestPostingTimes(page.access_token, page.id);

        res.json({ success: true, data: analysis });
    } catch (e) {
        console.error('[Analytics Enhanced] best-time error:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;
