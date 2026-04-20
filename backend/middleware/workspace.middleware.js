/**
 * Workspace Middleware — Attaches scoped data accessor to req
 * 
 * After auth, this middleware reads the active workspace
 * and provides req.data = dataService.scoped(workspaceId)
 * so all downstream routes automatically filter by workspace.
 */

const dataService = require('../services/data.service');

module.exports = (req, res, next) => {
    // Priority: header > user's active workspace > 'default'
    const headerWs = req.headers['x-workspace-id'];
    const userWs = req.user?.workspaceId;
    const workspaceId = headerWs || userWs || 'default';

    // Store on req for reference
    req.workspaceId = workspaceId;

    // Attach scoped data accessor
    req.data = dataService.scoped(workspaceId);

    next();
};
