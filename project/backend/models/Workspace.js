const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  members: [{
    userId: mongoose.Schema.Types.ObjectId,
    role: { type: String, enum: ['owner', 'admin', 'editor', 'viewer'] },
    joinedAt: { type: Date, default: Date.now }
  }],
  
  description: String,
  logo: String,
  
  // Settings
  settings: {
    defaultPostTime: String,
    timezone: String,
    language: String,
    theme: String
  },
  
  // Plan
  plan: {
    type: String,
    enum: ['free', 'pro', 'business', 'enterprise'],
    default: 'free'
  },
  
  // Limits
  limits: {
    postsPerMonth: Number,
    teamMembers: Number,
    socialAccounts: Number,
    storageGB: Number
  },
  
  // Status
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Workspace', workspaceSchema);
