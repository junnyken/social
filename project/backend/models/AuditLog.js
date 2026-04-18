const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'PASSWORD_RESET', 'ACCOUNT_CREATED', 'EMAIL_VERIFIED', 'MFA_ENABLED', 'ROLE_CHANGED']
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '90d' // Automatically delete logs older than 90 days
  }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
