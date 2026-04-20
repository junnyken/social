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
// Upload CSV and create campaigns from rows
router.post('/upload-csv', async (req, res) => {
    try {
        const { csvData } = req.body; // Array of row objects from frontend parsing
        if (!csvData || !Array.isArray(csvData) || csvData.length === 0) {
            return res.status(400).json({ success: false, message: 'No CSV data provided' });
        }

        const results = [];
        for (const row of csvData) {
            const campaign = await bulkService.createCampaign({
                name: row.name || row.title || `CSV Import ${results.length + 1}`,
                text: row.text || row.content || row.message || '',
                platforms: row.platforms ? row.platforms.split(',').map(p => p.trim()) : ['facebook'],
                scheduledAt: row.scheduledAt || row.date || null,
                imageUrl: row.imageUrl || row.image || null,
                hashtags: row.hashtags ? row.hashtags.split(',').map(h => h.trim()) : [],
                tags: ['csv-import']
            });
            results.push(campaign);
        }

        res.json({ success: true, data: results, imported: results.length });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
});

module.exports = router;
