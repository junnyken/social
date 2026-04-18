const express = require('express');
const router = express.Router();
const utmService = require('../services/utm.service');
const { requireAuth } = require('../middleware/auth.middleware');

// Public: Link redirect (no auth needed)
router.get('/redirect/:code', async (req, res) => {
    try {
        const link = await utmService.trackClick(req.params.code, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            referer: req.headers.referer
        });
        if (link) {
            res.redirect(302, link.utmUrl);
        } else {
            res.status(404).json({ error: true, message: 'Link not found' });
        }
    } catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});

// Protected routes
router.use(requireAuth);

// Get all links
router.get('/', async (req, res) => {
    try {
        const data = await utmService.getLinks();
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Get link analytics
router.get('/analytics', async (req, res) => {
    try {
        const data = await utmService.getAnalytics();
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Create UTM link
router.post('/', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ success: false, message: 'URL is required' });
        const data = await utmService.createLink(req.body);
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Delete link
router.delete('/:id', async (req, res) => {
    try {
        await utmService.deleteLink(req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;
