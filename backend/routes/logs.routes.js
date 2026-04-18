const express = require('express');
const router = express.Router();
const loggerService = require('../services/logger.service');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

// Get paginated logs with filters
router.get('/', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const { status, accountId, q } = req.query;
    
    let { data, total } = await loggerService.getLogs(page, limit);
    
    // Process filtering
    if (status && status !== 'all') {
        data = data.filter(log => log.status === status);
    }
    if (accountId && accountId !== 'all') {
        data = data.filter(log => log.account === accountId);
    }
    if (q) {
        const query = q.toLowerCase();
        data = data.filter(log => 
            log.content.toLowerCase().includes(query) || 
            log.target.toLowerCase().includes(query)
        );
    }

    res.json({ success: true, data, total: data.length, page, limit });
});

// Delete specific log
router.delete('/:id', async (req, res) => {
    const dataService = require('../services/data.service');
    await dataService.remove('logs', req.params.id);
    res.json({ success: true, message: 'Log deleted' });
});

module.exports = router;
