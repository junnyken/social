/**
 * Scheduler Engine — Posting logic, timing, best time calc
 * Demo: không thực sự đăng, chỉ simulate
 */
import { updateQueueItem, addToHistory, POST_STATUS } from './scheduler-store.js';

// ── Simulate Posting ──────────────────────────────────────────
export async function executePost(queueId) {
  try {
    const item = updateQueueItem(queueId, { status: POST_STATUS.PUBLISHING });

    // Backend would do actual posting via API
    // const result = await callBackendAPI('/api/posts/publish', {
    //   method: 'POST',
    //   body: { queueId, platform: item.platform, content: item.text, ... }
    // });

    // Demo: simulate success
    await new Promise(r => setTimeout(r, 1000));

    const posted = updateQueueItem(queueId, { status: POST_STATUS.PUBLISHED });
    addToHistory(posted);

    return {
      success: true,
      postId: item.id,
      url: `https://${item.platform}.com/post/${item.id}`,
      message: `✅ Posted to ${item.platform}`
    };

  } catch (err) {
    // Cannot reach due to mock above, but here for completeness
    const item = updateQueueItem(queueId, { status: POST_STATUS.PUBLISHING }); // gets status, retries later
    const retries = (item.retries || 0) + 1;
    if (retries < item.maxRetries) {
      // Retry sau 5 min
      const retryTime = new Date();
      retryTime.setMinutes(retryTime.getMinutes() + 5);
      updateQueueItem(queueId, {
        retries,
        scheduledAt: retryTime.toISOString(),
        errors: [...(item.errors || []), err.message]
      });
    } else {
      updateQueueItem(queueId, {
        status: POST_STATUS.FAILED,
        errors: [...(item.errors || []), err.message]
      });
    }

    return {
      success: false,
      error: err.message,
      retries
    };
  }
}

// ── Best Time Recommendation ──────────────────────────────────
export function recommendBestTime(platform, dayOfWeek = null, options = {}) {
  // dayOfWeek: 0-6 (Sun-Sat), null = today
  const BEST_TIMES = {
    facebook: {
      weekday:   [{ hour: 9, score: 85 },  { hour: 12, score: 92 }, { hour: 18, score: 88 }],
      weekend:   [{ hour: 11, score: 78 }, { hour: 15, score: 82 }, { hour: 19, score: 80 }]
    },
    instagram: {
      weekday:   [{ hour: 7, score: 88 },  { hour: 12, score: 85 }, { hour: 21, score: 90 }],
      weekend:   [{ hour: 8, score: 80 },  { hour: 13, score: 87 }, { hour: 20, score: 89 }]
    },
    twitter: {
      weekday:   [{ hour: 8, score: 82 },  { hour: 12, score: 80 }, { hour: 17, score: 85 }],
      weekend:   [{ hour: 10, score: 75 }, { hour: 14, score: 72 }, { hour: 19, score: 78 }]
    },
    linkedin: {
      weekday:   [{ hour: 8, score: 90 },  { hour: 10, score: 88 }, { hour: 17, score: 85 }],
      weekend:   [{ hour: 10, score: 70 }, { hour: 14, score: 68 }]
    }
  };

  const times = BEST_TIMES[platform] || BEST_TIMES.facebook;
  const isWeekend = dayOfWeek !== null
    ? (dayOfWeek === 0 || dayOfWeek === 6)
    : new Date().getDay() === 0 || new Date().getDay() === 6;

  const slots = isWeekend ? times.weekend : times.weekday;
  return slots.sort((a, b) => b.score - a.score).slice(0, 3);
}

export function getSmartScheduleTime(platform) {
  const best = recommendBestTime(platform);
  const topSlot = best[0] || { hour: 12, score: 80 };

  const scheduled = new Date();
  scheduled.setHours(topSlot.hour, 0, 0, 0);

  // Nếu giờ đã qua hôm nay, chuyển sang ngày mai
  if (scheduled <= new Date()) {
    scheduled.setDate(scheduled.getDate() + 1);
  }

  return { scheduledAt: scheduled, score: topSlot.score, reason: `Best time on ${platform}` };
}

// ── Smart Queue (dành hàng + đặt hàng tự động) ────────────────
export function getQueueInsights(platform = null) {
  // Dùng AI/heuristic để analyze queue pattern
  // Gợi ý: reorder bài, gap giữa posts, tối ưu timing

  return {
    averageGap: '4 hours',      // Khoảng cách trung bình
    optimalDensity: '3-5 posts/day',
    recommendations: [
      '📌 Có 2 bài cách nhau <1 giờ — nên spacing lại',
      '⏰ 5 bài chung giờ 9-10am — chia đều ra',
      '✅ Timing tổng thể ổn, maintain hiện tại'
    ],
    nextSuggestedTime: '2026-04-20 18:30'
  };
}

// ── Posting Interval Suggestion ───────────────────────────────
export function getSuggestedInterval(platform, baseInterval = 24) {
  // baseInterval = hours (mặc định 24h)
  const PLATFORM_INTERVAL = {
    facebook: 24,    // 1 post/day
    instagram: 24,   // 1 post/day
    twitter: 4,      // Multiple posts/day
    linkedin: 48,    // 1 post/2 days
    tiktok: 12       // 2 posts/day
  };

  return PLATFORM_INTERVAL[platform] || baseInterval;
}

// ── Optimal Posting Pattern ───────────────────────────────────
export function getOptimalPattern(postsPerWeek) {
  // Recommend optimal distribution across week
  // E.g., 5 posts/week = Mon-Fri, skip weekend
  const PATTERNS = {
    1: { days: [2], description: 'Một bài giữa tuần (thứ 3)' },
    2: { days: [2, 4], description: 'Hai bài: thứ 3 & 5' },
    3: { days: [2, 3, 4], description: 'Ba bài liên tiếp giữa tuần' },
    4: { days: [2, 3, 4, 5], description: 'Bốn bài: thứ 3-6' },
    5: { days: [1, 2, 3, 4, 5], description: 'Năm bài: thứ 2-6 (Né Thứ Bảy/Chủ Nhật)' },
    7: { days: [0, 1, 2, 3, 4, 5, 6], description: 'Mỗi ngày một bài' }
  };

  return PATTERNS[postsPerWeek] || PATTERNS[7];
}

// ── Schedule Optimization ─────────────────────────────────────
export function optimizeSchedule(queue, options = {}) {
  // options: { targetGap: 24, avoidWeekends: true, preferredHours: [8, 9, 10, 17] }
  const optimized = [];
  let currentTime = options.startTime ? new Date(options.startTime) : new Date();

  queue.forEach((item, i) => {
    // Skip weekends if requested
    while (options.avoidWeekends && (currentTime.getDay() === 0 || currentTime.getDay() === 6)) {
      currentTime.setDate(currentTime.getDate() + 1);
    }

    // Set to preferred hour
    if (options.preferredHours && options.preferredHours.length > 0) {
      const hour = options.preferredHours[i % options.preferredHours.length];
      currentTime.setHours(hour, 0, 0, 0);
    }

    optimized.push({
      ...item,
      scheduledAt: currentTime.toISOString(),
      originalTime: item.scheduledAt
    });

    // Move to next slot
    currentTime.setHours(currentTime.getHours() + (options.targetGap || 24));
  });

  return optimized;
}
