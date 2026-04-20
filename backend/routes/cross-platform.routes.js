const express = require('express');
const router = express.Router();
const dataService = require('../services/data.service');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

// Cross-platform summary
router.get('/summary', async (req, res) => {
    try {
        const logs = await dataService.getAll('logs') || [];
        const campaigns = await dataService.read('bulk_campaigns') || [];
        const experiments = await dataService.read('ab_experiments') || [];

        // Aggregate by platform
        const platformStats = {};
        const supportedPlatforms = ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube'];
        
        supportedPlatforms.forEach(p => {
            const pLogs = logs.filter(l => (l.platform || 'facebook') === p);
            const totalEngagement = pLogs.reduce((s, l) => s + (l.likes || 0) + (l.comments || 0) + (l.shares || 0), 0);
            platformStats[p] = {
                posts: pLogs.length,
                totalEngagement,
                avgEngagement: pLogs.length > 0 ? Math.round(totalEngagement / pLogs.length) : 0,
                totalReach: pLogs.reduce((s, l) => s + (l.reach || 0), 0),
                followers: pLogs.length > 0 ? (pLogs[pLogs.length - 1].followers || 0) : 0,
                connected: pLogs.length > 0
            };
        });

        // Growth trend (last 30 days)
        const now = Date.now();
        const thirtyDaysAgo = now - 30 * 86400000;
        const recentLogs = logs.filter(l => l.createdAt && new Date(l.createdAt).getTime() > thirtyDaysAgo);
        
        const dailyPosts = {};
        recentLogs.forEach(l => {
            const day = l.createdAt?.split('T')[0];
            if (day) dailyPosts[day] = (dailyPosts[day] || 0) + 1;
        });

        // Best performing platform
        const bestPlatform = Object.entries(platformStats)
            .filter(([, s]) => s.posts > 0)
            .sort((a, b) => b[1].avgEngagement - a[1].avgEngagement)[0];

        res.json({
            success: true,
            data: {
                platformStats,
                totalPosts: logs.length,
                totalCampaigns: campaigns.length,
                totalExperiments: experiments.length,
                bestPlatform: bestPlatform ? { name: bestPlatform[0], ...bestPlatform[1] } : null,
                dailyPosts,
                connectedPlatforms: Object.entries(platformStats).filter(([, s]) => s.connected).map(([p]) => p)
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Platform comparison (head-to-head)
router.get('/compare', async (req, res) => {
    try {
        const logs = await dataService.getAll('logs') || [];
        const platforms = (req.query.platforms || 'facebook,instagram').split(',');

        const comparison = {};
        platforms.forEach(p => {
            const pLogs = logs.filter(l => (l.platform || 'facebook') === p);
            const last30 = pLogs.filter(l => l.createdAt && (Date.now() - new Date(l.createdAt).getTime()) < 30 * 86400000);

            comparison[p] = {
                totalPosts: pLogs.length,
                recentPosts: last30.length,
                avgLikes: last30.length > 0 ? Math.round(last30.reduce((s, l) => s + (l.likes || 0), 0) / last30.length) : 0,
                avgComments: last30.length > 0 ? Math.round(last30.reduce((s, l) => s + (l.comments || 0), 0) / last30.length) : 0,
                avgShares: last30.length > 0 ? Math.round(last30.reduce((s, l) => s + (l.shares || 0), 0) / last30.length) : 0,
                avgReach: last30.length > 0 ? Math.round(last30.reduce((s, l) => s + (l.reach || 0), 0) / last30.length) : 0,
                growthRate: 0, // would calculate from historical data
                topPostType: 'image' // would calculate from data
            };
        });

        res.json({ success: true, data: comparison });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// UNIFIED MULTI-PLATFORM PUBLISH
// ═══════════════════════════════════════════════════════════════

// POST /cross-platform/publish — Publish to multiple platforms at once
router.post('/publish', async (req, res) => {
    try {
        const { platforms, content, images, pageId, scheduledAt } = req.body;
        if (!platforms?.length || !content) {
            return res.status(400).json({ success: false, message: 'platforms[] and content are required' });
        }

        const accounts = await dataService.getAll('accounts') || [];
        const account = accounts.find(a => a.id === req.user?.id) || accounts[0];
        if (!account) return res.status(400).json({ success: false, message: 'No account found' });

        const page = (account.pages || []).find(p => p.id === (pageId || account.pages?.[0]?.id));
        if (!page) return res.status(400).json({ success: false, message: 'No page found' });

        const results = {};

        for (const platform of platforms) {
            try {
                switch (platform) {
                    case 'facebook': {
                        const fbGraphV2 = require('../services/fb-graph-v2.service');
                        results.facebook = await fbGraphV2.publishPagePost(page.access_token, page.id, content, images?.[0]);
                        break;
                    }
                    case 'instagram': {
                        const igService = require('../services/instagram.service');
                        const igId = await igService.getIGAccountId(page.access_token, page.id);
                        if (!igId) { results.instagram = { success: false, error: 'No IG Business Account linked' }; break; }
                        if (!images?.length) { results.instagram = { success: false, error: 'Instagram requires at least 1 image' }; break; }
                        if (images.length > 1) {
                            results.instagram = await igService.publishCarousel(page.access_token, igId, images, content);
                        } else {
                            results.instagram = await igService.publishImage(page.access_token, igId, images[0], content);
                        }
                        break;
                    }
                    case 'linkedin': {
                        const liService = require('../services/linkedin.service');
                        const liToken = account.linkedinToken || account.tokens?.linkedin;
                        const authorUrn = account.linkedinUrn || account.tokens?.linkedinUrn;
                        if (!liToken || !authorUrn) { results.linkedin = { success: false, error: 'LinkedIn not connected. Go to Settings → Integrations.' }; break; }
                        if (images?.[0]) {
                            results.linkedin = await liService.publishImagePost(liToken, authorUrn, content, images[0]);
                        } else {
                            results.linkedin = await liService.publishPost(liToken, authorUrn, content);
                        }
                        break;
                    }
                    case 'tiktok': {
                        const ttService = require('../services/tiktok.service');
                        const ttToken = account.tiktokToken || account.tokens?.tiktok;
                        if (!ttToken) { results.tiktok = { success: false, error: 'TikTok not connected. Go to Settings → Integrations.' }; break; }
                        if (!images?.[0]) { results.tiktok = { success: false, error: 'TikTok requires a video URL' }; break; }
                        results.tiktok = await ttService.publishVideo(ttToken, images[0], content);
                        break;
                    }
                    default:
                        results[platform] = { success: false, error: `Platform "${platform}" not supported` };
                }
            } catch (e) {
                results[platform] = { success: false, error: e.message };
            }
        }

        const successCount = Object.values(results).filter(r => r.success).length;
        res.json({
            success: true,
            data: {
                results,
                summary: `Published to ${successCount}/${platforms.length} platforms`,
                publishedAt: new Date().toISOString()
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// GET /cross-platform/accounts — List connected accounts
router.get('/accounts', async (req, res) => {
    try {
        const accounts = await dataService.getAll('accounts') || [];
        const account = accounts.find(a => a.id === req.user?.id) || accounts[0];
        if (!account) return res.json({ success: true, data: [] });

        const connected = [];

        // Facebook Pages
        (account.pages || []).forEach(p => {
            connected.push({
                platform: 'facebook',
                id: p.id,
                name: p.name,
                type: 'page',
                connected: true,
                avatar: `https://graph.facebook.com/${p.id}/picture?type=small`
            });
        });

        // Instagram (auto-detect from FB pages)
        for (const p of (account.pages || [])) {
            try {
                const igService = require('../services/instagram.service');
                const igId = await igService.getIGAccountId(p.access_token, p.id);
                if (igId) {
                    connected.push({
                        platform: 'instagram',
                        id: igId,
                        name: `IG linked to ${p.name}`,
                        type: 'business',
                        connected: true,
                        linkedFBPage: p.id
                    });
                }
            } catch {}
        }

        // LinkedIn
        if (account.linkedinToken || account.tokens?.linkedin) {
            connected.push({
                platform: 'linkedin',
                id: account.linkedinUrn || 'linked',
                name: account.linkedinName || 'LinkedIn Profile',
                type: 'profile',
                connected: true
            });
        }

        // TikTok
        if (account.tiktokToken || account.tokens?.tiktok) {
            connected.push({
                platform: 'tiktok',
                id: 'tiktok',
                name: account.tiktokName || 'TikTok Account',
                type: 'creator',
                connected: true
            });
        }

        res.json({ success: true, data: connected });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;
