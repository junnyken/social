/**
 * Scheduler Store — Queue, Drafts, Schedule History
 * Persistent Backend Sync via /api/v1/queue
 */

// Post Status Enum
export const POST_STATUS = {
  DRAFT:     'draft',      // Chưa lên lịch
  SCHEDULED: 'pending',    // Đã lên lịch, chờ đăng (match backend)
  PUBLISHING: 'processing',// Đang đăng
  PUBLISHED: 'done',       // Đã đăng
  FAILED:    'failed',     // Đăng thất bại
  CANCELLED: 'cancelled'   // Bị hủy
};

// Main Queue (Synced from Backend)
let scheduleQueue = [];
let drafts = [];
let history = [];

// Fetch initial data
export async function syncQueue() {
  try {
    const res = await fetch('/api/v1/queue', {
      headers: { 'Authorization': `Bearer ${window.localStorage.getItem('token') || ''}` }
    });
    const data = await res.json();
    if (data.success) {
      scheduleQueue = data.data.filter(s => ['pending','processing'].includes(s.status));
      history = data.data.filter(s => ['done','failed'].includes(s.status));
    }
  } catch (e) {
    console.error('Error syncing queue', e);
  }
}

// Streaks tracking (simplistic)
let streaks = { currentStreak: 0, bestStreak: 0, postsThisMonth: 0, lastPostDate: null, consistencyScore: 0 };
let recycleConfig = { enabled: false, minER: 5.0, interval: 7, maxRecyclePosts: 50 };

// ── Queue Management ──────────────────────────────────────────
export async function addToQueue(postData) {
  try {
    const res = await fetch('/api/v1/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: 'current_user', // Backend should derive this
        target: { id: postData.pageId || 'mock', type: 'page', name: postData.platform || 'facebook' },
        content: postData.text || postData.content,
        images: postData.images || [],
        scheduledAt: postData.scheduledAt || new Date().toISOString()
      })
    });
    const data = await res.json();
    if (data.success) {
      scheduleQueue.push(data.data);
      scheduleQueue.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
      return data.data;
    }
  } catch (e) {
    console.error('Error adding to queue', e);
  }
}

export function getQueue(platform = null, limit = 50) {
  let queue = [...scheduleQueue];
  if (platform) queue = queue.filter(q => q.target?.name === platform || q.platform === platform);
  return queue.slice(0, limit);
}

export async function updateQueueItem(id, updates) {
  try {
    const res = await fetch(`/api/v1/queue/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (data.success) {
      const idx = scheduleQueue.findIndex(q => q.id === id);
      if (idx > -1) scheduleQueue[idx] = data.data;
      return data.data;
    }
  } catch(e) { console.error('Error updating queue item', e); }
}

export async function removeFromQueue(id) {
  try {
    const res = await fetch(`/api/v1/queue/${id}`, { method: 'DELETE' });
    if ((await res.json()).success) {
      scheduleQueue = scheduleQueue.filter(q => q.id !== id);
    }
  } catch(e) { console.error('Error removing from queue', e); }
}

export async function moveToFront(id) {
  const item = scheduleQueue.find(q => q.id === id);
  if (item) {
    await updateQueueItem(id, { scheduledAt: new Date().toISOString() });
    scheduleQueue.sort((a,b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  }
}

export async function reschedulePost(id, newTime) {
  await updateQueueItem(id, { scheduledAt: newTime.toISOString() });
  scheduleQueue.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
}

// ── Drafts ───────────────────────────────────────────────────
export function saveDraft(postData) {
  const draft = { id: crypto.randomUUID(), ...postData, status: POST_STATUS.DRAFT, updatedAt: new Date().toISOString() };
  drafts.push(draft);
  return draft;
}
export function updateDraft(id, updates) {
  const draft = drafts.find(d => d.id === id);
  if (draft) Object.assign(draft, updates, { updatedAt: new Date().toISOString() });
  return draft;
}
export function getDrafts(limit = 30) { return [...drafts].slice(0, limit); }
export function getDraft(id) { return drafts.find(d => d.id === id); }
export function deleteDraft(id) { drafts = drafts.filter(d => d.id !== id); }

export async function publishDraft(draftId, scheduledAt) {
  const draft = drafts.find(d => d.id === draftId);
  if (!draft) return null;
  const q = await addToQueue({ ...draft, scheduledAt });
  drafts = drafts.filter(d => d.id !== draftId);
  return q;
}

// ── Schedule History ─────────────────────────────────────────
export function addToHistory(postData) {
  // Usually done by Backend
}

export function getHistory(platform = null, limit = 100) {
  let h = [...history];
  if (platform) h = h.filter(it => it.target?.name === platform || it.platform === platform);
  return h.slice(0, limit);
}

export function getHistoryByDate(fromDate, toDate) {
  return history.filter(h => {
    const d = new Date(h.processedAt || h.scheduledAt);
    return d >= fromDate && d <= toDate;
  });
}

// ── Streaks & Consistency ────────────────────────────────────
export function getStreaks() { return { ...streaks }; }
export function resetStreakData() { streaks = { currentStreak: 0, bestStreak: 0, postsThisMonth: 0, lastPostDate: null, consistencyScore: 0 }; }

// ── Recycling Config ──────────────────────────────────────────
export function getRecycleConfig() { return { ...recycleConfig }; }
export function updateRecycleConfig(updates) { Object.assign(recycleConfig, updates); }

// ── Bulk Queue Operations ─────────────────────────────────────
export async function bulkAddToQueue(posts) {
  for (const p of posts) { await addToQueue(p); }
  return scheduleQueue.slice(-posts.length);
}

export async function bulkSchedule(items, startTime, interval = 24) {
  let currentTime = new Date(startTime);
  for (let item of items) {
    await addToQueue({ ...item, scheduledAt: currentTime.toISOString() });
    currentTime.setHours(currentTime.getHours() + interval);
  }
}

export function getNextPostTime(platform = null) {
  const queue = getQueue(platform);
  return queue.length > 0 ? new Date(queue[0].scheduledAt) : null;
}

export function getQueueStats() {
  return {
    totalScheduled: scheduleQueue.length,
    byPlatform: {
      facebook:  scheduleQueue.filter(q => q.target?.name === 'facebook').length,
      instagram: scheduleQueue.filter(q => q.target?.name === 'instagram').length,
    },
    nextPostIn: getNextPostTime() ? Math.ceil((getNextPostTime() - new Date()) / 60000) : null
  };
}

// Auto sync on load if not blocking UI
if (typeof window !== 'undefined') {
  syncQueue();
  setInterval(syncQueue, 30000);
}
