const express = require('express');
const router = express.Router();
const listeningService = require('../services/listening.service');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

// ── Keywords CRUD ───────────────────────────────────────────────
router.get('/keywords', async (req, res) => {
    try {
        const keywords = await listeningService.getKeywords();
        res.json({ success: true, data: keywords });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/keywords', async (req, res) => {
    try {
        const { term } = req.body;
        if (!term || !term.trim()) return res.status(400).json({ success: false, error: 'Term is required' });
        const kw = await listeningService.addKeyword(term);
        res.json({ success: true, data: kw });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.delete('/keywords/:id', async (req, res) => {
    try {
        await listeningService.removeKeyword(req.params.id);
        res.json({ success: true, message: 'Keyword removed' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ── Mentions ────────────────────────────────────────────────────
router.get('/mentions', async (req, res) => {
    try {
        const { keyword, sentiment, platform, range } = req.query;
        const mentions = await listeningService.getMentions({ keyword, sentiment, platform, range });
        res.json({ success: true, data: mentions });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post('/mentions', async (req, res) => {
    try {
        const mention = await listeningService.saveMention(req.body);
        res.json({ success: true, data: mention });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ── Sentiment Analytics ─────────────────────────────────────────
router.get('/sentiment/summary', async (req, res) => {
    try {
        const summary = await listeningService.getSentimentSummary();
        res.json({ success: true, data: summary });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

router.get('/sentiment/trends', async (req, res) => {
    try {
        const range = parseInt(req.query.range) || 30;
        const trends = await listeningService.getSentimentTrends(range);
        res.json({ success: true, data: trends });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ── Alerts ──────────────────────────────────────────────────────
router.get('/alerts', async (req, res) => {
    try {
        const alerts = await listeningService.getAlerts();
        res.json({ success: true, data: alerts });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ── Analyze text ────────────────────────────────────────────────
router.post('/analyze', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ success: false, error: 'Text is required' });
        const result = listeningService.analyzeSentiment(text);
        res.json({ success: true, data: result });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;
