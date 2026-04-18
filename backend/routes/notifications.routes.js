const express = require('express');
const router = express.Router();
const notificationService = require('../services/notification.service');
const { requireAuth } = require('../middleware/auth.middleware');
const { getConnectedUsers } = require('../config/socket-io');

router.use(requireAuth);

// Get notifications for current user
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const notifications = await notificationService.getNotifications(req.user.id, limit);
        const unreadCount = await notificationService.getUnreadCount(req.user.id);
        res.json({ success: true, data: notifications, unreadCount });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Mark one as read
router.patch('/:id/read', async (req, res) => {
    try {
        const notif = await notificationService.markAsRead(req.params.id);
        res.json({ success: true, data: notif });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Mark all read
router.patch('/read-all', async (req, res) => {
    try {
        const count = await notificationService.markAllRead(req.user.id);
        res.json({ success: true, markedCount: count });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Get online users (presence)
router.get('/presence', async (req, res) => {
    try {
        const users = getConnectedUsers();
        res.json({ success: true, data: users, count: users.length });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;
