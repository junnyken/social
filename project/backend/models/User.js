const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  // Auth
  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: String,
  
  // Profile
  name: String,
  avatar: String,
  bio: String,
  
  // Verification
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  
  // OAuth
  googleId: { type: String, unique: true, sparse: true },
  facebookId: { type: String, unique: true, sparse: true },
  linkedinId: { type: String, unique: true, sparse: true },
  
  // 2FA
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: String,
  backupCodes: [String],
  
  // Security
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  
  // Workspace
  defaultWorkspace: mongoose.Schema.Types.ObjectId,
  workspaces: [{
    id: mongoose.Schema.Types.ObjectId,
    role: { type: String, enum: ['owner', 'admin', 'member'] },
    joinedAt: { type: Date, default: Date.now }
  }],
  
  // Preferences
  theme: { type: String, enum: ['light', 'dark'], default: 'light' },
  language: { type: String, default: 'en' },
  timezone: String,
  
  // Subscription
  plan: {
    type: String,
    enum: ['free', 'pro', 'business', 'enterprise'],
    default: 'free'
  },
  planExpiresAt: Date,
  stripeCustomerId: String,
  
  // Status
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: Date
});

// Index for common queries
userSchema.index({ email: 1, createdAt: -1 });
userSchema.index({ 'workspaces.id': 1 });

module.exports = mongoose.model('User', userSchema);
