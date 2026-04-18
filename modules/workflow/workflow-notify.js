// ============================================================
// Workflow Notifications — In-app notification system
// ============================================================

let notifications = [];
let unreadCount = 0;
let listeners = [];

export function addNotification(data) {
  const n = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), read: false, ...data };
  notifications.unshift(n);
  notifications = notifications.slice(0, 50);
  unreadCount++;
  notify();
  _updateBadge();
  return n;
}

export function markAllRead() { notifications.forEach(n => n.read = true); unreadCount = 0; notify(); _updateBadge(); }
export function markRead(id) { const n = notifications.find(x => x.id === id); if (n && !n.read) { n.read = true; unreadCount = Math.max(0, unreadCount - 1); } notify(); _updateBadge(); }
export function getNotifications() { return [...notifications]; }
export function getUnreadCount() { return unreadCount; }

function _updateBadge() {
  const badge = document.querySelector('#notification-badge');
  if (badge) { badge.textContent = unreadCount || ''; badge.style.display = unreadCount > 0 ? 'flex' : 'none'; }
}

export function renderNotifDropdown(container) {
  const ns = getNotifications();
  container.innerHTML = `
    <div class="notif-header"><h4 style="margin:0;font-size:var(--text-sm)">Thông báo</h4>${unreadCount > 0 ? '<button id="mark-all-read" class="btn btn-ghost btn-sm">Đánh dấu đã đọc</button>' : ''}</div>
    <div class="notif-list">${ns.length === 0 ? '<p style="text-align:center;padding:var(--space-4);font-size:var(--text-xs);color:var(--color-text-muted)">Chưa có thông báo</p>'
      : ns.map(n => `<div class="notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}"><div class="notif-title">${n.title}</div><div class="notif-body">${n.body || ''}</div><div class="notif-time">${_rel(n.timestamp)}</div></div>`).join('')}</div>`;

  container.querySelector('#mark-all-read')?.addEventListener('click', markAllRead);
  container.querySelectorAll('.notif-item').forEach(i => i.addEventListener('click', () => { markRead(i.dataset.id); if (window.location.hash !== '#/workflow') window.location.hash = '#/workflow'; }));
}

function _rel(iso) { const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000); if (m < 1) return 'Vừa xong'; if (m < 60) return m + 'p'; return Math.floor(m / 60) + 'h'; }

export function onNotifUpdate(fn) { listeners.push(fn); }
function notify() { listeners.forEach(fn => fn()); }

// Expose globally for workflow-store
window._workflowNotify = { addNotification };
