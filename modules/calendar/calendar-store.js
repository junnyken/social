// ============================================================
// Calendar Store — Unified with Queue (schedules.json)
// ============================================================

let _posts = [];
const _listeners = [];

export async function syncCalendar() {
  try {
    const res = await fetch('/api/v1/queue', {
      headers: { 'Authorization': `Bearer ${window.localStorage.getItem('token') || ''}` }
    });
    const data = await res.json();
    if (data.success) {
      _posts = data.data.map(q => ({
        id: q.id,
        content: q.content,
        platforms: [q.target?.name || 'facebook'],
        scheduledAt: q.scheduledAt,
        status: q.status,
        createdAt: q.createdAt || new Date().toISOString()
      }));
      _notify();
    }
  } catch (e) {
    console.error('Error syncing calendar', e);
  }
}

export function getCalendarPosts() { return [..._posts]; }

export async function addCalendarPost(post) {
  try {
    const res = await fetch('/api/v1/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: 'current_user',
        target: { id: post.pageId || 'mock', type: 'page', name: post.platforms?.[0] || 'facebook' },
        content: post.content,
        scheduledAt: post.scheduledAt || new Date().toISOString()
      })
    });
    const data = await res.json();
    if (data.success) {
      await syncCalendar();
      return data.data;
    }
  } catch (e) { console.error('Error adding calendar post', e); }
}

export async function updateCalendarPost(id, updates) {
  try {
    const res = await fetch(`/api/v1/queue/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if ((await res.json()).success) {
      await syncCalendar();
    }
  } catch(e) { console.error('Error updating calendar', e); }
}

export async function removeCalendarPost(id) {
  try {
    const res = await fetch(`/api/v1/queue/${id}`, { method: 'DELETE' });
    if ((await res.json()).success) {
      await syncCalendar();
    }
  } catch(e) { console.error('Error removing calendar', e); }
}

export function getPostsByDate(date) {
  const target = new Date(date).toDateString();
  return _posts.filter(p => new Date(p.scheduledAt).toDateString() === target);
}

export function onCalendarUpdate(fn) { _listeners.push(fn); }
function _notify() { _listeners.forEach(fn => fn()); }

export function seedDemoData() {
  // Demo data is now synced from real backend, but we can do an initial fetch
  syncCalendar();
}

if (typeof window !== 'undefined') {
  syncCalendar();
  setInterval(syncCalendar, 30000);
}
