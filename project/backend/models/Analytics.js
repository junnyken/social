const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  
  platform: String,
  date: { type: Date, default: Date.now },
  
  metrics: {
    impressions: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    followers: Number,
    newFollowers: Number
  },
  
  audience: {
    demographics: {
      ageGroups: Object,
      genders: Object,
      topCountries: Array
    },
    interests: Array,
    languages: Array
  },
  
  createdAt: { type: Date, default: Date.now }
});

analyticsSchema.index({ workspaceId: 1, date: -1 });
analyticsSchema.index({ postId: 1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
