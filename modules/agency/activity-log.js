/**
 * Activity Log — Audit trail, team activity, notifications
 */

let activityLog = [];
let notifications = [];

export const ACTIVITY_TYPES = {
  POST_CREATED: 'post_created',
  POST_EDITED: 'post_edited',
  POST_PUBLISHED: 'post_published',
  POST_DELETED: 'post_deleted',
  TEAM_INVITED: 'team_invited',
  TEAM_JOINED: 'team_joined',
  TEAM_REMOVED: 'team_removed',
  ROLE_CHANGED: 'role_changed',
  CLIENT_ADDED: 'client_added',
  INTEGRATION_CONNECTED: 'integration_connected',
  WORKSPACE_CREATED: 'workspace_created',
  WORKSPACE_SETTINGS_UPDATED: 'workspace_settings_updated'
};

// ── Log Activity ──────────────────────────────────────────────
export function logActivity(activityData) {
  const activity = {
    id: crypto.randomUUID(),
    type: activityData.type,
    userId: activityData.userId,
    username: activityData.username,
    workspaceId: activityData.workspaceId,
    resourceType: activityData.resourceType,  // post, client, team
    resourceId: activityData.resourceId,
    resourceName: activityData.resourceName,
    action: activityData.action,
    changes: activityData.changes || {},
    metadata: activityData.metadata || {},
    timestamp: new Date().toISOString()
  };

  activityLog.push(activity);

  // Limit history (last 10k events)
  if (activityLog.length > 10000) {
    activityLog = activityLog.slice(-10000);
  }

  return activity;
}

export function getActivityLog(workspaceId, filter = {}, limit = 100) {
  let log = [...activityLog];

  if (workspaceId) {
    log = log.filter(a => a.workspaceId === workspaceId);
  }

  if (filter.userId) {
    log = log.filter(a => a.userId === filter.userId);
  }

  if (filter.type) {
    log = log.filter(a => a.type === filter.type);
  }

  if (filter.resourceType) {
    log = log.filter(a => a.resourceType === filter.resourceType);
  }

  if (filter.dateFrom && filter.dateTo) {
    log = log.filter(a => {
      const d = new Date(a.timestamp);
      return d >= filter.dateFrom && d <= filter.dateTo;
    });
  }

  return log.slice(0, limit);
}

// ── Activity Summary ──────────────────────────────────────────
export function getActivitySummary(workspaceId, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const log = getActivityLog(workspaceId, {
    dateFrom: since,
    dateTo: new Date()
  }, 1000);

  const summary = {
    totalActivities: log.length,
    byType: {},
    byUser: {},
    byResource: {}
  };

  log.forEach(a => {
    summary.byType[a.type] = (summary.byType[a.type] || 0) + 1;
    summary.byUser[a.username] = (summary.byUser[a.username] || 0) + 1;
    summary.byResource[a.resourceType] = (summary.byResource[a.resourceType] || 0) + 1;
  });

  return summary;
}

// ── Notifications ─────────────────────────────────────────────
export function createNotification(notifData) {
  const notif = {
    id: crypto.randomUUID(),
    userId: notifData.userId,
    type: notifData.type,  // mention, comment, approval_needed
    title: notifData.title,
    message: notifData.message,
    resourceId: notifData.resourceId,
    read: false,
    createdAt: new Date().toISOString()
  };

  notifications.push(notif);
  return notif;
}

export function getUserNotifications(userId, unreadOnly = false) {
  let notifs = notifications.filter(n => n.userId === userId);
  if (unreadOnly) {
    notifs = notifs.filter(n => !n.read);
  }
  return notifs.slice(0, 50);
}

export function markNotificationAsRead(notificationId) {
  const notif = notifications.find(n => n.id === notificationId);
  if (notif) notif.read = true;
  return notif;
}

export function markAllNotificationsAsRead(userId) {
  const count = notifications.filter(n => n.userId === userId && !n.read).length;
  notifications
    .filter(n => n.userId === userId && !n.read)
    .forEach(n => n.read = true);
  return { marked: count };
}

export function getUnreadNotificationCount(userId) {
  return notifications.filter(n => n.userId === userId && !n.read).length;
}
