const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  action: { type: String, required: true }, // e.g. 'POST_CREATED', 'MEMBER_INVITED'
  targetModel: String,
  targetId: mongoose.Schema.Types.ObjectId,
  
  details: mongoose.Schema.Types.Mixed,
  
  ipAddress: String,
  
  createdAt: { type: Date, default: Date.now, expires: '180d' } // Auto delete after 6 months
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
