const express = require('express');
const router = express.Router();
const bulkService = require('../services/bulk-publish.service');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

// Get all campaigns
router.get('/', async (req, res) => {
    try {
        const data = await bulkService.getCampaigns();
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Get stats
router.get('/stats', async (req, res) => {
    try {
        const data = await bulkService.getStats();
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Get single campaign
router.get('/:id', async (req, res) => {
    try {
        const data = await bulkService.getCampaign(req.params.id);
        if (!data) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Create campaign
router.post('/', async (req, res) => {
    try {
        const data = await bulkService.createCampaign(req.body);
        res.json({ success: true, data });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
});

// Update campaign
router.put('/:id', async (req, res) => {
    try {
        const data = await bulkService.updateCampaign(req.params.id, req.body);
        res.json({ success: true, data });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
});

// Publish campaign now
router.post('/:id/publish', async (req, res) => {
    try {
        const data = await bulkService.publishCampaign(req.params.id);
        res.json({ success: true, data });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
});

// Delete campaign
router.delete('/:id', async (req, res) => {
    try {
        await bulkService.deleteCampaign(req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;
