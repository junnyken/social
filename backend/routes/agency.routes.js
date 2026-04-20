const express = require('express');
const router = express.Router();
const dataService = require('../services/data.service');
const { requireAuth } = require('../middleware/auth.middleware');
const { requirePermission, requireRole } = require('../middleware/rbac.middleware');

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

router.delete('/clients/:id', requirePermission('manage_clients'), async (req, res) => {
    try {
        const agencyData = await dataService.read('agency') || { workspaces: [], clients: [] };
        agencyData.clients = agencyData.clients.filter(c => c.id !== req.params.id);
        await dataService.write('agency', agencyData);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ==========================================
// WORKSPACE SWITCHING
// ==========================================
router.post('/workspaces/:id/switch', async (req, res) => {
    try {
        const agencyData = await dataService.read('agency') || { workspaces: [], clients: [] };
        const ws = agencyData.workspaces.find(w => w.id === req.params.id);
        if (!ws) return res.status(404).json({ success: false, message: 'Workspace not found' });

        // Check membership
        const isMember = ws.members.some(m => m.userId === req.user.id);
        if (!isMember && ws.owner !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not a member of this workspace' });
        }

        // Save active workspace to user session/account
        const accounts = await dataService.getAll('accounts') || [];
        const account = accounts.find(a => a.id === req.user.id) || accounts[0];
        if (account) {
            await dataService.update('accounts', account.id, { activeWorkspaceId: ws.id });
        }

        // Get user role in this workspace
        const memberInfo = ws.members.find(m => m.userId === req.user.id);
        const role = memberInfo?.role || (ws.owner === req.user.id ? 'owner' : 'viewer');

        res.json({
            success: true,
            data: {
                workspace: ws,
                role,
                features: ws.features
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ==========================================
// AGENCY DASHBOARD (Aggregated Stats)
// ==========================================
router.get('/dashboard', async (req, res) => {
    try {
        const agencyData = await dataService.read('agency') || { workspaces: [], clients: [] };
        const teamData = await dataService.read('team') || { members: [], invitations: [], activities: [] };
        const workflows = await dataService.getAll('workflows') || [];
        const logs = await dataService.getAll('logs') || [];
        const schedules = await dataService.read('schedules') || [];

        // Aggregate stats
        const now = new Date();
        const thirtyDaysAgo = new Date(now - 30 * 86400000);

        const recentLogs = logs.filter(l => l.createdAt && new Date(l.createdAt) > thirtyDaysAgo);
        const pendingApprovals = workflows.filter(w => ['draft', 'review'].includes(w.state));
        const pendingSchedules = (Array.isArray(schedules) ? schedules : []).filter(s => s.status === 'pending');

        // Client health
        const clientHealth = agencyData.clients.map(c => {
            const clientLogs = recentLogs.filter(l => l.clientId === c.id || l.workspaceId === c.workspaceId);
            return {
                id: c.id,
                name: c.name,
                status: c.status,
                postsLast30: clientLogs.length,
                totalEngagement: clientLogs.reduce((s, l) => s + (l.likes || 0) + (l.comments || 0) + (l.shares || 0), 0),
                lastActivity: clientLogs.length ? clientLogs[clientLogs.length - 1].createdAt : c.createdAt
            };
        });

        res.json({
            success: true,
            data: {
                overview: {
                    totalWorkspaces: agencyData.workspaces.length,
                    totalClients: agencyData.clients.length,
                    activeClients: agencyData.clients.filter(c => c.status === 'active').length,
                    totalTeamMembers: teamData.members.length,
                    pendingInvitations: teamData.invitations.filter(i => i.status === 'pending').length,
                    pendingApprovals: pendingApprovals.length,
                    pendingSchedules: pendingSchedules.length,
                    totalPosts30d: recentLogs.length,
                    totalEngagement30d: recentLogs.reduce((s, l) => s + (l.likes || 0) + (l.comments || 0) + (l.shares || 0), 0)
                },
                workspaces: agencyData.workspaces.map(ws => ({
                    id: ws.id,
                    name: ws.name,
                    type: ws.type,
                    plan: ws.plan,
                    memberCount: ws.members?.length || 0
                })),
                recentActivities: (teamData.activities || []).slice(0, 10),
                clientHealth,
                teamMembers: teamData.members.map(m => ({
                    id: m.id,
                    name: m.name,
                    role: m.role,
                    status: m.status,
                    lastActive: m.lastActive
                }))
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;
