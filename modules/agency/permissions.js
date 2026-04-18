/**
 * Permissions — Fine-grained access control
 * Check user can access specific resources
 */
import { getWorkspace } from './workspace-manager.js';
import { ROLE_PERMISSIONS } from './team-roles.js';

export function checkResourceAccess(userId, workspaceId, resource, action) {
  // Get user's role in workspace
  const workspace = getWorkspace(workspaceId);
  if (!workspace) return false;

  const member = workspace.members.find(m => m.userId === userId);
  if (!member) return false;

  // Check permission
  const permission = `${resource}:${action}`;
  const perms = ROLE_PERMISSIONS[member.role];

  return perms ? perms[permission] === true : false;
}

export function canViewPost(userId, postId, workspaceId) {
  return checkResourceAccess(userId, workspaceId, 'content', 'create');
}

export function canEditPost(userId, postId, workspaceId) {
  // Editor can only edit own posts; Admin can edit any
  return checkResourceAccess(userId, workspaceId, 'content', 'edit');
}

export function canDeletePost(userId, postId, workspaceId, postOwnerId) {
  const canDelete = checkResourceAccess(userId, workspaceId, 'content', 'delete');
  // Editors can only delete own posts
  const workspace = getWorkspace(workspaceId);
  const member = workspace.members.find(m => m.userId === userId);

  if (member.role === 'editor' && postOwnerId !== userId) return false;
  return canDelete;
}

export function canPublishPost(userId, workspaceId) {
  return checkResourceAccess(userId, workspaceId, 'content', 'publish');
}

export function canViewAnalytics(userId, workspaceId) {
  return checkResourceAccess(userId, workspaceId, 'analytics', 'view');
}

export function canExportData(userId, workspaceId) {
  return checkResourceAccess(userId, workspaceId, 'analytics', 'export');
}

export function canManageTeam(userId, workspaceId) {
  return checkResourceAccess(userId, workspaceId, 'team', 'invite');
}

export function canManageBilling(userId, workspaceId) {
  return checkResourceAccess(userId, workspaceId, 'workspace', 'billing');
}

export function canManageIntegrations(userId, workspaceId) {
  return checkResourceAccess(userId, workspaceId, 'integrations', 'manage');
}

export function getUserPermissionsInWorkspace(userId, workspaceId) {
  const workspace = getWorkspace(workspaceId);
  if (!workspace) return [];

  const member = workspace.members.find(m => m.userId === userId);
  if (!member) return [];

  const perms = ROLE_PERMISSIONS[member.role];
  return Object.entries(perms || {})
    .filter(([_, allowed]) => allowed)
    .map(([perm, _]) => perm);
}
