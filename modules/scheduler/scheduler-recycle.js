/**
 * Content Recycling — Tự động repost bài đã posted từ trước
 * Chỉ repost bài có ER cao + không spam
 */
import { getHistory, addToQueue } from './scheduler-store.js';
import { getRecycleConfig } from './scheduler-store.js';

// ── Auto-suggest Recyclable Content ───────────────────────────
export function suggestRecyclableContent(limit = 10) {
  const config = getRecycleConfig();
  const history = getHistory(null, 500);

  // Filter: ER >= minER, posted > 7 days ago
  const recyclable = history.filter(post => {
    const er = post.engagementRate || 0;
    const daysSincePub = (Date.now() - new Date(post.publishedAt)) / (1000 * 60 * 60 * 24);

    return er >= config.minER && daysSincePub >= config.interval;
  });

  // Sort by ER (highest first)
  return recyclable
    .sort((a, b) => (b.engagementRate || 0) - (a.engagementRate || 0))
    .slice(0, limit)
    .map(post => ({
      ...post,
      recycleScore: calculateRecycleScore(post),
      recycleTimes: 0  // Track how many times reposted
    }));
}

function calculateRecycleScore(post) {
  // Score 0-100: based on ER, reach, age
  const er     = (post.engagementRate || 0);
  const reach  = (post.reach || 0) / 1000;  // normalize to K
  const likes  = (post.likes || 0);

  return Math.round(er * 0.5 + Math.min(reach, 20) * 2 + likes * 0.05);
}

// ── Auto Schedule Recycle ─────────────────────────────────────
export function scheduleRecycledContent(sourcePost, interval = 7) {
  if (!sourcePost) return null;

  // Remove old metadata, add recycle marker
  const recycledPost = {
    ...sourcePost,
    id:         crypto.randomUUID(),
    originalId: sourcePost.id,
    isRecycled: true,
    scheduledAt: new Date(Date.now() + interval * 24 * 60 * 60 * 1000).toISOString(),
    // Optional: slight variation (add "Revisit:" prefix, etc.)
    text: sourcePost.text.includes('Revisit:')
      ? sourcePost.text
      : `Revisit: ${sourcePost.text.slice(0, 100)}...`
  };

  return addToQueue(recycledPost);
}

// ── Batch Recycle Setup ───────────────────────────────────────
export function setupAutoRecycle(config) {
  // config: { enabled: true, minER: 5, interval: 7, maxPosts: 50 }
  // Tạo rotation cycle: tự động queue bài cũ
  // In production: sẽ chạy cron job hàng ngày

  if (!config.enabled) return { message: 'Auto-recycle disabled' };

  const recyclable = suggestRecyclableContent(config.maxPosts || 50);
  const scheduled = [];

  recyclable.forEach((post, i) => {
    // Schedule: today + (i * interval days)
    const scheduleTime = new Date();
    scheduleTime.setDate(scheduleTime.getDate() + (i * config.interval));

    const queued = scheduleRecycledContent(post, 0);
    queued.scheduledAt = scheduleTime.toISOString();
    scheduled.push(queued);
  });

  return {
    message: `Scheduled ${scheduled.length} recycled posts`,
    scheduled,
    nextRecycleCheck: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };
}

// ── Recycle Statistics ────────────────────────────────────────
export function getRecycleStats() {
  const recyclable = suggestRecyclableContent(100);
  const avgER = recyclable.length > 0
    ? (recyclable.reduce((s, p) => s + (p.engagementRate || 0), 0) / recyclable.length).toFixed(1)
    : 0;

  return {
    totalRecyclable: recyclable.length,
    topRecyclable: recyclable.slice(0, 5),
    avgER,
    insight: recyclable.length > 0
      ? `${recyclable.length} bài có thể repost (ER avg: ${avgER}%)`
      : 'Chưa đủ bài có ER cao để recycle'
  };
}
