const socket = require('../config/socket');
const Presence = require('../models/Collaboration'); // Store or Redis is better for real-world

class PresenceService {
  /**
   * Update a user's cursor position and presence in a document
   */
  static async updatePresence(documentId, userId, cursorPosition, socketId) {
    const io = socket.getIO();
    
    // Broadcast to everyone else in this document room
    io.to(`doc_${documentId}`).emit('presence_update', {
      userId,
      cursorPosition,
      timestamp: new Date()
    });
  }

  /**
   * Handle user leaving
   */
  static async removePresence(documentId, userId) {
    const io = socket.getIO();
    
    io.to(`doc_${documentId}`).emit('user_left', {
      userId,
      timestamp: new Date()
    });
  }
}

module.exports = PresenceService;
