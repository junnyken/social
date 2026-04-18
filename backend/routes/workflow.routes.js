const express = require('express');
const router = express.Router();
const dataService = require('../services/data.service');
const notificationService = require('../services/notification.service');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

const TRANSITIONS = {
  draft:     ['review'],
  review:    ['approved', 'rejected'],
  approved:  ['published', 'draft'],
  rejected:  ['draft'],
  published: []
};

// Get all workflows
router.get('/', async (req, res) => {
    try {
        const workflows = await dataService.getAll('workflows');
        // If empty, initialize an empty array or send it
        res.json({ success: true, data: workflows || [] });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Create new post in workflow
router.post('/', async (req, res) => {
    try {
        const payload = {
            id: req.body.id, // optional explicit ID from client
            state: 'draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdById: req.user.id,
            createdByName: req.user.name || 'User',
            reviewedById: null,
            reviewedByName: null,
            reviewedAt: null,
            rejectionReason: null,
            publishedAt: null,
            scheduledAt: req.body.scheduledAt || null,
            platforms: req.body.platforms || [],
            content: req.body.content || '',
            media: req.body.media || [],
            comments: []
        };
        const newWf = await dataService.create('workflows', payload);
        res.json({ success: true, data: newWf });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Transition State
router.patch('/:id', async (req, res) => {
    try {
        const { action, reason } = req.body; // submit, approve, reject, publish, revert
        const id = req.params.id;
        const workflow = await dataService.getById('workflows', id);
        
        if (!workflow) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        let newState;
        if (action === 'submit') newState = 'review';
        else if (action === 'approve') newState = 'approved';
        else if (action === 'reject') newState = 'rejected';
        else if (action === 'publish') newState = 'published';
        else if (action === 'revert') newState = 'draft';
        else return res.status(400).json({ success: false, message: 'Invalid action' });

        if (!TRANSITIONS[workflow.state]?.includes(newState)) {
            return res.status(400).json({ success: false, message: `Cannot transition from ${workflow.state} to ${newState}` });
        }

        const updates = {
            state: newState,
            updatedAt: new Date().toISOString()
        };

        if (['review', 'approved', 'rejected'].includes(newState)) {
            updates.reviewedAt = new Date().toISOString();
            updates.reviewedById = req.user.id;
            updates.reviewedByName = req.user.name || 'User';
        }

        if (newState === 'rejected' && reason) {
            updates.rejectionReason = reason;
        }

        if (newState === 'published') {
            updates.publishedAt = new Date().toISOString();
        }

        const updated = await dataService.update('workflows', id, updates);

        // ── Send real-time notifications ──────────────────────
        const actorName = req.user.name || 'User';
        try {
            if (newState === 'review') {
                await notificationService.notifyPostSubmitted(updated, actorName);
            } else if (newState === 'approved') {
                await notificationService.notifyPostApproved(updated, actorName, workflow.createdById);
            } else if (newState === 'rejected') {
                await notificationService.notifyPostRejected(updated, actorName, workflow.createdById, reason);
            } else if (newState === 'published') {
                await notificationService.notifyPostPublished(updated, actorName);
            }
        } catch (notifErr) {
            console.error('[Workflow] Notification error:', notifErr.message);
        }

        res.json({ success: true, data: updated });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Add comment
router.post('/:id/comments', async (req, res) => {
    try {
        const { text } = req.body;
        const id = req.params.id;
        const workflow = await dataService.getById('workflows', id);
        if (!workflow) return res.status(404).json({ success: false, message: 'Not found' });

        const comment = {
            id: require('crypto').randomUUID(),
            postId: id,
            authorId: req.user.id,
            authorName: req.user.name || 'User',
            text: text,
            createdAt: new Date().toISOString()
        };

        const comments = workflow.comments || [];
        comments.push(comment);

        const updated = await dataService.update('workflows', id, { comments });

        // Notify post author about comment
        try {
            if (workflow.createdById !== req.user.id) {
                await notificationService.notifyComment(workflow, text, req.user.name || 'User', workflow.createdById);
            }
        } catch (notifErr) {}

        res.json({ success: true, data: comment });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Delete
router.delete('/:id', async (req, res) => {
    try {
        await dataService.remove('workflows', req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;
