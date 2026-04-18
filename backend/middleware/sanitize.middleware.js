/**
 * Input Sanitization Middleware
 * Strips potential XSS payloads from request body, query, and params
 */

function sanitizeValue(value) {
    if (typeof value === 'string') {
        return value
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/eval\s*\(/gi, '')
            .replace(/expression\s*\(/gi, '');
    }
    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }
    if (value && typeof value === 'object') {
        return sanitizeObject(value);
    }
    return value;
}

function sanitizeObject(obj) {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        sanitized[sanitizeValue(key)] = sanitizeValue(value);
    }
    return sanitized;
}

exports.sanitize = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }
    if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query);
    }
    if (req.params && typeof req.params === 'object') {
        req.params = sanitizeObject(req.params);
    }
    next();
};
