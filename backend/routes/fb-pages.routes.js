const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const dataService = require('../services/data.service');
const fbGraphV2 = require('../services/fb-graph-v2.service');

router.use(requireAuth);

// Helper to extract page access token for the requested page
async function getPageAccessToken(req, res, pageId) {
    const userId = req.user.id;
    const account = await dataService.getById('accounts', userId);
    if (!account) return null;
    
    const page = account.pages?.find(p => p.id === pageId);
    if (!page || !page.access_token) return null;
    
    return page.access_token;
}

// GET /api/v1/fb/pages/:pageId/posts
router.get('/:pageId/posts', async (req, res) => {
    try {
        const { pageId } = req.params;
        const { limit, after } = req.query;
        
        const pageToken = await getPageAccessToken(req, res, pageId);
        if (!pageToken) {
            return res.status(403).json({ success: false, message: 'Page token not found. Connect page first.' });
        }

        const data = await fbGraphV2.getPagePosts(pageToken, pageId, limit, after);
        res.json({ success: true, data });
    } catch (e) {
        console.error('[FB Route] getPosts error:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

// GET /api/v1/fb/pages/:pageId/posts/:postId/insights
router.get('/:pageId/posts/:postId/insights', async (req, res) => {
    try {
        const { pageId, postId } = req.params;
        const pageToken = await getPageAccessToken(req, res, pageId);
        if (!pageToken) {
            return res.status(403).json({ success: false, message: 'Page token not found.' });
        }

        const data = await fbGraphV2.getPostInsights(pageToken, postId);
        res.json({ success: true, data });
    } catch (e) {
        console.error('[FB Route] getPostInsights error:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

// GET /api/v1/fb/pages/:pageId/posts/:postId/comments
router.get('/:pageId/posts/:postId/comments', async (req, res) => {
    try {
        const { pageId, postId } = req.params;
        const { limit } = req.query;
        const pageToken = await getPageAccessToken(req, res, pageId);
        if (!pageToken) {
            return res.status(403).json({ success: false, message: 'Page token not found.' });
        }

        const data = await fbGraphV2.getPostComments(pageToken, postId, limit);
        res.json({ success: true, data });
    } catch (e) {
        console.error('[FB Route] getPostComments error:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

// POST /api/v1/fb/pages/:pageId/comments/:commentId/reply
router.post('/:pageId/comments/:commentId/reply', async (req, res) => {
    try {
        const { pageId, commentId } = req.params;
        const { message } = req.body;
        
        if (!message) return res.status(400).json({ success: false, message: 'Reply message is required' });

        const pageToken = await getPageAccessToken(req, res, pageId);
        if (!pageToken) {
            return res.status(403).json({ success: false, message: 'Page token not found.' });
        }

        const data = await fbGraphV2.replyToComment(pageToken, commentId, message);
        res.json({ success: true, data });
    } catch (e) {
        console.error('[FB Route] replyToComment error:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

const inboxService = require('../services/inbox.service');

// GET /api/v1/fb/pages/:pageId/inbox-sync
router.get('/:pageId/inbox-sync', async (req, res) => {
    try {
        const { pageId } = req.params;
        const pageToken = await getPageAccessToken(req, res, pageId);
        if (!pageToken) {
            return res.status(403).json({ success: false, message: 'Page token not found.' });
        }

        const data = await inboxService.syncFacebookComments(pageToken, pageId);
        res.json({ success: true, data });
    } catch (e) {
        console.error('[FB Route] inbox-sync error:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;
