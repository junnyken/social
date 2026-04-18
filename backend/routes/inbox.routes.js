const express = require('express');
const router = express.Router();
const inboxService = require('../services/inbox.service');
const dataService = require('../services/data.service');
const cryptoService = require('../services/crypto.service');

// Sync Inbox
router.post('/sync', async (req, res) => {
    try {
        const sessionId = req.cookies.fbsession;
        if (!sessionId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const account = await dataService.getById('accounts', sessionId);
        if (!account || !account.pages || account.pages.length === 0) {
            return res.status(400).json({ success: false, message: 'No connected pages' });
        }

        const pageToken = account.pages[0].access_token;
        const pageId = account.pages[0].id;

        // Sync both comments and DMs
        await inboxService.syncFacebookComments(pageToken, pageId);
        await inboxService.syncMessengerConversations(pageToken, pageId);

        res.json({ success: true, message: 'Sync complete' });
    } catch (error) {
        console.error('[Inbox Routes] Sync error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get Messages
router.get('/messages', async (req, res) => {
    try {
        const filters = {
            platform: req.query.platform,
            status: req.query.status
        };
        const messages = await inboxService.getAllMessages(filters);
        res.json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get single message
router.get('/messages/:id', async (req, res) => {
    try {
        const msg = await inboxService.getMessageById(req.params.id);
        if (!msg) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: msg });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update message
router.patch('/messages/:id', async (req, res) => {
    try {
        const msg = await inboxService.updateMessage(req.params.id, req.body);
        if (!msg) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: msg });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get Thread
router.get('/thread/:contactId', async (req, res) => {
    try {
        const thread = await inboxService.getConversationThread(req.params.contactId);
        res.json({ success: true, data: thread });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get Stats
router.get('/stats', async (req, res) => {
    try {
        const stats = await inboxService.getInboxStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
