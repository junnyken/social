const config = require('../config');

/**
 * Basic In-Memory Rate Limiting for Phase 1
 */
const rateMap = new Map();

exports.apiLimit = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!rateMap.has(ip)) {
        rateMap.set(ip, { count: 1, lastReset: now });
        return next();
    }

    const userData = rateMap.get(ip);
    
    // Reset window (1 hour)
    if (now - userData.lastReset > 3600000) {
        userData.count = 1;
        userData.lastReset = now;
        return next();
    }

    // Max 100 requests per hour for API abuse prevention
    if (userData.count >= 100) {
        return res.status(429).json({ error: true, message: 'Too many requests' });
    }

    userData.count++;
    next();
};
