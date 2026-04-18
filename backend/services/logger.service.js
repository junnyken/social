const dataService = require('./data.service');

class LoggerService {
    /**
     * Log an activity to the logs.json file
     */
    async log(accountId, target, content, status, req_app = null) {
        const _crypto = require('crypto');
        // Fetch all to apply rotation
        let logs = await dataService.getAll('logs');

        const entry = {
            id: _crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            accountId,
            accountName: accountId, // Can be improved by ref fetching
            action: target.type === 'group' ? 'post_group' : 'post_page',
            target: typeof target === 'string' ? { type: 'page', id: target, name: target } : target,
            content: content.length > 100 ? content.substring(0, 100) + '...' : content,
            status,
            error: status === 'failed' ? 'Error' : null,
            meta: {}
        };

        logs.push(entry);

        // Limit to 10,000 entries (Rotate)
        if (logs.length > 10000) {
            logs = logs.slice(logs.length - 10000);
        }
        await dataService.write('logs', logs);
        
        // Push realtime event if WS is available
        if (req_app) {
            const wss = req_app.get('wss');
            if (wss) {
                // Formatting payload per updated spec
                const payload = {
                    event: status === 'success' ? 'post_done' : 'post_failed',
                    data: { target: entry.target, status, timestamp: entry.timestamp }
                };

                wss.clients.forEach(client => {
                    if (client.readyState === 1) { // OPEN
                        client.send(JSON.stringify(payload));
                    }
                });
            }
        }
        
        return entry;
    }

    async getLogs(page = 1, limit = 50) {
        const logs = await dataService.getAll('logs');
        // Sort descending by timestamp
        logs.sort((a,b) => b.timestamp - a.timestamp);
        const start = (page - 1) * limit;
        return {
            total: logs.length,
            page,
            data: logs.slice(start, start + limit)
        };
    }
}

module.exports = new LoggerService();
