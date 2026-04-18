const jwt = require('jsonwebtoken');
const User = require('../models/User');

const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(401).json({ message: 'Invalid token' });
  }
};

const rbacMiddleware = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Get workspace role
      const { workspaceId } = req.query || req.body;
      const workspace = user.workspaces.find(w => w.id === workspaceId);

      if (!workspace) {
        return res.status(403).json({ message: 'Not part of workspace' });
      }

      // Check if role has permission
      const permissions = getPermissionsForRole(workspace.role);

      if (!permissions.includes(requiredPermission)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      req.userRole = workspace.role;
      next();

    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
};

function getPermissionsForRole(role) {
  const rolePermissions = {
    owner: ['*'],  // All permissions
    admin: ['content:create', 'content:edit', 'content:publish', 'team:invite', 'analytics:view'],
    editor: ['content:create', 'content:edit', 'content:publish', 'analytics:view'],
    viewer: ['analytics:view', 'content:view']
  };

  return rolePermissions[role] || [];
}

module.exports = { verifyToken, rbacMiddleware };
