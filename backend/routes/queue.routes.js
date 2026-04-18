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
