const express = require('express');
const router = express.Router();
const listeningService = require('../services/listening.service');

// Facebook requires verification of the webhook
// GET /api/v1/webhook/facebook
router.get('/facebook', (req, res) => {
    // Parse the query params
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Check if a token and mode is in the query string of the request
    if (mode && token) {
        // Check the mode and token sent is correct
        // In a real app, this verify_token should be an env variable
        if (mode === 'subscribe' && token === 'socialhub') {
            console.log('[Webhook] FACEBOOK_WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
});

// POST /api/v1/webhook/facebook 
// Receives the actual webhook events
router.post('/facebook', async (req, res) => {
    const body = req.body;

    // Check if this is an event from a page subscription
    if (body.object === 'page') {
        body.entry.forEach(async (entry) => {
            // Get the page ID
            const pageId = entry.id;

            // Iterate over each messaging event
            if (entry.messaging) {
                entry.messaging.forEach(msg => {
                    console.log(`[Webhook] Message from Page ${pageId}:`, msg);
                    // Handle message
                });
            }

            // Iterate over each feed changes (mentions, comments)
            if (entry.changes) {
                entry.changes.forEach(async (change) => {
                    console.log(`[Webhook] Change for Page ${pageId}:`, change);
                    if (change.field === 'feed') {
                        const val = change.value;
                        if (val.item === 'comment' || val.item === 'status' || val.item === 'post') {
                            
                            // Generate an alert for Listening module
                            await listeningService.processEvent({
                                platform: 'facebook',
                                type: val.item === 'comment' ? 'comment' : 'mention',
                                sentiment: 'neutral', // AI could analyze this here
                                content: val.message,
                                sourceUrl: val.post_id ? `https://facebook.com/${val.post_id}` : '',
                                author: val.sender_name || 'Facebook User',
                                raw: val
                            });

                        }
                    }
                });
            }
        });

        // Return a '200 OK' response to all requests
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

module.exports = router;
