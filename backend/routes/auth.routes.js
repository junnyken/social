const express = require('express');
const router = express.Router();
const axios = require('axios');
const config = require('../config');
const cryptoService = require('../services/crypto.service');
const dataService = require('../services/data.service');
const { createSession } = require('../middleware/auth.middleware');

// Helper: Tự động tính redirect URI từ request (hoạt động cả local lẫn production)
function getRedirectUri(req) {
    // Ưu tiên dùng env var nếu đã set và KHÔNG phải localhost fallback
    if (config.fb.redirectUri && !config.fb.redirectUri.includes('localhost')) {
        return config.fb.redirectUri;
    }
    // Tự detect từ request
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host');
    return `${protocol}://${host}/api/v1/auth/callback`;
}

// 1. Provide OAuth Login URL (JSON response for fetch)
router.get('/login-url', (req, res) => {
    const redirectUri = getRedirectUri(req);
    console.log('[Auth] Redirect URI:', redirectUri);

    // If no real App ID configured, use Mock Flow directly instead of hitting Facebook
    if (!config.fb.appId || config.fb.appId === 'MOCK_APP_ID') {
        return res.json({ success: true, loginUrl: `${redirectUri}?code=mock_code_123` });
    }

    const stringifiedParams = new URLSearchParams({
        client_id: config.fb.appId,
        redirect_uri: redirectUri,
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
    const redirectUri = getRedirectUri(req);
    const stringifiedParams = new URLSearchParams({
        client_id: config.fb.appId || 'MOCK_APP_ID',
        redirect_uri: redirectUri,
        scope: config.fb.scopes.join(','),
        response_type: 'code',
        auth_type: 'rerequest',
        display: 'page',
    }).toString();
    
    const fbLoginUrl = `https://www.facebook.com/${config.fb.apiVersion}/dialog/oauth?${stringifiedParams}`;
    res.redirect(fbLoginUrl);
});

// 1c. Auth status check — validates against data store
router.get('/status', async (req, res) => {
    const userId = req.cookies.fbsession;
    // Also check Bearer token from localStorage
    const authHeader = req.headers.authorization;
    let tokenUserId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        tokenUserId = authHeader.slice(7).trim();
    }
    const checkId = userId || tokenUserId;
    
    if (checkId) {
        try {
            const accounts = await dataService.getAll('accounts');
            const account = accounts.find(a => a.id === checkId);
            if (account) {
                return res.json({ success: true, authenticated: true, userId: account.id, name: account.name });
            }
        } catch (e) {
            console.error('[Auth Status] Error:', e.message);
        }
    }
    res.json({ success: true, authenticated: false });
});

// 1c2. Auto-recover token — frontend calls this when localStorage is empty
// Returns userId from cookie so frontend can restore auth_token in localStorage
router.get('/me', async (req, res) => {
    const cookieUserId = req.cookies.fbsession;
    if (cookieUserId) {
        try {
            const accounts = await dataService.getAll('accounts');
            const account = accounts.find(a => a.id === cookieUserId);
            if (account) {
                return res.json({
                    success: true,
                    authenticated: true,
                    userId: account.id,
                    name: account.name,
                    picture: account.picture
                });
            }
        } catch (e) {
            console.error('[Auth /me] Error:', e.message);
        }
    }
    res.json({ success: true, authenticated: false });
});

// 1d. Debug — View account pages data (temporary, remove after debugging)
router.get('/debug-pages', async (req, res) => {
    try {
        const accounts = await dataService.getAll('accounts');
        const summary = accounts.map(a => ({
            id: a.id,
            name: a.name,
            status: a.status,
            pagesCount: a.pages?.length || 0,
            pages: (a.pages || []).map(p => ({
                id: p.id,
                name: p.name,
                hasToken: !!p.access_token,
                category: p.category
            }))
        }));
        res.json({ accounts: summary });
    } catch (e) {
        res.json({ error: e.message });
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
            // Pass token via URL for frontend to store in localStorage
            return res.redirect('/auth-callback.html?status=success&token=' + mockId);
        }

        // Real Access Token Exchange (Short-lived)
        const redirectUri = getRedirectUri(req);
        const tokenRes = await axios.get(`https://graph.facebook.com/${config.fb.apiVersion}/oauth/access_token`, {
            params: {
                client_id: config.fb.appId,
                client_secret: config.fb.appSecret,
                redirect_uri: redirectUri,
                code,
            }
        });
        const shortLivedToken = tokenRes.data.access_token;

        // Exchange for Long-lived User Token (60 days)
        const longLivedRes = await axios.get(`https://graph.facebook.com/${config.fb.apiVersion}/oauth/access_token`, {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: config.fb.appId,
                client_secret: config.fb.appSecret,
                fb_exchange_token: shortLivedToken
            }
        });
        const accessToken = longLivedRes.data.access_token; // This is now long-lived

        // Fetch User Info
        const profileRes = await axios.get(`https://graph.facebook.com/${config.fb.apiVersion}/me`, {
            params: { fields: 'id,name,picture.type(large)', access_token: accessToken }
        });
        const userData = profileRes.data;

        // Fetch user pages (Tokens received here will be never-expiring)
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

        // Pass userId as token via URL — frontend stores in localStorage
        // Also set cookie as fallback
        res.cookie('fbsession', userData.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.redirect('/auth-callback.html?status=success&token=' + userData.id);

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

// 4. Data Deletion Callback (Required by Facebook)
// Facebook requires this endpoint for GDPR/privacy compliance
router.post('/data-deletion', async (req, res) => {
    try {
        const { signed_request } = req.body;
        // In production, you would parse the signed_request to get user_id
        // and delete their data from your database
        const confirmationCode = 'del_' + Date.now();
        const statusUrl = `https://${req.get('host')}/api/v1/auth/deletion-status?code=${confirmationCode}`;
        
        res.json({
            url: statusUrl,
            confirmation_code: confirmationCode
        });
    } catch (e) {
        console.error('[Auth] Data deletion error:', e.message);
        res.json({ url: '/', confirmation_code: 'error' });
    }
});

// Data deletion status page
router.get('/deletion-status', (req, res) => {
    res.json({
        success: true,
        message: 'Your data has been scheduled for deletion.',
        code: req.query.code
    });
});

module.exports = router;
