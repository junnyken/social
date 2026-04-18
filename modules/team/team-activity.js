// ============================================================
// Team Activity Log Renderer
// ============================================================

import { getActivities } from './team-store.js';

const ICONS = {
  member_added: '➕', member_removed: '➖', role_changed: '🔄',
  post_created: '📝', post_submitted: '📤', post_approved: '✅',
  post_rejected: '❌', post_published: '🚀', media_uploaded: '📁'
};

export function renderActivityLog(container, limit = 20) {
  const acts = getActivities(limit);
  container.innerHTML = acts.length === 0
    ? '<p style="font-size:var(--text-xs);color:var(--color-text-muted);text-align:center;padding:var(--space-4)">Chưa có hoạt động</p>'
    : acts.map(a => `
        <div class="activity-item">
          <div class="activity-icon">${ICONS[a.type] || '•'}</div>
          <div class="activity-body"><span class="activity-actor">${a.actorName || ''}</span> ${a.detail || ''}</div>
          <div class="activity-time">${_rel(a.timestamp)}</div>
        </div>
      `).join('');
}

function _rel(iso) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'Vừa xong';
  if (m < 60) return m + 'p';
  const h = Math.floor(m / 60);
  return h < 24 ? h + 'h' : Math.floor(h / 24) + 'd';
}
