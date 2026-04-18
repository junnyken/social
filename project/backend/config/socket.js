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
