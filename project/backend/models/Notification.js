const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  type: {
    type: String,
    enum: [
      'comment_added',
      'comment_replied',
      'post_published',
      'post_approved',
      'mention',
      'collaboration_invite',
      'team_member_joined',
      'comment_resolved'
    ],
    required: true
  },

  title: String,
  message: String,

  data: {
    documentId: mongoose.Schema.Types.ObjectId,
    userId: mongoose.Schema.Types.ObjectId,
    userName: String,
    actionUrl: String
  },

  read: {
    type: Boolean,
    default: false,
    index: true
  },

  readAt: Date,

  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
