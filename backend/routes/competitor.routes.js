const express = require('express');
const router = express.Router();
const competitorService = require('../services/competitor.service');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

// Get all competitors
router.get('/', async (req, res) => {
    try {
        const data = await competitorService.getCompetitors();
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Get benchmark comparison
router.get('/benchmark', async (req, res) => {
    try {
        const myMetrics = {
            followers: parseInt(req.query.followers) || 1000,
            engagementRate: parseFloat(req.query.er) || 3.5,
            avgLikes: parseInt(req.query.likes) || 50,
            avgComments: parseInt(req.query.comments) || 10,
            avgShares: parseInt(req.query.shares) || 5,
            postingFrequency: parseInt(req.query.freq) || 5
        };
        const data = await competitorService.getBenchmark(myMetrics);
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Add competitor
router.post('/', async (req, res) => {
    try {
        const data = await competitorService.addCompetitor(req.body);
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Update competitor
router.put('/:id', async (req, res) => {
    try {
        const data = await competitorService.updateCompetitor(req.params.id, req.body);
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Remove competitor
router.delete('/:id', async (req, res) => {
    try {
        await competitorService.removeCompetitor(req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;
