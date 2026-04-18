const Notification = require('../models/Notification');
const { getIO } = require('../config/socket');

class NotificationService {
  /**
   * Send notification
   */
  static async sendNotification(userId, notification) {
    try {
      // Save to database
      const doc = new Notification({
        userId,
        ...notification
      });

      await doc.save();

      // Send via Socket.IO
      const io = getIO();
      io.to(`user:${userId}`).emit('notification:received', {
        id: doc._id,
        ...notification
      });

      // Send via email (optional)
      if (notification.type === 'mention') {
        await this.sendEmailNotification(userId, notification);
      }

      return doc;

    } catch (error) {
      console.error('Notification error:', error);
    }
  }

  /**
   * Send notification to multiple users
   */
  static async broadcastNotification(userIds, notification) {
    return Promise.all(
      userIds.map(userId => this.sendNotification(userId, notification))
    );
  }

  /**
   * Mark as read
   */
  static async markAsRead(notificationId) {
    return Notification.findByIdAndUpdate(
      notificationId,
      { read: true, readAt: new Date() },
      { new: true }
    );
  }

  /**
   * Mark all as read
   */
  static async markAllAsRead(userId) {
    return Notification.updateMany(
      { userId, read: false },
      { read: true, readAt: new Date() }
    );
  }

  /**
   * Get unread count
   */
  static async getUnreadCount(userId) {
    return Notification.countDocuments({ userId, read: false });
  }

  /**
   * Send email notification
   */
  static async sendEmailNotification(userId, notification) {
    // Implementation using nodemailer
    console.log('📧 Email notification:', notification);
  }
}

module.exports = NotificationService;
