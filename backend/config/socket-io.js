// ============================================================
// Socket.IO Configuration — Real-time Collaboration Engine
// ============================================================

const { Server } = require('socket.io');

let io;
const connectedUsers = new Map();
const editingSessions = new Map();

function initializeSocketIO(server, config) {
    io = new Server(server, {
        cors: {
            origin: config.allowedOrigins || ['https://social-9cpy.onrender.com'],
            methods: ['GET', 'POST'],
            credentials: true
        },
        transports: ['websocket', 'polling'],
        pingInterval: 25000,
        pingTimeout: 60000
    });

    // ── Connection Handler ─────────────────────────────────────
    io.on('connection', (socket) => {
        const userId = socket.handshake.query.userId || 'anonymous';
        const userName = socket.handshake.query.userName || 'User';

        console.log(`[Socket.IO] ✅ Connected: ${userName} (${userId})`);

        // Track connected user
        connectedUsers.set(userId, {
            socketId: socket.id,
            userId,
            userName,
            connectedAt: new Date().toISOString(),
            status: 'online',
            currentPage: null
        });

        // Broadcast updated presence to everyone
        broadcastPresence();

        // ── Join Workspace ──────────────────────────────────────
        socket.on('join:workspace', (workspaceId) => {
            socket.join(`workspace:${workspaceId}`);
            socket.workspaceId = workspaceId;
            console.log(`[Socket.IO] 👥 ${userName} joined workspace: ${workspaceId}`);
        });

        // ── Page Navigation Tracking ────────────────────────────
        socket.on('navigate', (data) => {
            const user = connectedUsers.get(userId);
            if (user) {
                user.currentPage = data.page;
                user.lastActive = new Date().toISOString();
            }
            broadcastPresence();
        });

        // ── Join Document Editing ───────────────────────────────
        socket.on('join:document', (data) => {
            const { documentId } = data;
            const roomName = `doc:${documentId}`;
            socket.join(roomName);

            if (!editingSessions.has(documentId)) {
                editingSessions.set(documentId, {
                    editors: new Map(),
                    version: 0
                });
            }

            const session = editingSessions.get(documentId);
            session.editors.set(userId, {
                userId,
                userName,
                color: generateColor(userId),
                joinedAt: new Date().toISOString()
            });

            // Notify others that user joined document
            socket.to(roomName).emit('editor:joined', {
                userId,
                userName,
                documentId,
                editors: Array.from(session.editors.values()),
                editorsCount: session.editors.size
            });

            // Send current editors to new joiner
            socket.emit('document:editors', {
                documentId,
                editors: Array.from(session.editors.values()),
                version: session.version
            });
        });

        // ── Leave Document ──────────────────────────────────────
        socket.on('leave:document', (data) => {
            const { documentId } = data;
            leaveDocument(socket, userId, userName, documentId);
        });

        // ── Edit Change (broadcast to other editors) ────────────
        socket.on('edit:change', (data) => {
            const { documentId, content, cursorPosition } = data;
            const roomName = `doc:${documentId}`;
            const session = editingSessions.get(documentId);
            if (session) {
                session.version++;
            }

            socket.to(roomName).emit('edit:change', {
                userId,
                userName,
                content,
                cursorPosition,
                version: session?.version,
                timestamp: new Date().toISOString()
            });
        });

        // ── Cursor Movement ─────────────────────────────────────
        socket.on('cursor:move', (data) => {
            const { documentId, position } = data;
            const roomName = `doc:${documentId}`;
            const session = editingSessions.get(documentId);
            const editor = session?.editors.get(userId);

            socket.to(roomName).emit('cursor:update', {
                userId,
                userName,
                position,
                color: editor?.color || '#4ECDC4',
                timestamp: new Date().toISOString()
            });
        });

        // ── Typing Indicator ────────────────────────────────────
        socket.on('typing:start', (data) => {
            const { documentId } = data;
            socket.to(`doc:${documentId}`).emit('user:typing', { userId, userName });
        });

        socket.on('typing:stop', (data) => {
            const { documentId } = data;
            socket.to(`doc:${documentId}`).emit('user:stopped_typing', { userId });
        });

        // ── Workflow Events (broadcast state changes) ───────────
        socket.on('workflow:stateChange', (data) => {
            // Broadcast to all connected users
            io.emit('workflow:updated', {
                ...data,
                actorId: userId,
                actorName: userName,
                timestamp: new Date().toISOString()
            });
        });

        // ── Team Events ─────────────────────────────────────────
        socket.on('team:change', (data) => {
            io.emit('team:updated', {
                ...data,
                actorId: userId,
                actorName: userName,
                timestamp: new Date().toISOString()
            });
        });

        // ── Disconnect ──────────────────────────────────────────
        socket.on('disconnect', () => {
            console.log(`[Socket.IO] ❌ Disconnected: ${userName} (${userId})`);
            connectedUsers.delete(userId);

            // Leave all editing sessions
            editingSessions.forEach((session, documentId) => {
                if (session.editors.has(userId)) {
                    leaveDocument(socket, userId, userName, documentId);
                }
            });

            broadcastPresence();
        });
    });

    console.log('[Socket.IO] ✅ Initialized');
    return io;
}

function leaveDocument(socket, userId, userName, documentId) {
    const roomName = `doc:${documentId}`;
    const session = editingSessions.get(documentId);
    if (session) {
        session.editors.delete(userId);
        socket.to(roomName).emit('editor:left', {
            userId,
            userName,
            documentId,
            editors: Array.from(session.editors.values()),
            editorsCount: session.editors.size
        });

        // Cleanup empty sessions
        if (session.editors.size === 0) {
            editingSessions.delete(documentId);
        }
    }
    socket.leave(roomName);
}

function broadcastPresence() {
    if (!io) return;
    const users = Array.from(connectedUsers.values());
    io.emit('presence:update', { users, count: users.length });
}

function getIO() {
    return io;
}

function getConnectedUsers() {
    return Array.from(connectedUsers.values());
}

function emitNotification(targetUserId, notification) {
    if (!io) return;
    const user = connectedUsers.get(targetUserId);
    if (user) {
        io.to(user.socketId).emit('notification:new', notification);
    }
}

function emitToAll(event, data) {
    if (!io) return;
    io.emit(event, data);
}

function generateColor(userId) {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
        '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
        '#F8B88B', '#82E0AA', '#F0B27A', '#AED6F1'
    ];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

function emitToWorkspace(workspaceId, event, data) {
    if (!io) return;
    io.to(`workspace:${workspaceId}`).emit(event, {
        ...data,
        timestamp: new Date().toISOString()
    });
}

module.exports = {
    initializeSocketIO,
    getIO,
    getConnectedUsers,
    emitNotification,
    emitToAll,
    emitToWorkspace
};
