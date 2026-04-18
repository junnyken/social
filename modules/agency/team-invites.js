/**
 * Team Invites — Invite members, manage invitations, onboarding
 */
import { getWorkspace } from './workspace-manager.js';
import { logActivity, ACTIVITY_TYPES } from './activity-log.js';

let pendingInvites = [];
let inviteTokens = new Map();

// ── Send Invitation ───────────────────────────────────────────
export function sendTeamInvite(inviteData) {
  // inviteData: { workspaceId, email, role, invitedBy, message }

  const workspace = getWorkspace(inviteData.workspaceId);
  if (!workspace) return { error: 'Workspace not found' };

  // Check if already member
  if (workspace.members.some(m => m.email === inviteData.email)) {
    return { error: 'User already a member' };
  }

  // Check if already invited
  if (pendingInvites.some(i => i.email === inviteData.email && i.workspaceId === inviteData.workspaceId)) {
    return { error: 'Invitation already sent' };
  }

  const token = generateInviteToken();
  const invite = {
    id: crypto.randomUUID(),
    workspaceId: inviteData.workspaceId,
    email: inviteData.email,
    role: inviteData.role || 'editor',
    invitedBy: inviteData.invitedBy,
    status: 'pending',  // pending, accepted, rejected, expired
    token,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),  // 7 days
    message: inviteData.message,
    createdAt: new Date().toISOString()
  };

  pendingInvites.push(invite);
  inviteTokens.set(token, invite.id);

  // Log activity
  logActivity({
    type: ACTIVITY_TYPES.TEAM_INVITED,
    workspaceId: inviteData.workspaceId,
    userId: inviteData.invitedBy,
    username: 'System',
    resourceType: 'team',
    resourceName: inviteData.email,
    action: 'Invited'
  });

  // In production: send email with accept link
  return {
    success: true,
    invite,
    acceptLink: `/accept-invite/${token}`
  };
}

export function getPendingInvites(workspaceId) {
  return pendingInvites.filter(i => i.workspaceId === workspaceId && i.status === 'pending');
}

export function acceptInvite(token, acceptedBy) {
  const invite = pendingInvites.find(i => i.token === token);
  if (!invite) return { error: 'Invalid token' };

  if (new Date(invite.expiresAt) < new Date()) {
    invite.status = 'expired';
    return { error: 'Invitation expired' };
  }

  const workspace = getWorkspace(invite.workspaceId);
  if (!workspace) return { error: 'Workspace not found' };

  // Add to workspace members
  workspace.members.push({
    userId: acceptedBy,
    email: invite.email,
    role: invite.role,
    joinedAt: new Date().toISOString()
  });

  invite.status = 'accepted';
  invite.acceptedAt = new Date().toISOString();

  logActivity({
    type: ACTIVITY_TYPES.TEAM_JOINED,
    workspaceId: invite.workspaceId,
    userId: acceptedBy,
    username: invite.email,
    resourceType: 'team',
    action: 'Joined'
  });

  return { success: true, workspace };
}

export function rejectInvite(token) {
  const invite = pendingInvites.find(i => i.token === token);
  if (invite) {
    invite.status = 'rejected';
    invite.rejectedAt = new Date().toISOString();
  }
  return invite;
}

export function cancelInvite(inviteId) {
  const invite = pendingInvites.find(i => i.id === inviteId);
  if (invite) {
    invite.status = 'cancelled';
  }
  return invite;
}

export function resendInvite(inviteId) {
  const invite = pendingInvites.find(i => i.id === inviteId);
  if (!invite) return { error: 'Invite not found' };

  invite.token = generateInviteToken();
  invite.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  return { success: true, invite, acceptLink: `/accept-invite/${invite.token}` };
}

// ── Remove Team Member ────────────────────────────────────────
export function removeTeamMember(workspaceId, userId) {
  const workspace = getWorkspace(workspaceId);
  if (!workspace) return { error: 'Workspace not found' };

  const member = workspace.members.find(m => m.userId === userId);
  if (!member) return { error: 'Member not found' };

  workspace.members = workspace.members.filter(m => m.userId !== userId);

  logActivity({
    type: ACTIVITY_TYPES.TEAM_REMOVED,
    workspaceId,
    userId: 'system',
    username: 'System',
    resourceType: 'team',
    resourceName: member.email,
    action: 'Removed'
  });

  return { success: true };
}

// ── Update Member Role ────────────────────────────────────────
export function updateMemberRole(workspaceId, userId, newRole) {
  const workspace = getWorkspace(workspaceId);
  if (!workspace) return { error: 'Workspace not found' };

  const member = workspace.members.find(m => m.userId === userId);
  if (!member) return { error: 'Member not found' };

  const oldRole = member.role;
  member.role = newRole;

  logActivity({
    type: ACTIVITY_TYPES.ROLE_CHANGED,
    workspaceId,
    userId: 'system',
    username: 'System',
    resourceType: 'team',
    resourceName: member.email,
    action: `Role changed from ${oldRole} to ${newRole}`,
    changes: { from: oldRole, to: newRole }
  });

  return { success: true, member };
}

// ── Helper ────────────────────────────────────────────────────
function generateInviteToken() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 32).toUpperCase();
}
