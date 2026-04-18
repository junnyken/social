const express = require('express');
const router = express.Router();
const bioService = require('../services/linkinbio.service');
const { requireAuth } = require('../middleware/auth.middleware');

// ═══ PUBLIC ROUTES (no auth) ═══

// View public page
router.get('/p/:slug', async (req, res) => {
    try {
        const page = await bioService.getPageBySlug(req.params.slug);
        if (!page || !page.isPublished) return res.status(404).send('<h1>Page not found</h1>');
        res.setHeader('Content-Type', 'text/html');
        res.send(bioService.renderPublicPage(page));
    } catch (e) { res.status(500).send('Error loading page'); }
});

// Track view (anonymous)
router.post('/view/:slug', async (req, res) => {
    try {
        await bioService.trackView(req.params.slug);
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

// Track click (anonymous)
router.post('/click/:slug/:linkId', async (req, res) => {
    try {
        await bioService.trackClick(req.params.slug, req.params.linkId);
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

// ═══ PROTECTED ROUTES ═══
router.use(requireAuth);

// Get all pages
router.get('/', async (req, res) => {
    try {
        const data = await bioService.getPages();
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Get single page
router.get('/:id', async (req, res) => {
    try {
        const data = await bioService.getPage(req.params.id);
        if (!data) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Create page
router.post('/', async (req, res) => {
    try {
        const data = await bioService.createPage(req.body);
        res.json({ success: true, data });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

// Update page
router.put('/:id', async (req, res) => {
    try {
        const data = await bioService.updatePage(req.params.id, req.body);
        res.json({ success: true, data });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

// Add link
router.post('/:id/links', async (req, res) => {
    try {
        const data = await bioService.addLink(req.params.id, req.body);
        res.json({ success: true, data });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

// Update link
router.put('/:id/links/:linkId', async (req, res) => {
    try {
        const data = await bioService.updateLink(req.params.id, req.params.linkId, req.body);
        res.json({ success: true, data });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

// Remove link
router.delete('/:id/links/:linkId', async (req, res) => {
    try {
        await bioService.removeLink(req.params.id, req.params.linkId);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Reorder links
router.put('/:id/reorder', async (req, res) => {
    try {
        const data = await bioService.reorderLinks(req.params.id, req.body.linkIds);
        res.json({ success: true, data });
    } catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

// Delete page
router.delete('/:id', async (req, res) => {
    try {
        await bioService.deletePage(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
