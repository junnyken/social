const express = require('express');
const router = express.Router();
const abtestService = require('../services/abtest.service');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

// Get all experiments
router.get('/', async (req, res) => {
    try {
        const data = await abtestService.getExperiments();
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Get experiment stats
router.get('/stats', async (req, res) => {
    try {
        const data = await abtestService.getStats();
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Get single experiment
router.get('/:id', async (req, res) => {
    try {
        const data = await abtestService.getExperiment(req.params.id);
        if (!data) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Create experiment
router.post('/', async (req, res) => {
    try {
        const data = await abtestService.createExperiment(req.body);
        res.json({ success: true, data });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
});

// Start experiment
router.post('/:id/start', async (req, res) => {
    try {
        const data = await abtestService.startExperiment(req.params.id);
        res.json({ success: true, data });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
});

// Update variant metrics
router.put('/:id/variant/:variantId/metrics', async (req, res) => {
    try {
        const data = await abtestService.updateVariantMetrics(req.params.id, req.params.variantId, req.body);
        res.json({ success: true, data });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
});

// Complete experiment (force)
router.post('/:id/complete', async (req, res) => {
    try {
        const data = await abtestService.completeExperiment(req.params.id);
        res.json({ success: true, data });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
});

// Delete experiment
router.delete('/:id', async (req, res) => {
    try {
        await abtestService.deleteExperiment(req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;
