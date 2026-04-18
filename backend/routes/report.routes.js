const express = require('express');
const router = express.Router();
const reportService = require('../services/report-pdf.service');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

// Get all reports
router.get('/', async (req, res) => {
    try {
        const data = await reportService.getReports();
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Generate new report
router.post('/generate', async (req, res) => {
    try {
        const data = await reportService.generateReport(req.body);
        res.json({ success: true, data });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

// Get report data
router.get('/:id', async (req, res) => {
    try {
        const data = await reportService.getReport(req.params.id);
        if (!data) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Get printable HTML report (open in browser → Ctrl+P → PDF)
router.get('/:id/html', async (req, res) => {
    try {
        const html = await reportService.getReportHTML(req.params.id);
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Delete report
router.delete('/:id', async (req, res) => {
    try {
        await reportService.deleteReport(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
