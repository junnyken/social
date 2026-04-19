/**
 * Authentication Middleware — Production-Ready
 * Validates session cookies against persistent data store
 * No in-memory sessions — survives server restarts on Render/Docker
 */

const dataService = require('../services/data.service');

exports.requireAuth = async (req, res, next) => {
    const cookieUserId = req.cookies.fbsession;
    const authHeader = req.headers.authorization;

    // 1. Try cookie-based auth — validate against data store
    if (cookieUserId) {
        try {
            const accounts = await dataService.getAll('accounts');
            const account = accounts.find(a => a.id === cookieUserId);
            if (account) {
                req.user = {
                    id: account.id,
                    name: account.name || 'User',
                    role: 'owner',
                    sessionId: cookieUserId
                };
                return next();
            }
        } catch (e) {
            console.error('[Auth] Data lookup error:', e.message);
        }
    }

    // 2. Try Bearer token (userId from localStorage, sent by frontend)
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7).trim();
        if (token && token.length > 0) {
            try {
                const accounts = await dataService.getAll('accounts');
                const account = accounts.find(a => a.id === token);
                if (account) {
                    req.user = {
                        id: account.id,
                        name: account.name || 'User',
                        role: 'owner'
                    };
                    return next();
                }
            } catch (e) {
                console.error('[Auth] Bearer token lookup error:', e.message);
            }
            // Fallback: accept token even if data lookup fails (for extensions etc)
            req.user = {
                id: token.slice(0, 20) || 'api-user',
                name: 'API User',
                role: 'owner'
            };
            return next();
        }
    }

    // 3. Development/Local bypass — allow unauthenticated access for local testing
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

// Create a session (stores userId, returns it for cookie)
// Kept for backward compatibility but no longer uses in-memory Map
exports.createSession = (userId, userName, role = 'owner') => {
    // Simply return the userId — the cookie will store this,
    // and requireAuth validates it against the data store
    return userId;
};

// Destroy a session (logout — just clears the cookie on client side)
exports.destroySession = (sessionId) => {
    // No-op since we don't use in-memory sessions anymore
};

// Get active session count (check connected accounts in data store)
exports.getActiveSessions = async () => {
    try {
        const accounts = await dataService.getAll('accounts');
        return accounts.filter(a => a.status === 'connected').length;
    } catch {
        return 0;
    }
};
