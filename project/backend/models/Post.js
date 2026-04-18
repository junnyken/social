const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  // Ownership
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  
  // Content
  text: { type: String, required: true },
  mediaUrls: [String],
  mediaType: { type: String, enum: ['image', 'video', 'carousel', 'text'] },
  
  // Distribution
  platforms: [{
    platform: { type: String, enum: ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok'] },
    accountId: mongoose.Schema.Types.ObjectId,
    accountHandle: String,
    nativePostId: String,
    publishedAt: Date,
    status: { type: String, enum: ['pending', 'published', 'failed'] }
  }],
  
  // Scheduling
  scheduledAt: Date,
  publishedAt: Date,
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'published', 'failed'],
    default: 'draft',
    index: true
  },
  
  // Optimization
  hashtags: [String],
  mentions: [String],
  emojis: [String],
  contentScore: Number,
  optimizationNotes: [String],
  
  // Analytics
  metrics: {
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    engagementRate: Number,
    sentiment: String
  },
  
  // AI Data
  ai: {
    optimizationScore: Number,
    predictedPerformance: Number,
    suggestedBestTime: Date,
    keywordSuggestions: [String],
    hashtagsSuggestions: [String],
    sentiment: String
  },
  
  // Metadata
  tags: [String],
  campaign: String,
  linkedPosts: [mongoose.Schema.Types.ObjectId],
  
  // Timestamps
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: Date
});

postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ workspaceId: 1, status: 1 });
postSchema.index({ scheduledAt: 1, status: 1 });

module.exports = mongoose.model('Post', postSchema);
