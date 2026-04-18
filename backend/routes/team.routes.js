const express = require('express');
const router = express.Router();
const dataService = require('../services/data.service');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

// Get team data (members, invitations, activities)
router.get('/', async (req, res) => {
    try {
        const teamData = await dataService.read('team') || { members: [], invitations: [], activities: [] };
        // Ensure the creator is in the members list
        if (teamData.members.length === 0) {
            teamData.members.push({
                id: req.user.id,
                name: req.user.name,
                email: req.user.email,
                role: 'owner',
                status: 'active',
                joinedAt: new Date().toISOString(),
                lastActive: new Date().toISOString()
            });
            await dataService.write('team', teamData);
        }
        res.json({ success: true, data: teamData });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Add member
router.post('/members', async (req, res) => {
    try {
        const teamData = await dataService.read('team') || { members: [], invitations: [], activities: [] };
        const newMember = {
            id: require('crypto').randomUUID(),
            status: 'active',
            joinedAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            ...req.body
        };
        teamData.members.push(newMember);

        teamData.activities.unshift({
            id: require('crypto').randomUUID(),
            timestamp: new Date().toISOString(),
            type: 'member_added',
            actorId: req.user.id,
            actorName: req.user.name,
            detail: `thêm ${newMember.name} với role ${newMember.role}`
        });

        await dataService.write('team', teamData);
        res.json({ success: true, data: newMember });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Update member role
router.patch('/members/:id', async (req, res) => {
    try {
        const teamData = await dataService.read('team') || { members: [], invitations: [], activities: [] };
        const member = teamData.members.find(m => m.id === req.params.id);
        if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
        if (member.id === req.user.id) return res.status(400).json({ success: false, message: 'Cannot change own role' });

        const oldRole = member.role;
        member.role = req.body.role;

        teamData.activities.unshift({
            id: require('crypto').randomUUID(),
            timestamp: new Date().toISOString(),
            type: 'role_changed',
            actorId: req.user.id,
            actorName: req.user.name,
            detail: `đổi role ${member.name}: ${oldRole} → ${member.role}`
        });

        await dataService.write('team', teamData);
        res.json({ success: true, data: member });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Remove member
router.delete('/members/:id', async (req, res) => {
    try {
        const teamData = await dataService.read('team') || { members: [], invitations: [], activities: [] };
        const memberIndex = teamData.members.findIndex(m => m.id === req.params.id);
        
        if (memberIndex === -1) return res.status(404).json({ success: false, message: 'Member not found' });
        if (teamData.members[memberIndex].id === req.user.id) return res.status(400).json({ success: false, message: 'Cannot remove self' });

        const member = teamData.members[memberIndex];
        teamData.members.splice(memberIndex, 1);

        teamData.activities.unshift({
            id: require('crypto').randomUUID(),
            timestamp: new Date().toISOString(),
            type: 'member_removed',
            actorId: req.user.id,
            actorName: req.user.name,
            detail: `xóa ${member.name} khỏi team`
        });

        await dataService.write('team', teamData);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Create invitation
router.post('/invitations', async (req, res) => {
    try {
        const teamData = await dataService.read('team') || { members: [], invitations: [], activities: [] };
        const inv = {
            id: require('crypto').randomUUID(),
            email: req.body.email,
            role: req.body.role,
            invitedBy: req.user.id,
            invitedByName: req.user.name,
            token: Math.random().toString(36).slice(2),
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
            status: 'pending'
        };
        teamData.invitations.push(inv);

        await dataService.write('team', teamData);
        res.json({ success: true, data: inv });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Revoke invitation
router.delete('/invitations/:id', async (req, res) => {
    try {
        const teamData = await dataService.read('team') || { members: [], invitations: [], activities: [] };
        teamData.invitations = teamData.invitations.filter(i => i.id !== req.params.id);
        await dataService.write('team', teamData);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;
