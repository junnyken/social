const express = require('express');
const router = express.Router();
const dataService = require('../services/data.service');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

// Get Library Data (media & templates)
router.get('/', async (req, res) => {
    try {
        const libraryData = await dataService.read('library') || { mediaItems: [], templates: [] };
        
        // Seed default templates if empty
        if (libraryData.templates.length === 0) {
            libraryData.templates = [
                { id: require('crypto').randomUUID(), title: '🔥 Flash Sale', category: 'promotion', platform: 'all', content: '🔥 FLASH SALE {{discount}}% OFF!\n⏰ Chỉ còn {{hours}} giờ!\n🛍️ {{product}} - Giá từ {{price}}\n👉 Order: {{link}}\n#sale #{{brand}}', variables: ['discount','hours','product','price','link','brand'], usageCount: 0, createdAt: new Date().toISOString() },
                { id: require('crypto').randomUUID(), title: '💬 Engagement', category: 'engagement', platform: 'facebook', content: 'Bạn thích {{topic}} như thế nào? 🤔\nComment chia sẻ nhé!\nTag bạn bè cùng trả lời 👇\n#{{brand}}', variables: ['topic','brand'], usageCount: 0, createdAt: new Date().toISOString() }
            ];
            await dataService.write('library', libraryData);
        }

        res.json({ success: true, data: libraryData });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// MEDIA
router.post('/media', async (req, res) => {
    try {
        const libraryData = await dataService.read('library') || { mediaItems: [], templates: [] };
        const media = {
            id: require('crypto').randomUUID(),
            uploadedAt: new Date().toISOString(),
            usageCount: 0,
            tags: [],
            ...req.body
        };
        libraryData.mediaItems.unshift(media);
        await dataService.write('library', libraryData);
        res.json({ success: true, data: media });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.patch('/media/:id', async (req, res) => {
    try {
        const libraryData = await dataService.read('library') || { mediaItems: [], templates: [] };
        const media = libraryData.mediaItems.find(m => m.id === req.params.id);
        if (!media) return res.status(404).json({ success: false, message: 'Not found' });
        
        if (req.body.tags) media.tags = req.body.tags;
        if (req.body.usageCount) media.usageCount = req.body.usageCount;
        
        await dataService.write('library', libraryData);
        res.json({ success: true, data: media });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.delete('/media/:id', async (req, res) => {
    try {
        const libraryData = await dataService.read('library') || { mediaItems: [], templates: [] };
        libraryData.mediaItems = libraryData.mediaItems.filter(m => m.id !== req.params.id);
        await dataService.write('library', libraryData);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// TEMPLATES
router.post('/templates', async (req, res) => {
    try {
        const libraryData = await dataService.read('library') || { mediaItems: [], templates: [] };
        const template = {
            id: require('crypto').randomUUID(),
            createdAt: new Date().toISOString(),
            usageCount: 0,
            platform: 'all',
            category: 'general',
            ...req.body
        };
        libraryData.templates.unshift(template);
        await dataService.write('library', libraryData);
        res.json({ success: true, data: template });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.delete('/templates/:id', async (req, res) => {
    try {
        const libraryData = await dataService.read('library') || { mediaItems: [], templates: [] };
        libraryData.templates = libraryData.templates.filter(t => t.id !== req.params.id);
        await dataService.write('library', libraryData);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;
