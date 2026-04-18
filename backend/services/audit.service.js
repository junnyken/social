// ============================================================
// Audit Trail & Compliance Service — Ω8
// ============================================================

const dataService = require('./data.service');
const crypto = require('crypto');

class AuditService {

    async getLogs(filter = {}) {
        let logs = await dataService.read('audit_logs') || [];

        if (filter.userId) logs = logs.filter(l => l.userId === filter.userId);
        if (filter.action) logs = logs.filter(l => l.action === filter.action);
        if (filter.startDate) logs = logs.filter(l => new Date(l.timestamp) >= new Date(filter.startDate));
        if (filter.endDate) logs = logs.filter(l => new Date(l.timestamp) <= new Date(filter.endDate));
        
        // Return latest 1000 logs
        return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 1000);
    }

    async log(userId, userName, resource, action, details = {}, ipAddress = 'unknown') {
        const logs = await dataService.read('audit_logs') || [];
        
        const entry = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            userId,
            userName,
            resource, // e.g., 'workflow', 'team', 'post'
            action,   // e.g., 'create', 'approve', 'delete', 'login'
            details,
            ipAddress
        };

        logs.push(entry);

        // Keep rolling ledger of last 10,000 logs to prevent bloat
        if (logs.length > 10000) {
            logs.splice(0, logs.length - 10000);
        }

        await dataService.write('audit_logs', logs);
        return entry;
    }

    // Middleware factory
    loggerMiddleware(resource) {
        return (req, res, next) => {
            const originalJson = res.json;
            res.json = function(body) {
                // Determine action based on HTTP method
                let action = 'read';
                if (req.method === 'POST') action = 'create';
                if (req.method === 'PUT' || req.method === 'PATCH') action = 'update';
                if (req.method === 'DELETE') action = 'delete';

                // Skip logging 'read' actions to save space
                if (action !== 'read' && req.user && (res.statusCode >= 200 && res.statusCode < 300)) {
                    const details = {
                        method: req.method,
                        url: req.originalUrl,
                        body: req.body ? Object.keys(req.body) : [] // Log keys only for privacy
                    };
                    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
                    
                    // Asynchronous logging
                    module.exports.log(req.user.id, Object.keys(req.user).length > 0 ? (req.user.name || req.user.email) : 'System', resource, action, details, ip)
                        .catch(err => console.error('[Audit Log Error]', err));
                }
                
                return originalJson.call(this, body);
            };
            next();
        };
    }
}

module.exports = new AuditService();
