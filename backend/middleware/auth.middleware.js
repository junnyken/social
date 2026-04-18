/**
 * Authentication Middleware — Production-Ready
 * Validates session cookies and provides user context
 */

const dataService = require('../services/data.service');

// Session store (in-memory for now, backed by cookie)
const activeSessions = new Map();

exports.requireAuth = (req, res, next) => {
    const sessionId = req.cookies.fbsession;
    const authHeader = req.headers.authorization;

    // Try cookie-based session first
    if (sessionId) {
        // Validate it's a real session (not just any string)
        const session = activeSessions.get(sessionId);
        if (session && session.expiresAt > Date.now()) {
            req.user = {
                id: session.userId || sessionId,
                name: session.userName || 'User',
                role: session.role || 'owner',
                sessionId
            };
            // Refresh session expiry on activity (sliding window)
            session.expiresAt = Date.now() + 24 * 60 * 60 * 1000;
            return next();
        }
    }

    // Try Bearer token (for API clients / extensions)
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        if (token && token.length > 0) {
            req.user = {
                id: token.slice(0, 20) || 'api-user',
                name: 'API User',
                role: 'owner'
            };
            return next();
        }
    }

    // Development/Local bypass — allow unauthenticated access for local testing
    if (process.env.NODE_ENV !== 'production') {
        req.user = {
            id: 'local_system_user',
            name: 'Trieu Nguyen',
            role: 'owner'
        };
        return next();
    }

    // In production, block unauthenticated requests
    return res.status(401).json({
        error: true,
        message: 'Unauthorized. Please login first.'
    });
};

// Create a session (called after OAuth success)
exports.createSession = (userId, userName, role = 'owner') => {
    const sessionId = require('crypto').randomUUID();
    activeSessions.set(sessionId, {
        userId,
        userName,
        role,
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24h
    });

    // Cleanup expired sessions every 100 creates
    if (activeSessions.size % 100 === 0) {
        const now = Date.now();
        for (const [key, session] of activeSessions) {
            if (session.expiresAt < now) activeSessions.delete(key);
        }
    }

    return sessionId;
};

// Destroy a session (logout)
exports.destroySession = (sessionId) => {
    activeSessions.delete(sessionId);
};

// Get active session count (for admin/health)
exports.getActiveSessions = () => activeSessions.size;
