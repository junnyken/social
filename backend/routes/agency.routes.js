const express = require('express');
const router = express.Router();
const dataService = require('../services/data.service');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

function getFeaturesByPlan(plan) {
    const plans = {
        free: ['Basic posting', 'Queue (50 posts)', 'Analytics (basic)', 'UTM builder', 'Single workspace'],
        starter: ['All Free +', 'AI content generation', 'Advanced analytics', 'Link tracking', 'CSV bulk upload', 'Team (3 members)', 'Up to 5 workspaces'],
        pro: ['All Starter +', 'Advanced AI (sentiment, trends)', 'Pixel tracking', 'RSS auto-post', 'Content recycling', 'Team (10 members)', 'Unlimited workspaces', 'API access'],
        agency: ['All Pro +', 'Custom branding', 'White-label option', 'Advanced reporting', 'Dedicated support', 'Team (50 members)', 'Client billing', 'Multi-currency']
    };
    return plans[plan] || plans.free;
}

// ==========================================
// WORKSPACES
// ==========================================
router.get('/workspaces', async (req, res) => {
    try {
        let agencyData = await dataService.read('agency');
        if (!agencyData) {
            agencyData = { workspaces: [], clients: [] };
            // Initialize default personal workspace
            agencyData.workspaces.push({
                id: require('crypto').randomUUID(),
                name: 'Personal',
                type: 'personal',
                owner: req.user.id,
                members: [{ userId: req.user.id, role: 'owner' }],
                settings: {
                    timezone: 'Asia/Ho_Chi_Minh',
                    language: 'vi',
                    theme: 'auto',
                    integrations: { ga4: false, facebook: false, instagram: false }
                },
                plan: 'free',
                maxTeamMembers: 10,
                features: getFeaturesByPlan('free'),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            await dataService.write('agency', agencyData);
        }
        res.json({ success: true, data: agencyData.workspaces });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.post('/workspaces', async (req, res) => {
    try {
        const agencyData = await dataService.read('agency') || { workspaces: [], clients: [] };
        const data = req.body;
        const workspace = {
            id: require('crypto').randomUUID(),
            name: data.name,
            type: data.type || 'team',
            owner: req.user.id,
            members: [{ userId: req.user.id, role: 'owner' }],
            settings: {
                timezone: data.timezone || 'Asia/Ho_Chi_Minh',
                language: 'vi',
                theme: 'auto',
                integrations: {}
            },
            plan: data.plan || 'free',
            maxTeamMembers: data.maxTeamMembers || (data.type === 'agency' ? 50 : 10),
            features: getFeaturesByPlan(data.plan || 'free'),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        agencyData.workspaces.push(workspace);
        await dataService.write('agency', agencyData);
        res.json({ success: true, data: workspace });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.patch('/workspaces/:id', async (req, res) => {
    try {
        const agencyData = await dataService.read('agency') || { workspaces: [], clients: [] };
        const ws = agencyData.workspaces.find(w => w.id === req.params.id);
        if (!ws) return res.status(404).json({ success: false, message: 'Not found' });

        Object.assign(ws, req.body, { updatedAt: new Date().toISOString() });
        await dataService.write('agency', agencyData);
        res.json({ success: true, data: ws });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.delete('/workspaces/:id', async (req, res) => {
    try {
        const agencyData = await dataService.read('agency') || { workspaces: [], clients: [] };
        agencyData.workspaces = agencyData.workspaces.filter(w => w.id !== req.params.id);
        agencyData.clients = agencyData.clients.filter(c => c.workspaceId !== req.params.id);
        await dataService.write('agency', agencyData);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});


// ==========================================
// CLIENTS
// ==========================================
router.get('/clients', async (req, res) => {
    try {
        const agencyData = await dataService.read('agency') || { workspaces: [], clients: [] };
        res.json({ success: true, data: agencyData.clients });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.post('/clients', async (req, res) => {
    try {
        const agencyData = await dataService.read('agency') || { workspaces: [], clients: [] };
        const data = req.body;
        const client = {
            id: require('crypto').randomUUID(),
            workspaceId: data.workspaceId,
            name: data.name,
            industry: data.industry,
            email: data.email,
            phone: data.phone,
            website: data.website,
            socialAccounts: data.socialAccounts || [],
            assignedTo: data.assignedTo || req.user.id,
            status: 'active',
            plan: data.plan || 'free',
            monthlyBudget: data.monthlyBudget || 0,
            notes: data.notes,
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };
        agencyData.clients.push(client);
        await dataService.write('agency', agencyData);
        res.json({ success: true, data: client });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.patch('/clients/:id', async (req, res) => {
    try {
        const agencyData = await dataService.read('agency') || { workspaces: [], clients: [] };
        const client = agencyData.clients.find(c => c.id === req.params.id);
        if (!client) return res.status(404).json({ success: false, message: 'Not found' });

        Object.assign(client, req.body, { lastModified: new Date().toISOString() });
        await dataService.write('agency', agencyData);
        res.json({ success: true, data: client });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.delete('/clients/:id', async (req, res) => {
    try {
        const agencyData = await dataService.read('agency') || { workspaces: [], clients: [] };
        agencyData.clients = agencyData.clients.filter(c => c.id !== req.params.id);
        await dataService.write('agency', agencyData);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;
