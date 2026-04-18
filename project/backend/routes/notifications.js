const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const NotificationService = require('../services/notification');
const { verifyToken } = require('../middleware');

// Get notifications
router.get('/', verifyToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));

    const total = await Notification.countDocuments({ userId: req.user.id });
    const unread = await Notification.countDocuments({
      userId: req.user.id,
      read: false
    });

    res.json({ notifications, total, unread });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark as read
router.patch('/:id/read', verifyToken, async (req, res) => {
  try {
    const notification = await NotificationService.markAsRead(req.params.id);
    res.json(notification);

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Mark all as read
router.patch('/read/all', verifyToken, async (req, res) => {
  try {
    await NotificationService.markAllAsRead(req.user.id);
    res.json({ message: 'All marked as read' });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
