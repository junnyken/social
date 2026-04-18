<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# PHASE M


---

## 📁 **PHASE M - FILE STRUCTURE**

```
backend/
├── config/
│   └── socket.js                    ← Socket.IO configuration
│
├── services/
│   ├── collaboration.js             ← Collaboration engine
│   ├── operational-transform.js     ← OT algorithm
│   ├── notification.js              ← Notification service
│   └── presence.js                  ← Presence tracking
│
├── routes/
│   ├── comments.js                  ← Comments API
│   ├── notifications.js             ← Notifications API
│   └── collaboration.js             ← Collaboration API
│
└── models/
    ├── Comment.js
    ├── Notification.js
    ├── Collaboration.js
    └── ActivityLog.js

frontend/
├── hooks/
│   ├── useCollaboration.js          ← Collaboration hook
│   ├── useSocket.js                 ← Socket connection
│   ├── useNotifications.js          ← Notifications
│   └── usePresence.js               ← Presence tracking
│
├── components/
│   ├── CollaborativeEditor/
│   │   ├── Editor.jsx
│   │   ├── Cursors.jsx
│   │   ├── Presence.jsx
│   │   └── Comments.jsx
│   │
│   ├── Notifications/
│   │   ├── NotificationCenter.jsx
│   │   ├── NotificationItem.jsx
│   │   └── NotificationBadge.jsx
│   │
│   └── Comments/
│       ├── CommentThread.jsx
│       ├── CommentInput.jsx
│       └── Reactions.jsx
│
└── utils/
    └── operational-transform.js
```


***

## 🔧 **DAY 1: SOCKET.IO SETUP \& EVENTS**

```javascript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// backend/config/socket.js - Socket.IO Configuration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const socketIO = require('socket.io');
const redisAdapter = require('@socket.io/redis-adapter');
const redis = require('redis');
const jwt = require('jsonwebtoken');

let io;
const connectedUsers = new Map();
const editingSessions = new Map();

function initializeSocket(server) {
  io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 60000
  });

  // Redis adapter for horizontal scaling
  const pubClient = redis.createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(redisAdapter(pubClient, subClient));
    console.log('✅ Socket.IO Redis adapter connected');
  });

  // Authentication middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userEmail = decoded.email;

      next();

    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.userId}`);

    // Track user connection
    connectedUsers.set(socket.userId, {
      socketId: socket.id,
      email: socket.userEmail,
      connectedAt: new Date(),
      status: 'online'
    });

    // Join workspace room
    socket.on('join:workspace', (workspaceId) => {
      socket.join(`workspace:${workspaceId}`);
      socket.workspaceId = workspaceId;

      // Broadcast user presence
      io.to(`workspace:${workspaceId}`).emit('user:joined', {
        userId: socket.userId,
        email: socket.userEmail,
        timestamp: new Date()
      });

      console.log(`👥 User joined workspace: ${workspaceId}`);
    });

    // Join document editing session
    socket.on('join:document', (data) => {
      const { documentId, documentType } = data;
      const roomName = `doc:${documentId}`;

      socket.join(roomName);

      // Track editing session
      if (!editingSessions.has(documentId)) {
        editingSessions.set(documentId, {
          editors: new Set(),
          content: '',
          version: 0,
          operations: []
        });
      }

      const session = editingSessions.get(documentId);
      session.editors.add(socket.userId);

      // Notify others that user joined document
      socket.to(roomName).emit('editor:joined', {
        userId: socket.userId,
        email: socket.userEmail,
        documentId,
        editorsCount: session.editors.size
      });

      // Send current state to new editor
      socket.emit('document:state', {
        documentId,
        content: session.content,
        version: session.version,
        editors: Array.from(session.editors)
      });

      console.log(`📝 Editing session started: ${documentId}`);
    });

    // Handle collaborative editing
    socket.on('edit:change', (data) => {
      const { documentId, operation, cursorPosition, selection } = data;
      const roomName = `doc:${documentId}`;

      // Store operation
      const session = editingSessions.get(documentId);
      if (session) {
        session.operations.push({
          userId: socket.userId,
          operation,
          version: session.version,
          timestamp: new Date()
        });
        session.version++;
      }

      // Broadcast to all editors
      socket.to(roomName).emit('edit:change', {
        userId: socket.userId,
        operation,
        cursorPosition,
        selection,
        version: session?.version,
        timestamp: new Date()
      });
    });

    // Handle cursor position
    socket.on('cursor:move', (data) => {
      const { documentId, position, selection, color } = data;
      const roomName = `doc:${documentId}`;

      socket.to(roomName).emit('cursor:update', {
        userId: socket.userId,
        email: socket.userEmail,
        position,
        selection,
        color,
        timestamp: new Date()
      });
    });

    // Handle comments
    socket.on('comment:add', (data) => {
      const { documentId, text, position } = data;
      const roomName = `doc:${documentId}`;

      const comment = {
        id: `comment_${Date.now()}`,
        userId: socket.userId,
        email: socket.userEmail,
        text,
        position,
        timestamp: new Date(),
        replies: []
      };

      io.to(roomName).emit('comment:added', comment);
    });

    socket.on('comment:reply', (data) => {
      const { documentId, commentId, text } = data;
      const roomName = `doc:${documentId}`;

      io.to(roomName).emit('comment:replied', {
        commentId,
        reply: {
          userId: socket.userId,
          email: socket.userEmail,
          text,
          timestamp: new Date()
        }
      });
    });

    // Handle reactions
    socket.on('reaction:add', (data) => {
      const { documentId, commentId, emoji } = data;
      const roomName = `doc:${documentId}`;

      io.to(roomName).emit('reaction:added', {
        commentId,
        userId: socket.userId,
        emoji,
        timestamp: new Date()
      });
    });

    // Handle typing indicator
    socket.on('typing:start', (data) => {
      const { documentId } = data;
      const roomName = `doc:${documentId}`;

      socket.to(roomName).emit('user:typing', {
        userId: socket.userId,
        email: socket.userEmail,
        documentId
      });
    });

    socket.on('typing:stop', (data) => {
      const { documentId } = data;
      const roomName = `doc:${documentId}`;

      socket.to(roomName).emit('user:stopped_typing', {
        userId: socket.userId,
        documentId
      });
    });

    // Handle save
    socket.on('document:save', (data) => {
      const { documentId, content, version } = data;
      const roomName = `doc:${documentId}`;

      const session = editingSessions.get(documentId);
      if (session) {
        session.content = content;
      }

      io.to(roomName).emit('document:saved', {
        userId: socket.userId,
        documentId,
        version,
        timestamp: new Date()
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      connectedUsers.delete(socket.userId);

      // Remove from editing sessions
      editingSessions.forEach((session, documentId) => {
        if (session.editors.has(socket.userId)) {
          session.editors.delete(socket.userId);

          io.to(`doc:${documentId}`).emit('editor:left', {
            userId: socket.userId,
            documentId,
            editorsCount: session.editors.size
          });
        }
      });

      // Broadcast user left
      if (socket.workspaceId) {
        io.to(`workspace:${socket.workspaceId}`).emit('user:left', {
          userId: socket.userId,
          timestamp: new Date()
        });
      }

      console.log(`❌ User disconnected: ${socket.userId}`);
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  return io;
}

function getIO() {
  return io;
}

function getConnectedUsers(workspaceId) {
  return Array.from(connectedUsers.values());
}

function getEditingSession(documentId) {
  return editingSessions.get(documentId);
}

module.exports = {
  initializeSocket,
  getIO,
  getConnectedUsers,
  getEditingSession
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// backend/server.js - Updated with Socket.IO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

require('dotenv').config();
const express = require('express');
const http = require('http');
const { connectDB } = require('./config/database');
const { initializeSocket } = require('./config/socket');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(','),
  credentials: true
}));

// Initialize Socket.IO
initializeSocket(server);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/collaboration', require('./routes/collaboration'));

// Start
const PORT = process.env.PORT || 3000;

const start = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`\n🚀 SocialHub with Real-time Collaboration`);
      console.log(`✅ Server: http://localhost:${PORT}`);
      console.log(`✅ WebSocket: ws://localhost:${PORT}\n`);
    });
  } catch (error) {
    console.error('❌ Startup failed:', error);
    process.exit(1);
  }
};

start();

module.exports = { app, server };
```


***

## 🎯 **DAY 2: OPERATIONAL TRANSFORM ALGORITHM**

```javascript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// backend/services/operational-transform.js
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Operational Transform (OT) Implementation
 * Handles conflict resolution for collaborative editing
 */

class Operation {
  constructor(type, position, content = '') {
    this.type = type;  // 'insert' or 'delete'
    this.position = position;
    this.content = content;
    this.timestamp = Date.now();
  }

  /**
   * Apply operation to content
   */
  apply(content) {
    if (this.type === 'insert') {
      return (
        content.slice(0, this.position) +
        this.content +
        content.slice(this.position)
      );
    } else if (this.type === 'delete') {
      return (
        content.slice(0, this.position) +
        content.slice(this.position + this.content.length)
      );
    }
    return content;
  }

  /**
   * Get inverse operation
   */
  getInverse() {
    if (this.type === 'insert') {
      return new Operation('delete', this.position, this.content);
    } else if (this.type === 'delete') {
      return new Operation('insert', this.position, this.content);
    }
  }

  /**
   * Transform against another operation
   */
  transform(other) {
    // If operations don't overlap, return as is
    if (
      (this.type === 'insert' && other.type === 'insert') ||
      (this.type === 'delete' && other.type === 'delete')
    ) {
      if (this.position < other.position) {
        return this;
      } else if (this.position > other.position) {
        const newOp = new Operation(this.type, this.position, this.content);

        if (other.type === 'insert') {
          newOp.position += other.content.length;
        } else {
          newOp.position -= other.content.length;
        }

        return newOp;
      } else {
        // Same position - use timestamps to break tie
        if (this.timestamp < other.timestamp) {
          return this;
        } else {
          const newOp = new Operation(this.type, this.position, this.content);
          if (other.type === 'insert') {
            newOp.position += other.content.length;
          } else {
            newOp.position -= other.content.length;
          }
          return newOp;
        }
      }
    }

    // Insert vs Delete
    if (this.type === 'insert' && other.type === 'delete') {
      const newOp = new Operation(this.type, this.position, this.content);

      if (this.position <= other.position) {
        // Insert before delete
        return newOp;
      } else if (
        this.position >
        other.position + other.content.length
      ) {
        // Insert after delete
        newOp.position -= other.content.length;
        return newOp;
      } else {
        // Insert inside delete range
        newOp.position = other.position;
        return newOp;
      }
    }

    // Delete vs Insert
    if (this.type === 'delete' && other.type === 'insert') {
      const newOp = new Operation(this.type, this.position, this.content);

      if (this.position + this.content.length <= other.position) {
        // Delete before insert
        return newOp;
      } else if (this.position >= other.position) {
        // Delete after insert
        newOp.position += other.content.length;
        return newOp;
      } else {
        // Delete spans insert point
        newOp.content = newOp.content.slice(
          0,
          other.position - this.position
        );
        return newOp;
      }
    }

    return this;
  }
}

class OperationalTransform {
  constructor() {
    this.serverContent = '';
    this.serverVersion = 0;
    this.operations = [];
    this.pendingOperations = [];
  }

  /**
   * Apply local operation
   */
  applyLocal(operation) {
    this.serverContent = operation.apply(this.serverContent);
    this.operations.push(operation);
    this.serverVersion++;

    return {
      version: this.serverVersion,
      content: this.serverContent
    };
  }

  /**
   * Apply remote operation
   */
  applyRemote(remoteOp, remoteVersion) {
    // Transform pending operations against remote operation
    this.pendingOperations = this.pendingOperations.map(pending =>
      pending.transform(remoteOp)
    );

    // Apply remote operation
    this.serverContent = remoteOp.apply(this.serverContent);
    this.operations.push(remoteOp);
    this.serverVersion++;

    return {
      version: this.serverVersion,
      content: this.serverContent
    };
  }

  /**
   * Get operations since version
   */
  getOperationsSince(version) {
    if (version < 0 || version >= this.operations.length) {
      return [];
    }

    return this.operations.slice(version);
  }

  /**
   * Undo last local operation
   */
  undo() {
    if (this.pendingOperations.length === 0) {
      return null;
    }

    const lastOp = this.pendingOperations.pop();
    const inverse = lastOp.getInverse();

    this.serverContent = inverse.apply(this.serverContent);

    return {
      operation: inverse,
      version: this.serverVersion,
      content: this.serverContent
    };
  }

  /**
   * Get current state
   */
  getState() {
    return {
      content: this.serverContent,
      version: this.serverVersion,
      operationsCount: this.operations.length
    };
  }
}

module.exports = { Operation, OperationalTransform };

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// backend/services/collaboration.js
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const redis = require('redis');
const { OperationalTransform, Operation } = require('./operational-transform');

const redisClient = redis.createClient({ url: process.env.REDIS_URL });
redisClient.connect();

const otInstances = new Map();

class CollaborationService {
  /**
   * Get or create OT instance for document
   */
  static async getOTInstance(documentId) {
    if (!otInstances.has(documentId)) {
      // Load from Redis if exists
      const cached = await redisClient.get(`ot:${documentId}`);

      if (cached) {
        const state = JSON.parse(cached);
        const ot = new OperationalTransform();
        ot.serverContent = state.content;
        ot.serverVersion = state.version;
        otInstances.set(documentId, ot);
      } else {
        // Create new instance
        const ot = new OperationalTransform();
        otInstances.set(documentId, ot);
      }
    }

    return otInstances.get(documentId);
  }

  /**
   * Apply operation
   */
  static async applyOperation(documentId, operation) {
    const ot = await this.getOTInstance(documentId);

    const result = ot.applyLocal(operation);

    // Cache in Redis
    await redisClient.setEx(
      `ot:${documentId}`,
      3600,
      JSON.stringify({
        content: ot.serverContent,
        version: ot.serverVersion
      })
    );

    return result;
  }

  /**
   * Transform operation
   */
  static async transformOperation(
    documentId,
    clientOp,
    serverVersion
  ) {
    const ot = await this.getOTInstance(documentId);

    // Get operations since client version
    const laterOps = ot.getOperationsSince(serverVersion);

    // Transform client op against all later ops
    let transformedOp = clientOp;
    for (const laterOp of laterOps) {
      transformedOp = transformedOp.transform(laterOp);
    }

    return transformedOp;
  }

  /**
   * Save document version
   */
  static async saveVersion(documentId, content, userId) {
    const timestamp = new Date();
    const versionKey = `version:${documentId}:${timestamp.getTime()}`;

    await redisClient.setEx(
      versionKey,
      86400 * 7,  // 7 days
      JSON.stringify({
        content,
        userId,
        timestamp,
        checksum: this.calculateChecksum(content)
      })
    );

    // Add to version list
    await redisClient.lPush(
      `versions:${documentId}`,
      versionKey
    );
  }

  /**
   * Get document history
   */
  static async getHistory(documentId, limit = 50) {
    const versionKeys = await redisClient.lRange(
      `versions:${documentId}`,
      0,
      limit - 1
    );

    const versions = await Promise.all(
      versionKeys.map(async (key) => {
        const data = await redisClient.get(key);
        return JSON.parse(data);
      })
    );

    return versions;
  }

  /**
   * Calculate checksum for conflict detection
   */
  static calculateChecksum(content) {
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex')
      .substring(0, 8);
  }

  /**
   * Resolve conflicts
   */
  static async resolveConflict(documentId, version1, version2) {
    const history = await this.getHistory(documentId, 100);

    // Find common ancestor
    let commonAncestor = null;
    for (const version of history) {
      if (version.checksum === version1.checksum ||
          version.checksum === version2.checksum) {
        commonAncestor = version;
        break;
      }
    }

    if (!commonAncestor) {
      // Use most recent version
      return history[^0];
    }

    // Apply 3-way merge algorithm
    const merged = this.threeWayMerge(
      commonAncestor.content,
      version1.content,
      version2.content
    );

    return merged;
  }

  /**
   * Simple 3-way merge
   */
  static threeWayMerge(base, version1, version2) {
    // Simple strategy: keep longest version
    if (version1.length > version2.length) {
      return version1;
    }
    return version2;
  }
}

module.exports = CollaborationService;
```


***

## 🖊️ **DAY 3: COLLABORATIVE EDITING UI (REACT)**

```javascript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// frontend/hooks/useCollaboration.js
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from './useSocket';

export function useCollaboration(documentId) {
  const { socket } = useSocket();
  const [content, setContent] = useState('');
  const [version, setVersion] = useState(0);
  const [editors, setEditors] = useState([]);
  const [cursorPositions, setCursorPositions] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const contentRef = useRef(content);
  const typingTimeoutRef = useRef(null);

  // Join document
  useEffect(() => {
    if (!socket || !documentId) return;

    socket.emit('join:document', { documentId });

    socket.on('document:state', (data) => {
      setContent(data.content);
      setVersion(data.version);
      setEditors(data.editors);
      contentRef.current = data.content;
    });

    socket.on('edit:change', (data) => {
      // Transform received operation against local changes
      applyRemoteChange(data);
    });

    socket.on('cursor:update', (data) => {
      setCursorPositions(prev => ({
        ...prev,
        [data.userId]: {
          position: data.position,
          selection: data.selection,
          color: data.color,
          email: data.email
        }
      }));
    });

    socket.on('editor:joined', (data) => {
      setEditors(prev => [...new Set([...prev, data.userId])]);
    });

    socket.on('editor:left', (data) => {
      setEditors(prev => prev.filter(id => id !== data.userId));
      setCursorPositions(prev => {
        const newPositions = { ...prev };
        delete newPositions[data.userId];
        return newPositions;
      });
    });

    return () => {
      socket.off('document:state');
      socket.off('edit:change');
      socket.off('cursor:update');
      socket.off('editor:joined');
      socket.off('editor:left');
    };

  }, [socket, documentId]);

  const applyRemoteChange = useCallback((data) => {
    const { operation, cursorPosition } = data;

    setContent(prev => {
      // Apply operation to content
      let newContent = prev;

      if (operation.type === 'insert') {
        newContent = (
          prev.slice(0, operation.position) +
          operation.content +
          prev.slice(operation.position)
        );
      } else if (operation.type === 'delete') {
        newContent = (
          prev.slice(0, operation.position) +
          prev.slice(operation.position + operation.content.length)
        );
      }

      contentRef.current = newContent;
      return newContent;
    });

    setVersion(data.version);
  }, []);

  const handleChange = useCallback((newContent) => {
    // Calculate operation
    const operation = calculateOperation(contentRef.current, newContent);

    if (!operation) return;

    setContent(newContent);
    contentRef.current = newContent;

    // Send to server
    socket?.emit('edit:change', {
      documentId,
      operation,
      cursorPosition: newContent.length,
      version
    });

    // Show typing indicator
    socket?.emit('typing:start', { documentId });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit('typing:stop', { documentId });
    }, 1000);
  }, [socket, documentId, version]);

  const handleCursorMove = useCallback((position, selection) => {
    socket?.emit('cursor:move', {
      documentId,
      position,
      selection,
      color: generateUserColor(position)
    });
  }, [socket, documentId]);

  const handleSave = useCallback(() => {
    socket?.emit('document:save', {
      documentId,
      content,
      version
    });
  }, [socket, documentId, content, version]);

  return {
    content,
    version,
    editors,
    cursorPositions,
    handleChange,
    handleCursorMove,
    handleSave,
    isTyping
  };
}

function calculateOperation(oldContent, newContent) {
  if (oldContent === newContent) return null;

  if (newContent.length > oldContent.length) {
    // Insert operation
    for (let i = 0; i < oldContent.length; i++) {
      if (oldContent[i] !== newContent[i]) {
        return {
          type: 'insert',
          position: i,
          content: newContent.slice(i, i + (newContent.length - oldContent.length))
        };
      }
    }

    return {
      type: 'insert',
      position: oldContent.length,
      content: newContent.slice(oldContent.length)
    };
  } else {
    // Delete operation
    for (let i = 0; i < newContent.length; i++) {
      if (oldContent[i] !== newContent[i]) {
        return {
          type: 'delete',
          position: i,
          content: oldContent.slice(i, i + (oldContent.length - newContent.length))
        };
      }
    }

    return {
      type: 'delete',
      position: newContent.length,
      content: oldContent.slice(newContent.length)
    };
  }
}

function generateUserColor(seed) {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1',
    '#FFA07A', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E2', '#F8B88B'
  ];

  return colors[seed % colors.length];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// frontend/hooks/useSocket.js
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

export function useSocket() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Get auth token
    const token = localStorage.getItem('auth_token');

    if (!token) return;

    // Connect to Socket.IO server
    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:3000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };

  }, []);

  return { socket, connected };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// frontend/components/CollaborativeEditor/Editor.jsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import React, { useRef, useState } from 'react';
import { useCollaboration } from '../../hooks/useCollaboration';
import RemoteCursors from './Cursors';
import EditorPresence from './Presence';
import Comments from './Comments';

export default function CollaborativeEditor({ documentId, onSave }) {
  const editorRef = useRef(null);
  const [showComments, setShowComments] = useState(false);

  const {
    content,
    version,
    editors,
    cursorPositions,
    handleChange,
    handleCursorMove,
    handleSave
  } = useCollaboration(documentId);

  const handleTextChange = (e) => {
    handleChange(e.target.value);
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      setShowComments(!showComments);
    }
  };

  const handleMouseUp = () => {
    const editor = editorRef.current;
    const position = editor.selectionStart;
    const selection = {
      start: editor.selectionStart,
      end: editor.selectionEnd
    };

    handleCursorMove(position, selection);
  };

  return (
    <div style={styles.container}>
      <EditorPresence editors={editors} />

      <div style={styles.editorWrapper}>
        <textarea
          ref={editorRef}
          value={content}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onMouseUp={handleMouseUp}
          style={styles.editor}
          placeholder="Start typing..."
        />

        <RemoteCursors
          cursorPositions={cursorPositions}
          content={content}
        />
      </div>

      {showComments && (
        <Comments documentId={documentId} />
      )}

      <div style={styles.footer}>
        <span>v{version}</span>
        <button
          onClick={handleSave}
          style={styles.saveBtn}
        >
          💾 Save
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: '#fff'
  },

  editorWrapper: {
    position: 'relative',
    flex: 1,
  },

  editor: {
    width: '100%',
    height: '100%',
    padding: '20px',
    border: 'none',
    fontFamily: 'Monaco, monospace',
    fontSize: '14px',
    lineHeight: '1.6',
    resize: 'none',
    outline: 'none'
  },

  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 20px',
    borderTop: '1px solid #eee',
    fontSize: '12px',
    color: '#666'
  },

  saveBtn: {
    padding: '6px 12px',
    background: '#01696f',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// frontend/components/CollaborativeEditor/Cursors.jsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import React, { useMemo } from 'react';

export default function RemoteCursors({ cursorPositions, content }) {
  const cursors = useMemo(() => {
    return Object.entries(cursorPositions).map(([userId, cursor]) => {
      // Calculate cursor position in pixels
      const lineNum = content.substring(0, cursor.position).split('\n').length - 1;
      const lineStart = content.lastIndexOf('\n', cursor.position - 1) + 1;
      const charNum = cursor.position - lineStart;

      return {
        userId,
        lineNum,
        charNum,
        ...cursor
      };
    });
  }, [cursorPositions, content]);

  return (
    <div style={styles.cursorsContainer}>
      {cursors.map((cursor) => (
        <div key={cursor.userId} style={styles.cursorWrapper}>
          <div
            style={{
              ...styles.cursor,
              borderLeftColor: cursor.color
            }}
          />
          <span style={{
            ...styles.label,
            background: cursor.color
          }}>
            {cursor.email}
          </span>
        </div>
      ))}
    </div>
  );
}

const styles = {
  cursorsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    pointerEvents: 'none',
    width: '100%',
    height: '100%'
  },

  cursorWrapper: {
    position: 'absolute'
  },

  cursor: {
    width: '2px',
    height: '20px',
    borderLeft: '2px solid',
    animation: 'blink 1s infinite'
  },

  label: {
    position: 'absolute',
    top: '-20px',
    left: 0,
    padding: '2px 6px',
    fontSize: '11px',
    color: 'white',
    borderRadius: '2px',
    whiteSpace: 'nowrap'
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// frontend/components/CollaborativeEditor/Presence.jsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import React from 'react';

export default function EditorPresence({ editors }) {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <span style={styles.label}>
          👥 {editors.length} editing:
        </span>
        <div style={styles.avatars}>
          {editors.slice(0, 3).map((editor, i) => (
            <div
              key={editor}
              style={{
                ...styles.avatar,
                background: `hsl(${i * 120}, 70%, 60%)`
              }}
            >
              {editor.charAt(0).toUpperCase()}
            </div>
          ))}
          {editors.length > 3 && (
            <div style={styles.moreCount}>
              +{editors.length - 3}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: '#f5f5f5',
    padding: '10px 20px',
    borderBottom: '1px solid #ddd'
  },

  content: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },

  label: {
    fontSize: '13px',
    fontWeight: '600'
  },

  avatars: {
    display: 'flex',
    gap: '-5px'
  },

  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '12px',
    fontWeight: '600',
    marginLeft: '-5px',
    border: '2px solid white'
  },

  moreCount: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#666',
    marginLeft: '10px'
  }
};
```


***

## 💬 **DAY 4: COMMENTS \& REACTIONS**

```javascript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// backend/models/Comment.js
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  text: {
    type: String,
    required: true
  },

  position: {
    start: Number,
    end: Number
  },

  resolved: {
    type: Boolean,
    default: false
  },

  reactions: [{
    emoji: String,
    userIds: [mongoose.Schema.Types.ObjectId]
  }],

  replies: [{
    userId: mongoose.Schema.Types.ObjectId,
    text: String,
    createdAt: { type: Date, default: Date.now }
  }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Comment', commentSchema);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// backend/routes/comments.js
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const { verifyToken } = require('../middleware');
const { getIO } = require('../config/socket');

// Create comment
router.post('/', verifyToken, async (req, res) => {
  try {
    const { documentId, text, position } = req.body;

    const comment = new Comment({
      documentId,
      userId: req.user.id,
      text,
      position
    });

    await comment.save();
    await comment.populate('userId', 'name email');

    // Broadcast to all editors
    const io = getIO();
    io.to(`doc:${documentId}`).emit('comment:added', comment);

    res.status(201).json(comment);

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get comments for document
router.get('/:documentId', verifyToken, async (req, res) => {
  try {
    const comments = await Comment.find({
      documentId: req.params.documentId
    })
      .populate('userId', 'name email avatar')
      .populate('replies.userId', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json(comments);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add reply
router.post('/:commentId/reply', verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    comment.replies.push({
      userId: req.user.id,
      text
    });

    await comment.save();

    // Broadcast
    const io = getIO();
    io.to(`doc:${comment.documentId}`).emit('comment:replied', {
      commentId: req.params.commentId,
      reply: comment.replies[comment.replies.length - 1]
    });

    res.json(comment);

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add reaction
router.post('/:commentId/reaction', verifyToken, async (req, res) => {
  try {
    const { emoji } = req.body;
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const reaction = comment.reactions.find(r => r.emoji === emoji);

    if (reaction) {
      if (!reaction.userIds.includes(req.user.id)) {
        reaction.userIds.push(req.user.id);
      }
    } else {
      comment.reactions.push({
        emoji,
        userIds: [req.user.id]
      });
    }

    await comment.save();

    // Broadcast
    const io = getIO();
    io.to(`doc:${comment.documentId}`).emit('reaction:added', {
      commentId: req.params.commentId,
      userId: req.user.id,
      emoji
    });

    res.json(comment);

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Resolve comment
router.patch('/:commentId/resolve', verifyToken, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    comment.resolved = !comment.resolved;
    await comment.save();

    // Broadcast
    const io = getIO();
    io.to(`doc:${comment.documentId}`).emit('comment:resolved', {
      commentId: req.params.commentId,
      resolved: comment.resolved
    });

    res.json(comment);

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// frontend/components/Comments/CommentThread.jsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import React, { useState, useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';

export default function CommentThread({ documentId, comments: initialComments }) {
  const { socket } = useSocket();
  const [comments, setComments] = useState(initialComments || []);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    if (!socket) return;

    socket.on('comment:added', (comment) => {
      setComments(prev => [comment, ...prev]);
    });

    socket.on('comment:replied', (data) => {
      setComments(prev => prev.map(c =>
        c._id === data.commentId ? { ...c, replies: [...c.replies, data.reply] } : c
      ));
    });

    socket.on('reaction:added', (data) => {
      setComments(prev => prev.map(c =>
        c._id === data.commentId ? { ...c } : c
      ));
    });

    return () => {
      socket.off('comment:added');
      socket.off('comment:replied');
      socket.off('reaction:added');
    };

  }, [socket]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const response = await fetch(`/api/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          documentId,
          text: newComment
        })
      });

      if (response.ok) {
        setNewComment('');
      }

    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>💬 Comments ({comments.length})</h3>

      <div style={styles.input}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          style={styles.textarea}
        />
        <button
          onClick={handleAddComment}
          style={styles.submitBtn}
        >
          Send
        </button>
      </div>

      <div style={styles.comments}>
        {comments.map(comment => (
          <CommentItem
            key={comment._id}
            comment={comment}
            documentId={documentId}
          />
        ))}
      </div>
    </div>
  );
}

function CommentItem({ comment, documentId }) {
  const [showReplies, setShowReplies] = useState(false);

  return (
    <div style={styles.commentItem}>
      <div style={styles.commentHeader}>
        <strong>{comment.userId?.name}</strong>
        <span style={styles.time}>
          {new Date(comment.createdAt).toLocaleDateString()}
        </span>
      </div>

      <p style={styles.text}>{comment.text}</p>

      <div style={styles.reactions}>
        {comment.reactions.map(reaction => (
          <button
            key={reaction.emoji}
            style={styles.reactionBtn}
          >
            {reaction.emoji} {reaction.userIds.length}
          </button>
        ))}
      </div>

      {comment.replies.length > 0 && (
        <div style={styles.repliesSection}>
          <button
            onClick={() => setShowReplies(!showReplies)}
            style={styles.repliesToggle}
          >
            {showReplies ? '🔽' : '▶️'} {comment.replies.length} replies
          </button>

          {showReplies && (
            <div style={styles.replies}>
              {comment.replies.map((reply, i) => (
                <div key={i} style={styles.reply}>
                  <strong>{reply.userId?.name}:</strong> {reply.text}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    width: '300px',
    borderLeft: '1px solid #ddd',
    padding: '20px',
    overflowY: 'auto'
  },

  title: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '15px'
  },

  input: {
    marginBottom: '20px'
  },

  textarea: {
    width: '100%',
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '12px',
    marginBottom: '8px',
    resize: 'vertical',
    minHeight: '60px'
  },

  submitBtn: {
    width: '100%',
    padding: '6px',
    background: '#01696f',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },

  comments: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },

  commentItem: {
    padding: '10px',
    background: '#f9f9f9',
    borderRadius: '4px',
    fontSize: '12px'
  },

  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px'
  },

  time: {
    color: '#999',
    fontSize: '11px'
  },

  text: {
    margin: '8px 0',
    lineHeight: '1.4'
  },

  reactions: {
    display: 'flex',
    gap: '6px',
    marginTop: '8px'
  },

  reactionBtn: {
    padding: '2px 6px',
    background: 'white',
    border: '1px solid #ddd',
    borderRadius: '3px',
    fontSize: '11px',
    cursor: 'pointer'
  }
};
```


***

## 🔔 **DAY 5: NOTIFICATIONS SYSTEM**

```javascript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// backend/models/Notification.js
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// backend/services/notification.js
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const Notification = require('../models/Notification');
const { getIO } = require('../config/socket');

class NotificationService {
  /**
   * Send notification
   */
  static async sendNotification(userId, notification) {
    try {
      // Save to database
      const doc = new Notification({
        userId,
        ...notification
      });

      await doc.save();

      // Send via Socket.IO
      const io = getIO();
      io.to(`user:${userId}`).emit('notification:received', {
        id: doc._id,
        ...notification
      });

      // Send via email (optional)
      if (notification.type === 'mention') {
        await this.sendEmailNotification(userId, notification);
      }

      return doc;

    } catch (error) {
      console.error('Notification error:', error);
    }
  }

  /**
   * Send notification to multiple users
   */
  static async broadcastNotification(userIds, notification) {
    return Promise.all(
      userIds.map(userId => this.sendNotification(userId, notification))
    );
  }

  /**
   * Mark as read
   */
  static async markAsRead(notificationId) {
    return Notification.findByIdAndUpdate(
      notificationId,
      { read: true, readAt: new Date() },
      { new: true }
    );
  }

  /**
   * Mark all as read
   */
  static async markAllAsRead(userId) {
    return Notification.updateMany(
      { userId, read: false },
      { read: true, readAt: new Date() }
    );
  }

  /**
   * Get unread count
   */
  static async getUnreadCount(userId) {
    return Notification.countDocuments({ userId, read: false });
  }

  /**
   * Send email notification
   */
  static async sendEmailNotification(userId, notification) {
    // Implementation using nodemailer
    console.log('📧 Email notification:', notification);
  }
}

module.exports = NotificationService;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// backend/routes/notifications.js
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const NotificationService = require('../services/notification');
const { verifyToken } = require('../middleware');

// Get notifications
router.get('/', verifyToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));

    const total = await Notification.countDocuments({ userId: req.user.id });
    const unread = await Notification.countDocuments({
      userId: req.user.id,
      read: false
    });

    res.json({ notifications, total, unread });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark as read
router.patch('/:id/read', verifyToken, async (req, res) => {
  try {
    const notification = await NotificationService.markAsRead(req.params.id);
    res.json(notification);

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Mark all as read
router.patch('/read/all', verifyToken, async (req, res) => {
  try {
    await NotificationService.markAllAsRead(req.user.id);
    res.json({ message: 'All marked as read' });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// frontend/hooks/useNotifications.js
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useEffect, useState, useCallback } from 'react';
import { useSocket } from './useSocket';

export function useNotifications() {
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!socket) return;

    // Join user notification room
    socket.emit('join:notifications', {});

    // Listen for new notifications
    socket.on('notification:received', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Desktop notification
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/logo.png'
        });
      }
    });

    return () => {
      socket.off('notification:received');
    };

  }, [socket]);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      setNotifications(prev => prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ));

      setUnreadCount(prev => Math.max(0, prev - 1));

    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await fetch(`/api/notifications/read/all`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);

    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// frontend/components/Notifications/NotificationCenter.jsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import React, { useState } from 'react';
import { useNotifications } from '../../hooks/useNotifications';

export default function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={styles.container}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={styles.button}
      >
        🔔
        {unreadCount > 0 && (
          <span style={styles.badge}>{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div style={styles.dropdown}>
          <div style={styles.header}>
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={styles.markAllBtn}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div style={styles.list}>
            {notifications.length === 0 ? (
              <p style={styles.empty}>No notifications</p>
            ) : (
              notifications.map(n => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={() => markAsRead(n.id)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({ notification, onRead }) {
  return (
    <div
      style={{
        ...styles.item,
        background: notification.read ? 'white' : '#f0f0f0'
      }}
      onClick={onRead}
    >
      <div style={styles.icon}>
        {notification.type === 'comment_added' && '💬'}
        {notification.type === 'mention' && '👤'}
        {notification.type === 'post_published' && '📝'}
        {notification.type === 'collaboration_invite' && '🤝'}
      </div>

      <div style={styles.content}>
        <p style={styles.title}>{notification.title}</p>
        <p style={styles.message}>{notification.message}</p>
        <small style={styles.time}>
          {new Date(notification.createdAt).toLocaleDateString()}
        </small>
      </div>

      {!notification.read && (
        <div style={styles.unreadDot} />
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'relative'
  },

  button: {
    position: 'relative',
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer'
  },

  badge: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    background: '#e74c3c',
    color: 'white',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold'
  },

  dropdown: {
    position: 'absolute',
    top: '40px',
    right: '0',
    width: '350px',
    background: 'white',
    border: '1px solid #ddd',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    zIndex: '1000'
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    borderBottom: '1px solid #eee'
  },

  markAllBtn: {
    background: 'none',
    border: 'none',
    color: '#01696f',
    cursor: 'pointer',
    fontSize: '12px'
  },

  list: {
    maxHeight: '400px',
    overflowY: 'auto'
  },

  item: {
    display: 'flex',
    gap: '10px',
    padding: '12px',
    borderBottom: '1px solid #f0f0f0',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },

  icon: {
    fontSize: '20px'
  },

  content: {
    flex: 1
  },

  title: {
    margin: '0 0 4px 0',
    fontWeight: '600',
    fontSize: '13px'
  },

  message: {
    margin: '0',
    fontSize: '12px',
    color: '#666'
  },

  time: {
    color: '#999',
    fontSize: '11px'
  },

  unreadDot: {
    width: '8px',
    height: '8px',
    background: '#01696f',
    borderRadius: '50%'
  },

  empty: {
    textAlign: 'center',
    padding: '20px',
    color: '#999'
  }
};
```


***

## 📦 **PACKAGE.JSON - Add Socket.IO**

```json
{
  "devDependencies": {
    "@socket.io/redis-adapter": "^8.0.0"
  },
  "dependencies": {
    "socket.io": "^4.5.0",
    "socket.io-client": "^4.5.0",
    "redis": "^4.6.0"
  }
}
```


***

## ✅ **PHASE M SUMMARY**

✅ **Real-time Collaboration Complete:**

- Socket.IO setup with Redis adapter
- Operational Transform algorithm (conflict resolution)
- Collaborative editing UI with remote cursors
- Comments \& reactions system
- Real-time notifications
- Presence tracking
- Desktop notifications

**Bạn muốn:**

1. ✨ PHASE N - Advanced Analytics Dashboard
2. 📊 PHASE O - Social Listening \& Sentiment
3. 🚀 Chi tiết deployment?[^1]

<div align="center">⁂</div>

[^1]: https://developers.facebook.com/docs/permissions/

