/**
 * Scheduler Store — Queue, Drafts, Schedule History
 * In-memory persistence (sandbox-safe)
 */

// Post Status Enum
export const POST_STATUS = {
  DRAFT:     'draft',      // Chưa lên lịch
  SCHEDULED: 'scheduled',  // Đã lên lịch, chờ đăng
  PUBLISHING: 'publishing', // Đang đăng
  PUBLISHED: 'published',  // Đã đăng
  FAILED:    'failed',     // Đăng thất bại
  CANCELLED: 'cancelled'   // Bị hủy
};

// Main Queue
let scheduleQueue = [];
let drafts = [];
let history = [];

// Streaks tracking
let streaks = {
  currentStreak: 0,
  bestStreak: 0,
  postsThisMonth: 0,
  lastPostDate: null,
  consistencyScore: 0
};

// Recycling config
let recycleConfig = {
  enabled: false,
  minER: 5.0,        // Chỉ repost bài có ER > 5%
  interval: 7,       // Repost sau 7 ngày
  maxRecyclePosts: 50 // Tối đa 50 bài trong rotate
};

// ── Queue Management ──────────────────────────────────────────
export function addToQueue(postData) {
  const queueItem = {
    id:        crypto.randomUUID(),
    ...postData,
    status:    POST_STATUS.SCHEDULED,
    createdAt: new Date().toISOString(),
    scheduledAt: postData.scheduledAt,
    retries:   0,
    maxRetries: 3,
    errors:    []
  };

  scheduleQueue.push(queueItem);
  scheduleQueue.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  return queueItem;
}

export function getQueue(platform = null, limit = 50) {
  let queue = [...scheduleQueue];
  if (platform) queue = queue.filter(q => q.platform === platform);
  return queue.slice(0, limit);
}

export function updateQueueItem(id, updates) {
  const item = scheduleQueue.find(q => q.id === id);
  if (item) Object.assign(item, updates);
  return item;
}

export function removeFromQueue(id) {
  scheduleQueue = scheduleQueue.filter(q => q.id !== id);
}

export function moveToFront(id) {
  const item = scheduleQueue.find(q => q.id === id);
  if (item) {
    removeFromQueue(id);
    item.scheduledAt = new Date().toISOString();
    scheduleQueue.unshift(item);
  }
}

export function reschedulePost(id, newTime) {
  const item = updateQueueItem(id, { scheduledAt: newTime.toISOString() });
  scheduleQueue.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  return item;
}

// ── Drafts ───────────────────────────────────────────────────
export function saveDraft(postData) {
  const draft = {
    id:        crypto.randomUUID(),
    ...postData,
    status:    POST_STATUS.DRAFT,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  drafts.push(draft);
  return draft;
}

export function updateDraft(id, updates) {
  const draft = drafts.find(d => d.id === id);
  if (draft) {
    Object.assign(draft, updates, { updatedAt: new Date().toISOString() });
  }
  return draft;
}

export function getDrafts(limit = 30) { return [...drafts].slice(0, limit); }
export function getDraft(id) { return drafts.find(d => d.id === id); }

export function publishDraft(draftId, scheduledAt) {
  const draft = drafts.find(d => d.id === draftId);
  if (!draft) return null;

  const queueItem = addToQueue({
    ...draft,
    scheduledAt,
    draftId
  });

  drafts = drafts.filter(d => d.id !== draftId);
  return queueItem;
}

export function deleteDraft(id) {
  drafts = drafts.filter(d => d.id !== id);
}

// ── Schedule History ─────────────────────────────────────────
export function addToHistory(postData) {
  const historyItem = {
    ...postData,
    status: POST_STATUS.PUBLISHED,
    publishedAt: new Date().toISOString()
  };
  history.unshift(historyItem);
  if (history.length > 500) history = history.slice(0, 500);
  updateStreaks();
  return historyItem;
}

export function getHistory(platform = null, limit = 100) {
  let h = [...history];
  if (platform) h = h.filter(it => it.platform === platform);
  return h.slice(0, limit);
}

export function getHistoryByDate(fromDate, toDate) {
  return history.filter(h => {
    const d = new Date(h.publishedAt);
    return d >= fromDate && d <= toDate;
  });
}

// ── Streaks & Consistency ────────────────────────────────────
function updateStreaks() {
  if (history.length === 0) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let currentStreak = 0;

  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const postsThisDay = history.filter(h => {
      const pd = new Date(h.publishedAt);
      return pd >= dayStart && pd <= dayEnd;
    }).length;

    if (postsThisDay > 0) {
      currentStreak++;
    } else if (i > 0) {
      break;
    }
  }

  streaks.currentStreak = currentStreak;
  streaks.bestStreak = Math.max(streaks.bestStreak, currentStreak);
  streaks.lastPostDate = history[0]?.publishedAt;

  // Consistency score (0-100)
  const thisMonth = history.filter(h => {
    const d = new Date(h.publishedAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  streaks.postsThisMonth = thisMonth;
  streaks.consistencyScore = Math.min(100, Math.round(thisMonth / 20 * 100));
}

export function getStreaks()      { return { ...streaks }; }
export function resetStreakData() { streaks = { currentStreak: 0, bestStreak: 0, postsThisMonth: 0, lastPostDate: null, consistencyScore: 0 }; }

// ── Recycling Config ──────────────────────────────────────────
export function getRecycleConfig()           { return { ...recycleConfig }; }
export function updateRecycleConfig(updates) { Object.assign(recycleConfig, updates); }

// ── Bulk Queue Operations ─────────────────────────────────────
export function bulkAddToQueue(posts) {
  const added = posts.map(p => addToQueue(p));
  scheduleQueue.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  return added;
}

export function bulkSchedule(items, startTime, interval = 24) {
  // items = [{text, platform, ...}, ...]
  // interval = hours between posts
  const scheduled = [];
  let currentTime = new Date(startTime);

  items.forEach(item => {
    const q = addToQueue({
      ...item,
      scheduledAt: currentTime.toISOString()
    });
    scheduled.push(q);
    currentTime.setHours(currentTime.getHours() + interval);
  });

  return scheduled;
}

export function getNextPostTime(platform = null) {
  const queue = getQueue(platform);
  return queue.length > 0 ? new Date(queue[0].scheduledAt) : null;
}

export function getQueueStats() {
  return {
    totalScheduled: scheduleQueue.length,
    byPlatform: {
      facebook:  scheduleQueue.filter(q => q.platform === 'facebook').length,
      instagram: scheduleQueue.filter(q => q.platform === 'instagram').length,
      twitter:   scheduleQueue.filter(q => q.platform === 'twitter').length,
      linkedin:  scheduleQueue.filter(q => q.platform === 'linkedin').length
    },
    nextPostIn: getNextPostTime() ? Math.ceil((getNextPostTime() - new Date()) / 60000) : null
  };
}
