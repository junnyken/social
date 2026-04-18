const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const dataService = require('../services/data.service');
const pageInsightsService = require('../services/page-insights.service');

router.use(requireAuth);

async function getPageAccessToken(req, res, pageId) {
    const userId = req.user.id;
    const account = await dataService.getById('accounts', userId);
    if (!account) return null;
    
    const page = account.pages?.find(p => p.id === pageId);
    if (!page || !page.access_token) return null;
    
    return page.access_token;
}

// GET /api/v1/insights/:pageId/overview
router.get('/:pageId/overview', async (req, res) => {
    try {
        const { pageId } = req.params;
        const { range } = req.query; // e.g. 7, 30, 90
        
        const pageToken = await getPageAccessToken(req, res, pageId);
        if (!pageToken) {
            return res.status(403).json({ success: false, message: 'Page token not found. Connect page first.' });
        }

        const data = await pageInsightsService.getOverview(pageToken, pageId, parseInt(range) || 7);
        res.json({ success: true, data });
    } catch (e) {
        console.error('[Insights Route] overview error:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;
