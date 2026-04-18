// ============================================================
// Scheduler — Queue + Delay Engine + Cron Runner
// ============================================================

import { postToPage, postWithImages } from './fb-api.js';
import { spin } from './fb-spinner.js';

// ── In-memory Queue ──────────────────────────────────────────
let queue = [];
let isPaused = false;
let cronTimer = null;

// ── Delay Engine (Anti-ban) ──────────────────────────────────

const DELAY = {
  between_posts: { min: 8,  max: 15 },  // phút
  jitter:        { min: 0,  max: 30 }   // giây
};

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

async function humanDelay() {
  const minutes = randomBetween(DELAY.between_posts.min, DELAY.between_posts.max);
  const jitterSecs = randomBetween(DELAY.jitter.min, DELAY.jitter.max);
  const totalMs = (minutes * 60 + jitterSecs) * 1000;
  await new Promise(r => setTimeout(r, totalMs));
}

// ── Operating Hours ──────────────────────────────────────────

let operatingHours = { start: 7, end: 22 };

function isWithinOperatingHours() {
  const hour = new Date().getHours();
  return hour >= operatingHours.start && hour < operatingHours.end;
}

// ── Daily Cap ────────────────────────────────────────────────

const dailyPostCount = {};
let DAILY_CAP = 20;

function getDailyCount(pageId) {
  const today = new Date().toISOString().split('T')[0];
  if (!dailyPostCount[pageId] || dailyPostCount[pageId].date !== today) {
    dailyPostCount[pageId] = { date: today, count: 0 };
  }
  return dailyPostCount[pageId];
}

function incrementDailyCount(pageId) {
  getDailyCount(pageId).count++;
}

function isCapReached(pageId) {
  return getDailyCount(pageId).count >= DAILY_CAP;
}

// ── Cron Runner ──────────────────────────────────────────────

export function startScheduler(onUpdate) {
  cronTimer = setInterval(() => runCycle(onUpdate), 60 * 1000);
  console.log('[FB Scheduler] Started — checking every 60s');
}

export function stopScheduler() {
  clearInterval(cronTimer);
  cronTimer = null;
}

async function runCycle(onUpdate) {
  if (isPaused) return;
  if (!isWithinOperatingHours()) return;

  const now = new Date();
  const pending = queue.filter(
    t => t.status === 'pending' && new Date(t.scheduledAt) <= now
  );

  for (const task of pending) {
    if (isCapReached(task.pageId)) {
      onUpdate?.({ event: 'daily_cap', pageId: task.pageId });
      continue;
    }

    task.status = 'processing';
    onUpdate?.({ event: 'processing', task });

    try {
      // Spin content trước khi đăng
      const finalContent = spin(task.content);

      // Post lên Facebook
      const result = task.images?.length
        ? await postWithImages(task.pageId, finalContent, task.images)
        : await postToPage(task.pageId, finalContent);

      task.status = 'done';
      task.processedAt = new Date().toISOString();
      task.postId = result.id;

      incrementDailyCount(task.pageId);
      onUpdate?.({ event: 'post_done', task });

    } catch (err) {
      task.retries = (task.retries || 0) + 1;

      if (err.message === 'RATE_LIMITED' || task.retries < task.maxRetries) {
        task.status = 'pending';
        task.scheduledAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      } else {
        task.status = 'failed';
        task.error = err.message;
        task.processedAt = new Date().toISOString();
      }

      onUpdate?.({ event: 'post_failed', task, error: err.message });
    }

    // Delay giữa các bài
    if (pending.indexOf(task) < pending.length - 1) {
      await humanDelay();
    }
  }
}

// ── Public API ───────────────────────────────────────────────

export function addToQueue(pageId, content, images = [], scheduledAt = new Date()) {
  const item = {
    id: crypto.randomUUID(),
    pageId, content, images,
    scheduledAt: scheduledAt instanceof Date ? scheduledAt.toISOString() : scheduledAt,
    status: 'pending',
    retries: 0, maxRetries: 3,
    createdAt: new Date().toISOString(),
    processedAt: null, error: null
  };
  queue.push(item);
  return item;
}

export function removeFromQueue(id) {
  queue = queue.filter(t => t.id !== id);
}

export function getQueue() { return [...queue]; }
export function pauseQueue() { isPaused = true; }
export function resumeQueue() { isPaused = false; }

export function getStatus() {
  return {
    isPaused,
    pendingCount: queue.filter(t => t.status === 'pending').length,
    nextPost: queue.find(t => t.status === 'pending')?.scheduledAt || null
  };
}

export function setOperatingHours(start, end) {
  operatingHours = { start, end };
}

export function setDailyCap(n) {
  DAILY_CAP = n;
}
