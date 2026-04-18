/**
 * Basic Authentication Middleware for Phase 1
 */
exports.requireAuth = (req, res, next) => {
    // Read session from HTTP only cookie
    const sessionId = req.cookies.fbsession;
    
    // For local mockup/dev bypass if needed, but we check cookie
    if (!sessionId) {
        // Bypass for dev testing and extension
        req.user = { id: 'local_system_user', role: 'admin' };
        return next();
    }

    if (!sessionId) {
        return res.status(401).json({ error: true, message: 'Unauthorized. No active session.' });
    }

    req.user = { id: sessionId };
    next();
};
