const express = require('express');
const router = express.Router();
const auditService = require('../services/audit.service');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

// Get audit logs with filters
router.get('/', async (req, res) => {
    try {
        const filter = {
            userId: req.query.userId,
            action: req.query.action,
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };
        const data = await auditService.getLogs(filter);
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;
