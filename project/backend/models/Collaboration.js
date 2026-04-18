const mongoose = require('mongoose');

const collaborationSchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  
  activeUsers: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    socketId: String,
    lastSeen: Date,
    cursorPosition: { line: Number, ch: Number }
  }],
  
  version: { type: Number, default: 0 },
  
  history: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    operation: mongoose.Schema.Types.Mixed, // Storing OT operations
    timestamp: { type: Date, default: Date.now },
    versionIndex: Number
  }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Collaboration', collaborationSchema);
