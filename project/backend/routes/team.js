const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const { verifyToken, rbacMiddleware } = require('../middleware');

/**
 * POST /api/team/invite
 * Invite team member
 */
router.post('/invite', verifyToken, rbacMiddleware('team:invite'), async (req, res) => {
  try {
    const { email, role, workspaceId } = req.body;

    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Send invitation email
    await sendInvitationEmail(email, workspace, role);

    res.json({ message: 'Invitation sent' });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/team
 * List team members
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const { workspaceId } = req.query;

    const workspace = await Workspace.findById(workspaceId)
      .populate('members.userId', 'name email avatar');

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    res.json(workspace.members);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * PATCH /api/team/:memberId
 * Update member role
 */
router.patch('/:memberId', verifyToken, rbacMiddleware('team:manage_roles'), async (req, res) => {
  try {
    const { role, workspaceId } = req.body;

    const workspace = await Workspace.findById(workspaceId);

    const member = workspace.members.find(m => m.userId.toString() === req.params.memberId);

    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    member.role = role;
    await workspace.save();

    res.json(member);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /api/team/:memberId
 * Remove team member
 */
router.delete('/:memberId', verifyToken, rbacMiddleware('team:remove'), async (req, res) => {
  try {
    const { workspaceId } = req.query;

    const workspace = await Workspace.findById(workspaceId);

    workspace.members = workspace.members.filter(
      m => m.userId.toString() !== req.params.memberId
    );

    await workspace.save();

    res.json({ message: 'Member removed' });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
