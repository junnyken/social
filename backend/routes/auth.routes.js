const express = require('express');
const router = express.Router();
const axios = require('axios');
const config = require('../config');
const cryptoService = require('../services/crypto.service');
const dataService = require('../services/data.service');

// 1. Provide OAuth Login URL (JSON response for fetch)
router.get('/login-url', (req, res) => {
    const stringifiedParams = new URLSearchParams({
        client_id: config.fb.appId || 'MOCK_APP_ID',
        redirect_uri: config.fb.redirectUri,
        scope: config.fb.scopes.join(','),
        response_type: 'code',
        auth_type: 'rerequest',
        display: 'page',
    }).toString();
    
    const fbLoginUrl = `https://www.facebook.com/${config.fb.apiVersion}/dialog/oauth?${stringifiedParams}`;
    res.json({ success: true, loginUrl: fbLoginUrl });
});

// 1b. Direct redirect to FB OAuth (for full-page redirect flow)
router.get('/login', (req, res) => {
    const stringifiedParams = new URLSearchParams({
        client_id: config.fb.appId || 'MOCK_APP_ID',
        redirect_uri: config.fb.redirectUri,
        scope: config.fb.scopes.join(','),
        response_type: 'code',
        auth_type: 'rerequest',
        display: 'page',
    }).toString();
    
    const fbLoginUrl = `https://www.facebook.com/${config.fb.apiVersion}/dialog/oauth?${stringifiedParams}`;
    res.redirect(fbLoginUrl);
});

// 1c. Auth status check
router.get('/status', (req, res) => {
    const sessionId = req.cookies.fbsession;
    if (sessionId) {
        res.json({ success: true, authenticated: true, userId: sessionId });
    } else {
        res.json({ success: true, authenticated: false });
    }
});

// 2. OAuth Callback
router.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.status(400).json({ success: false, message: 'No code provided' });
    }

    try {
        // Mock fallback to prevent crashes if App ID/Secret is missing
        if (!config.fb.appSecret) {
            console.log('[Auth] Using Mock Login flow since no FB_APP_SECRET exists in environment.');
            // Save mock user
            const mockToken = cryptoService.encrypt('mock_fb_access_token_123');
            const mockId = 'mock_user_' + Date.now();
            await dataService.create('accounts', {
                id: mockId,
                name: 'Mock FB User',
                token: mockToken,
                pages: [],
                type: 'Personal Account',
                status: 'connected',
                postsToday: 0,
                successRate: 100
            });
            res.cookie('fbsession', mockId, { httpOnly: true, maxAge: 7 * 24 * 3600000 });
            return res.redirect('/auth-callback.html?status=success');
        }

        // Real Access Token Exchange
        const tokenRes = await axios.get(`https://graph.facebook.com/${config.fb.apiVersion}/oauth/access_token`, {
            params: {
                client_id: config.fb.appId,
                client_secret: config.fb.appSecret,
                redirect_uri: config.fb.redirectUri,
                code,
            }
        });
        const accessToken = tokenRes.data.access_token;

        // Fetch User Info
        const profileRes = await axios.get(`https://graph.facebook.com/${config.fb.apiVersion}/me`, {
            params: { fields: 'id,name,picture.type(large)', access_token: accessToken }
        });
        const userData = profileRes.data;

        // Fetch user pages
        const pagesRes = await axios.get(`https://graph.facebook.com/${config.fb.apiVersion}/me/accounts`, {
            params: { access_token: accessToken }
        });
        const userPages = pagesRes.data.data;

        // Save DB
        const encryptedToken = cryptoService.encrypt(accessToken);
        const existingInfo = await dataService.getById('accounts', userData.id);
        
        let accountPayload = {
            id: userData.id, // Enforce FB id as the document id
            name: userData.name,
            token: encryptedToken,
            picture: userData.picture?.data?.url,
            pages: userPages,
            status: 'connected'
        };

        const allAccounts = await dataService.getAll('accounts');
        if (existingInfo) {
            const idx = allAccounts.findIndex(a => a.id === userData.id);
            allAccounts[idx] = { ...allAccounts[idx], ...accountPayload };
        } else {
            accountPayload.type = 'Personal Account';
            accountPayload.postsToday = 0;
            accountPayload.successRate = 100;
            allAccounts.push(accountPayload);
        }
        await dataService.write('accounts', allAccounts);

        // Security: Set httpOnly cookie
        res.cookie('fbsession', userData.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.redirect('/auth-callback.html?status=success');

    } catch (e) {
        console.error('[OAuth]', e.response?.data || e.message);
        res.redirect('/auth-callback.html?status=error&message=' + encodeURIComponent(e.message || 'OAuth Exchange Error'));
    }
});

// 3. Logout
router.post('/logout', (req, res) => {
    res.clearCookie('fbsession');
    res.json({ success: true });
});

module.exports = router;
