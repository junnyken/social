/**
 * Team Roles — Role-Based Access Control (RBAC)
 * Owner > Admin > Editor > Viewer
 */

export const ROLES = {
  OWNER: 'owner',      // Full access, manage team, billing
  ADMIN: 'admin',      // Full access except billing
  EDITOR: 'editor',    // Create/edit content, limited settings
  VIEWER: 'viewer'     // Read-only access
};

// Role permissions matrix
export const ROLE_PERMISSIONS = {
  owner: {
    // Workspace
    'workspace:manage': true,
    'workspace:delete': true,
    'workspace:settings': true,
    'workspace:members': true,
    'workspace:billing': true,

    // Team
    'team:invite': true,
    'team:remove': true,
    'team:roles': true,

    // Content
    'content:create': true,
    'content:edit': true,
    'content:delete': true,
    'content:publish': true,

    // Analytics
    'analytics:view': true,
    'analytics:export': true,

    // Clients
    'clients:manage': true,

    // Integrations
    'integrations:manage': true
  },

  admin: {
    'workspace:manage': true,
    'workspace:settings': true,
    'workspace:members': true,
    'workspace:billing': false,
    'workspace:delete': false,

    'team:invite': true,
    'team:remove': true,
    'team:roles': false,

    'content:create': true,
    'content:edit': true,
    'content:delete': true,
    'content:publish': true,

    'analytics:view': true,
    'analytics:export': true,

    'clients:manage': true,

    'integrations:manage': true
  },

  editor: {
    'workspace:manage': false,
    'workspace:settings': false,
    'workspace:members': false,

    'team:invite': false,

    'content:create': true,
    'content:edit': true,
    'content:delete': false,  // Can't delete others' content
    'content:publish': true,

    'analytics:view': true,
    'analytics:export': false,

    'clients:manage': false,

    'integrations:manage': false
  },

  viewer: {
    'workspace:manage': false,
    'workspace:settings': false,
    'workspace:members': false,

    'team:invite': false,

    'content:create': false,
    'content:edit': false,
    'content:delete': false,
    'content:publish': false,

    'analytics:view': true,
    'analytics:export': false,

    'clients:manage': false,

    'integrations:manage': false
  }
};

// ── Check Permissions ─────────────────────────────────────────
export function hasPermission(userRole, permission) {
  const role = ROLE_PERMISSIONS[userRole];
  return role ? role[permission] === true : false;
}

export function canPerformAction(userRole, action) {
  return hasPermission(userRole, action);
}

export function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || {};
}

export function getPermissionsByRole(role) {
  const perms = ROLE_PERMISSIONS[role];
  return perms ? Object.entries(perms)
    .filter(([_, allowed]) => allowed)
    .map(([perm, _]) => perm) : [];
}

// ── Role Hierarchy ────────────────────────────────────────────
export const ROLE_HIERARCHY = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1
};

export function canManageRole(userRole, targetRole) {
  return ROLE_HIERARCHY[userRole] > ROLE_HIERARCHY[targetRole];
}

export function canPromoteRole(userRole, toRole) {
  return canManageRole(userRole, toRole);
}

export function canDemoteRole(userRole, fromRole) {
  return canManageRole(userRole, fromRole);
}

// ── Role Descriptions ─────────────────────────────────────────
export const ROLE_DESCRIPTIONS = {
  owner: 'Full access: manage workspace, team, billing, all features',
  admin: 'Admin access: manage team, content, analytics, integrations',
  editor: 'Editor: create & publish content, view analytics',
  viewer: 'Viewer: read-only access to content & analytics'
};

export const ROLE_LABELS = {
  owner: '👑 Owner',
  admin: '⭐ Admin',
  editor: '✏️ Editor',
  viewer: '👁️ Viewer'
};
