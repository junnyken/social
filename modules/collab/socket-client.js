// ============================================================
// Socket Client — Frontend Socket.IO wrapper
// ============================================================

let socket = null;
let connected = false;
let listeners = [];

export function initSocket(userId = 'user-001', userName = 'Trieu Nguyen') {
    if (socket && connected) return socket;

    // Load Socket.IO client from server
    return new Promise((resolve) => {
        // Check if io is already loaded
        if (window.io) {
            _connect(userId, userName);
            resolve(socket);
            return;
        }

        // Dynamically load the Socket.IO script
        const script = document.createElement('script');
        script.src = '/socket.io/socket.io.js';
        script.onload = () => {
            _connect(userId, userName);
            resolve(socket);
        };
        script.onerror = () => {
            console.error('[SocketClient] Failed to load socket.io.js');
            resolve(null);
        };
        document.head.appendChild(script);
    });
}

function _connect(userId, userName) {
    if (!window.io) return;

    socket = window.io({
        query: { userId, userName },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10
    });

    socket.on('connect', () => {
        console.log('[Socket] ✅ Connected:', socket.id);
        connected = true;
        notify({ type: 'connected' });
    });

    socket.on('disconnect', () => {
        console.log('[Socket] ❌ Disconnected');
        connected = false;
        notify({ type: 'disconnected' });
    });

    socket.on('connect_error', (err) => {
        console.error('[Socket] Connection error:', err.message);
    });

    // Listen for presence updates
    socket.on('presence:update', (data) => {
        notify({ type: 'presence', data });
    });

    // Listen for notifications
    socket.on('notification:new', (notif) => {
        notify({ type: 'notification', data: notif });
    });

    // Listen for workflow updates
    socket.on('workflow:updated', (data) => {
        notify({ type: 'workflow_updated', data });
    });

    // Listen for team updates
    socket.on('team:updated', (data) => {
        notify({ type: 'team_updated', data });
    });
}

export function getSocket() { return socket; }
export function isConnected() { return connected; }

export function emit(event, data) {
    if (socket && connected) {
        socket.emit(event, data);
    }
}

export function on(event, callback) {
    if (socket) {
        socket.on(event, callback);
    }
}

export function off(event, callback) {
    if (socket) {
        socket.off(event, callback);
    }
}

// Navigate tracking
export function trackNavigation(page) {
    emit('navigate', { page });
}

// Document collaboration
export function joinDocument(documentId) {
    emit('join:document', { documentId });
}

export function leaveDocument(documentId) {
    emit('leave:document', { documentId });
}

export function sendEditChange(documentId, content, cursorPosition) {
    emit('edit:change', { documentId, content, cursorPosition });
}

// Internal event bus
export function onSocketEvent(fn) { listeners.push(fn); }
export function offSocketEvent(fn) { listeners = listeners.filter(f => f !== fn); }
function notify(event) { listeners.forEach(fn => fn(event)); }
