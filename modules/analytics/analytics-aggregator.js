// ============================================================
// Analytics Aggregator — Thu thập metrics từ tất cả platforms
// ============================================================

import { getConnected, getAllConnected } from '../platforms/platform-registry.js';

export async function fetchAllAnalytics(dateRange = 7) {
  const connected = getAllConnected();
  const results = {};

  await Promise.allSettled(
    connected.map(async (platformId) => {
      try {
        results[platformId] = normalizeMetrics(await fetchPlatformAnalytics(platformId, dateRange), platformId, dateRange);
      } catch (err) {
        results[platformId] = normalizeMetrics(generateMockMetrics(platformId, dateRange), platformId, dateRange);
      }
    })
  );

  // Always provide demo data if nothing connected
  if (Object.keys(results).length === 0) {
    ['facebook', 'instagram', 'twitter', 'linkedin'].forEach(p => {
      results[p] = normalizeMetrics(generateMockMetrics(p, dateRange), p, dateRange);
    });
  }

  return results;
}

async function fetchPlatformAnalytics(platformId, days) {
  const conn = getConnected(platformId);
  if (!conn) return generateMockMetrics(platformId, days);

  // Real API calls would go here per platform
  // For now: mock all
  return generateMockMetrics(platformId, days);
}

function normalizeMetrics(raw, platformId, days) {
  return {
    platform: platformId,
    summary: {
      totalReach: (raw.reach || []).reduce((a, b) => a + b, 0),
      totalEngagement: (raw.engagement || []).reduce((a, b) => a + b, 0),
      newFollowers: (raw.followers?.at(-1) || 0) - (raw.followers?.[0] || 0),
      totalPosts: (raw.postsByDay || []).reduce((a, b) => a + b, 0)
    },
    daily: {
      labels: generateDateLabels(days),
      reach: raw.reach || [],
      engagement: raw.engagement || [],
      followers: raw.followers || [],
      posts: raw.postsByDay || []
    }
  };
}

function generateMockMetrics(platform, days) {
  const base = { facebook: 1200, instagram: 800, twitter: 400, linkedin: 200 }[platform] || 300;
  return {
    reach:      Array.from({ length: days }, () => base + Math.random() * base * 0.5 | 0),
    engagement: Array.from({ length: days }, () => base * 0.05 + Math.random() * 50 | 0),
    followers:  Array.from({ length: days }, (_, i) => 500 + i * 3 + (Math.random() * 10 | 0)),
    postsByDay: Array.from({ length: days }, () => Math.random() * 5 | 0)
  };
}

function generateDateLabels(days) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86400000);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  });
}
