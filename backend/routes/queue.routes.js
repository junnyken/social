const express = require('express');
const router = express.Router();
const dataService = require('../services/data.service');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

// Get all queued/scheduled posts for active user
router.get('/', async (req, res) => {
    const schedules = await dataService.getAll('schedules');
    // Filter by current user session
    const userQueue = schedules.filter(s => s.accountId === req.user.id);
    // Sort ascending by scheduleTime
    userQueue.sort((a,b) => (a.scheduledTime || 0) - (b.scheduledTime || 0));
    
    res.json({ success: true, data: userQueue });
});

// Add to queue
router.post('/', async (req, res) => {
    const { accountId, target, content, images, scheduledAt } = req.body;
    
    // Validate current user
    if (accountId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized for this accountId' });
    }

    const payload = { 
        accountId,
        target: target || { type: 'page', id: 'unknown', name: 'Unknown' },
        content,
        images: images || [],
        scheduledAt: scheduledAt || new Date().toISOString(),
        status: 'pending',
        retries: 0,
        maxRetries: 3,
        processedAt: null,
        error: null 
    };

    const newJob = await dataService.create('schedules', payload);
    res.json({ success: true, data: newJob });
});

// Get stats
router.get('/stats', async (req, res) => {
    const schedules = await dataService.getAll('schedules');
    const userQueue = schedules.filter(s => s.accountId === req.user.id);
    
    let pending = 0, processing = 0, done = 0, failed = 0;
    userQueue.forEach(s => {
        if (s.status === 'pending') pending++;
        else if (s.status === 'processing') processing++;
        else if (s.status === 'done') done++;
        else if (s.status === 'failed') failed++;
    });

    const pendingQueue = userQueue.filter(s => s.status === 'pending').sort((a,b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
    const nextPostIn = pendingQueue.length > 0 ? Math.round((new Date(pendingQueue[0].scheduledAt) - new Date()) / 60000) : null;

    res.json({ success: true, data: { total: userQueue.length, pending, processing, done, failed, nextPostIn } });
});

// Update queued post (reschedule)
router.patch('/:id', async (req, res) => {
    const job = await dataService.getById('schedules', req.params.id);
    
    if (!job || job.accountId !== req.user.id) {
        return res.status(404).json({ success: false, message: 'Queue item not found or unauthorized' });
    }

    const allowedUpdates = ['scheduledAt', 'content', 'status', 'images'];
    const updates = {};
    for (const key of allowedUpdates) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const updatedJob = await dataService.update('schedules', req.params.id, updates);
    res.json({ success: true, data: updatedJob });
});

// Cancel/Delete queued post
router.delete('/:id', async (req, res) => {
    const job = await dataService.getById('schedules', req.params.id);
    
    if (!job || job.accountId !== req.user.id) {
        return res.status(404).json({ success: false, message: 'Queue item not found or unauthorized' });
    }

    await dataService.remove('schedules', req.params.id);
    res.json({ success: true, message: 'Schedule removed' });
});

module.exports = router;
