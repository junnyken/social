// ============================================================
// Analytics Insights — Facebook/IG Page Insights fetcher
// ============================================================

import { getKPIs } from './analytics-store.js';

/**
 * In production, these would call the backend proxy:
 *   GET /api/proxy/facebook/insights?pageId=xxx&metrics=page_impressions,page_engaged_users&period=day&since=...&until=...
 *
 * For now, returns mock insights matching Facebook Graph API structure.
 */

export async function fetchPageInsights(platform, pageId, metrics, period = 'day', since, until) {
  // Simulate API delay
  await new Promise(r => setTimeout(r, 400 + Math.random() * 300));

  const kpis = getKPIs(platform);

  // Mock: return data shaped like FB Graph API /page/insights response
  return {
    data: metrics.map(metric => ({
      name: metric,
      period,
      values: _generateInsightValues(metric, since, until),
      title: _metricTitles[metric] || metric,
      description: `${metric} data for the given period`,
      id: `${pageId}/insights/${metric}/${period}`
    })),
    paging: {
      previous: null,
      next: null
    }
  };
}

// Facebook Page Insights metrics list
export const FB_METRICS = {
  overview: [
    'page_impressions',
    'page_impressions_unique',
    'page_engaged_users',
    'page_post_engagements',
    'page_fan_adds',
    'page_fan_removes',
    'page_views_total'
  ],
  posts: [
    'page_posts_impressions',
    'page_posts_impressions_unique',
    'post_engaged_users',
    'post_clicks'
  ],
  video: [
    'page_video_views',
    'page_video_complete_views_30s',
    'page_video_view_time'
  ]
};

// Instagram Insights metrics
export const IG_METRICS = {
  account: [
    'impressions',
    'reach',
    'follower_count',
    'profile_views',
    'website_clicks'
  ],
  media: [
    'impressions',
    'reach',
    'engagement',
    'saved',
    'video_views'
  ]
};

const _metricTitles = {
  page_impressions:         'Total Impressions',
  page_impressions_unique:  'Total Reach',
  page_engaged_users:       'People Engaged',
  page_post_engagements:    'Post Engagements',
  page_fan_adds:            'New Page Likes',
  page_fan_removes:         'Page Unlikes',
  page_views_total:         'Page Views',
  impressions:              'Impressions',
  reach:                    'Reach',
  follower_count:           'Followers',
  profile_views:            'Profile Views',
  website_clicks:           'Website Clicks'
};

function _generateInsightValues(metric, since, until) {
  const days = [];
  let cur = since ? new Date(since) : new Date(Date.now() - 30 * 86400000);
  const end = until ? new Date(until) : new Date();

  const baseValues = {
    page_impressions:        { base: 2800, variance: 0.4 },
    page_impressions_unique: { base: 1400, variance: 0.35 },
    page_engaged_users:      { base: 180,  variance: 0.5 },
    page_post_engagements:   { base: 320,  variance: 0.45 },
    page_fan_adds:           { base: 12,   variance: 0.8 },
    page_fan_removes:        { base: 2,    variance: 1.0 },
    page_views_total:        { base: 450,  variance: 0.3 },
    impressions:             { base: 2200, variance: 0.4 },
    reach:                   { base: 1100, variance: 0.35 },
    follower_count:          { base: 8920, variance: 0.01 },
    profile_views:           { base: 120,  variance: 0.5 },
    website_clicks:          { base: 35,   variance: 0.6 }
  };

  const cfg = baseValues[metric] || { base: 100, variance: 0.3 };
  let val = cfg.base;

  while (cur <= end) {
    val = Math.max(0, val + val * (Math.random() - 0.5) * cfg.variance);
    days.push({
      value: Math.round(val),
      end_time: cur.toISOString()
    });
    cur.setDate(cur.getDate() + 1);
  }

  return days;
}

/**
 * Analyze insights data and generate recommendations
 */
export function generateInsightSummary(insightsData) {
  if (!insightsData?.data?.length) return [];

  const summaries = [];

  insightsData.data.forEach(metric => {
    const values = metric.values.map(v => v.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const latest = values[values.length - 1];
    const previous = values[values.length - 2] || avg;
    const change = previous > 0 ? ((latest - previous) / previous * 100).toFixed(1) : 0;

    summaries.push({
      metric: metric.name,
      title: metric.title,
      currentValue: latest,
      average: Math.round(avg),
      change: parseFloat(change),
      trend: parseFloat(change) >= 0 ? 'up' : 'down',
      isGood: parseFloat(change) >= -5
    });
  });

  return summaries;
}
