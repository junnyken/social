const express = require('express');
const router = express.Router();
const evergreenService = require('../services/evergreen.service');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

// Get all queues
router.get('/', async (req, res) => {
    try {
        const data = await evergreenService.getQueues();
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Stats
router.get('/stats', async (req, res) => {
    try {
        const data = await evergreenService.getStats();
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// AI Suggest top posts for evergreen
router.get('/suggest', async (req, res) => {
    try {
        const minER = parseFloat(req.query.minER) || 3;
        const limit = parseInt(req.query.limit) || 10;
        const data = await evergreenService.suggestEvergreenPosts(minER, limit);
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Get single queue
router.get('/:id', async (req, res) => {
    try {
        const data = await evergreenService.getQueue(req.params.id);
        if (!data) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Get next-up posts
router.get('/:id/next', async (req, res) => {
    try {
        const data = await evergreenService.getNextUp(req.params.id, parseInt(req.query.count) || 5);
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Create queue
router.post('/', async (req, res) => {
    try {
        const data = await evergreenService.createQueue(req.body);
        res.json({ success: true, data });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

// Add post to queue
router.post('/:id/posts', async (req, res) => {
    try {
        const data = await evergreenService.addPost(req.params.id, req.body);
        res.json({ success: true, data });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

// Recycle a post now
router.post('/:id/posts/:postId/recycle', async (req, res) => {
    try {
        const data = await evergreenService.recyclePost(req.params.id, req.params.postId);
        res.json({ success: true, data });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

// Remove post from queue
router.delete('/:id/posts/:postId', async (req, res) => {
    try {
        await evergreenService.removePost(req.params.id, req.params.postId);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Toggle queue active/paused
router.post('/:id/toggle', async (req, res) => {
    try {
        const data = await evergreenService.toggleQueue(req.params.id);
        res.json({ success: true, data });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

// Delete queue
router.delete('/:id', async (req, res) => {
    try {
        await evergreenService.deleteQueue(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
