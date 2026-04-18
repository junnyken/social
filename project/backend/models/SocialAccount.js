const mongoose = require('mongoose');

const socialAccountSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  
  platform: {
    type: String,
    enum: ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok'],
    required: true
  },
  
  accountId: String,  // Platform account ID
  handle: String,
  displayName: String,
  profilePicture: String,
  bio: String,
  
  // Tokens
  accessToken: String,
  refreshToken: String,
  tokenExpiresAt: Date,
  
  // Metrics
  followers: Number,
  following: Number,
  postsCount: Number,
  
  // Permissions
  permissions: [String],
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'error'],
    default: 'active'
  },
  
  // Error tracking
  lastError: String,
  errorCount: { type: Number, default: 0 },
  
  timestamps: {
    connectedAt: { type: Date, default: Date.now },
    lastSync: Date,
    lastPostPublished: Date
  }
});

module.exports = mongoose.model('SocialAccount', socialAccountSchema);
