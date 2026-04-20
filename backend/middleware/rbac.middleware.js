/**
 * RBAC (Role-Based Access Control) Middleware
 * Role hierarchy: owner > admin > editor > viewer
 * 
 * Permissions Matrix:
 * ┌───────────────┬───────┬───────┬────────┬────────┐
 * │ Action        │ Owner │ Admin │ Editor │ Viewer │
 * ├───────────────┼───────┼───────┼────────┼────────┤
 * │ Publish       │  ✅   │  ✅   │  ✅    │  ❌    │
 * │ Approve       │  ✅   │  ✅   │  ❌    │  ❌    │
 * │ Team Mgmt     │  ✅   │  ✅   │  ❌    │  ❌    │
 * │ Billing       │  ✅   │  ❌   │  ❌    │  ❌    │
 * │ Settings      │  ✅   │  ✅   │  ❌    │  ❌    │
 * │ View Analytics│  ✅   │  ✅   │  ✅    │  ✅    │
 * │ Edit Content  │  ✅   │  ✅   │  ✅    │  ❌    │
 * │ Delete        │  ✅   │  ✅   │  ❌    │  ❌    │
 * └───────────────┴───────┴───────┴────────┴────────┘
 */

const ROLE_LEVELS = {
    owner: 4,
    admin: 3,
    editor: 2,
    viewer: 1
};

const PERMISSIONS = {
    publish:        ['owner', 'admin', 'editor'],
    approve:        ['owner', 'admin'],
    team_manage:    ['owner', 'admin'],
    billing:        ['owner'],
    settings:       ['owner', 'admin'],
    view_analytics: ['owner', 'admin', 'editor', 'viewer'],
    edit_content:   ['owner', 'admin', 'editor'],
    delete:         ['owner', 'admin'],
    manage_clients: ['owner', 'admin'],
    manage_workspace: ['owner'],
    invite_member:  ['owner', 'admin']
};

/**
 * Middleware: Require a specific permission
 * Usage: router.post('/publish', requirePermission('publish'), handler)
 */
function requirePermission(permission) {
    return (req, res, next) => {
        const userRole = req.user?.role || 'viewer';
        const allowed = PERMISSIONS[permission] || [];
        
        if (allowed.includes(userRole)) {
            return next();
        }
        
        return res.status(403).json({
            success: false,
            message: `Bạn không có quyền "${permission}". Cần role: ${allowed.join(' hoặc ')}.`,
            requiredRoles: allowed,
            currentRole: userRole
        });
    };
}

/**
 * Middleware: Require minimum role level
 * Usage: router.post('/teams', requireRole('admin'), handler)
 */
function requireRole(minRole) {
    return (req, res, next) => {
        const userRole = req.user?.role || 'viewer';
        const userLevel = ROLE_LEVELS[userRole] || 0;
        const minLevel = ROLE_LEVELS[minRole] || 0;
        
        if (userLevel >= minLevel) {
            return next();
        }
        
        return res.status(403).json({
            success: false,
            message: `Yêu cầu role tối thiểu: ${minRole}. Role hiện tại: ${userRole}.`,
            requiredRole: minRole,
            currentRole: userRole
        });
    };
}

/**
 * Check if a user has a specific permission (non-middleware, for inline checks)
 */
function hasPermission(role, permission) {
    return (PERMISSIONS[permission] || []).includes(role || 'viewer');
}

/**
 * Check if roleA is higher than roleB
 */
function isHigherRole(roleA, roleB) {
    return (ROLE_LEVELS[roleA] || 0) > (ROLE_LEVELS[roleB] || 0);
}

module.exports = {
    ROLE_LEVELS,
    PERMISSIONS,
    requirePermission,
    requireRole,
    hasPermission,
    isHigherRole
};
