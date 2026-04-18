const express = require('express');
const router = express.Router();
const geminiService = require('../services/gemini.service');
const contactService = require('../services/contact.service');
const inboxService = require('../services/inbox.service');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

// ════════════════════════════════════════════════════════════
// EXISTING ENDPOINTS
// ════════════════════════════════════════════════════════════

// Suggest reply for inbox
router.post('/suggest-reply', async (req, res) => {
    try {
        const { message, contactId } = req.body;
        let contactInfo = {};
        let history = [];

        if (contactId) {
            contactInfo = await contactService.getById(contactId) || {};
            const thread = await inboxService.getConversationThread(contactId);
            history = thread.slice(-5);
        }

        const data = await geminiService.suggestReplies(message, history, contactInfo);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Compose post with AI
router.post('/compose', async (req, res) => {
    try {
        const { topic, platform, tone, brandVoice } = req.body;
        const data = await geminiService.compose(brandVoice, topic, platform, tone);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Repurpose content across platforms
router.post('/repurpose', async (req, res) => {
    try {
        const { text, source, targets } = req.body;
        const data = await geminiService.repurpose(text, source, targets);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Chat with AI
router.post('/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        const data = await geminiService.chat(messages);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: { message: error.message } });
    }
});

// ════════════════════════════════════════════════════════════
// W1: AI BEST TIME TO POST
// ════════════════════════════════════════════════════════════
router.post('/best-time', async (req, res) => {
    try {
        const { engagementData, platform } = req.body;
        const data = await geminiService.analyzeOptimalTimes(engagementData || [], platform || 'facebook');
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ════════════════════════════════════════════════════════════
// W2: AI HASHTAG SUGGESTER
// ════════════════════════════════════════════════════════════
router.post('/hashtags', async (req, res) => {
    try {
        const { content, platform, language } = req.body;
        if (!content) return res.status(400).json({ success: false, message: 'Content is required' });
        const data = await geminiService.suggestHashtags(content, platform, language);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ════════════════════════════════════════════════════════════
// W3: AI AUTO-REPLY & CLASSIFY
// ════════════════════════════════════════════════════════════
router.post('/classify', async (req, res) => {
    try {
        const { message, categories } = req.body;
        if (!message) return res.status(400).json({ success: false, message: 'Message is required' });
        const data = await geminiService.classifyMessage(message, categories);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/auto-reply', async (req, res) => {
    try {
        const { message, conversationHistory, brandVoice } = req.body;
        if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

        // Load saved brand voice if not provided
        const voice = brandVoice || await geminiService.getBrandVoice();
        const data = await geminiService.autoReply(message, conversationHistory || [], voice);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Brand Voice Profile CRUD
router.get('/brand-voice', async (req, res) => {
    try {
        const data = await geminiService.getBrandVoice();
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/brand-voice', async (req, res) => {
    try {
        const data = await geminiService.saveBrandVoice(req.body);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ════════════════════════════════════════════════════════════
// W4: AI CONTENT PERFORMANCE PREDICTOR
// ════════════════════════════════════════════════════════════
router.post('/predict', async (req, res) => {
    try {
        const { content, platform, historicalData } = req.body;
        if (!content) return res.status(400).json({ success: false, message: 'Content is required' });
        const data = await geminiService.predictPerformance(content, platform, historicalData || []);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ════════════════════════════════════════════════════════════
// W5: AI ANALYTICS REPORT GENERATOR
// ════════════════════════════════════════════════════════════
router.post('/report', async (req, res) => {
    try {
        const { analyticsData, period, brandName } = req.body;
        const data = await geminiService.generateReport(analyticsData || {}, period, brandName);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
