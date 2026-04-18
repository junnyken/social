const express = require('express');
const router = express.Router();
const dataService = require('../services/data.service');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

// Get pages for the currently authenticated user
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id; // from auth.middleware cookie
        const account = await dataService.getById('accounts', userId);
        
        if (!account) {
            return res.status(404).json({ success: false, message: 'Account session not found in DB' });
        }

        // Return the pages array saved during the OAuth login callback
        res.json({ success: true, data: account.pages || [] });
    } catch (e) {
        console.error('[Pages Route] Error:', e.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Post directly to a Page instead of queuing
router.post('/post', async (req, res) => {
    try {
        const { accountId, pageId, content, images, postNow } = req.body;
        
        // This endpoint only supports immediate posting when postNow is true.
        // Queueing logic is in queue.routes.js
        if (!postNow) {
            return res.status(400).json({ success: false, message: 'postNow must be true. Use /api/v1/queue to schedule posts.' });
        }

        const userId = req.user.id;
        const account = await dataService.getById('accounts', userId);

        if (!account) {
            return res.status(404).json({ success: false, message: 'Account session not found in DB' });
        }

        // Verify account ownership
        if (userId !== accountId) {
            return res.status(403).json({ success: false, message: 'Permission denied for this account ID' });
        }

        // Retrieve decrypted token
        const cryptoService = require('../services/crypto.service');
        const token = cryptoService.decrypt(account.token);

        // Spin content
        const spinner = require('../services/spinner.service');
        const finalContent = spinner.spin(content);

        // Map to fb-graph service (Assuming we update the service to handle images later, Phase 1 just sends text)
        const fbGraph = require('../services/fb-graph.service');
        const result = await fbGraph.publishPost(pageId, finalContent, token, 'page', images);

        const loggerService = require('../services/logger.service');
        if (result.success) {
            await loggerService.log(account.name, pageId, finalContent, 'success', req.app);
            return res.json({ success: true, id: result.id, message: 'Post published successfully' });
        } else {
            await loggerService.log(account.name, pageId, finalContent, 'failed', req.app);
            return res.status(500).json({ success: false, message: 'FB Graph Error', error: result.error });
        }

    } catch (e) {
        console.error('[Pages Post] Error:', e.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
