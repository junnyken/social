// ============================================================
// Analytics Data Store — Real API Data (No Demo/Mock)
// ============================================================

// ── Date Range Helpers ────────────────────────────────────────
export function getLast30Days() {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export function getLast7Days() {
  return getLast30Days().slice(-7);
}

export function getDateRange(from, to) {
  const days = [];
  let cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

// ── API Fetch Layer ───────────────────────────────────────────
let apiCache = {};
export async function fetchAnalyticsAPI(endpoint, range) {
    const key = `${endpoint}-${range}`;
    if (apiCache[key]) return apiCache[key];
    try {
        const res = await fetch(`/api/v1/analytics/${endpoint}?range=${range}`, { credentials: 'include' });
        const json = await res.json();
        if (json.success) {
            apiCache[key] = json.data;
            return json.data;
        }
    } catch (e) {
        console.error('Analytics API Fetch Error:', e);
    }
    return null;
}

// ── Fetch Real Dashboard Summary from Enhanced API ────────────
let _cachedSummary = null;

async function fetchDashboardSummary(range = '30d') {
    if (_cachedSummary && _cachedSummary._range === range) return _cachedSummary;
    try {
        const res = await fetch(`/api/v1/analytics-enhanced/dashboard-summary?range=${range}`, { credentials: 'include' });
        const json = await res.json();
        if (json.success && json.data) {
            _cachedSummary = { ...json.data, _range: range };
            return _cachedSummary;
        }
    } catch (e) {
        console.error('[AnalyticsStore] fetchDashboardSummary error:', e);
    }
    return null;
}

// ── KPIs — Fetch from Real API ────────────────────────────────
export async function getRealKPIs(pageId, range = '7d') {
  if (!pageId) return null;
  const rangeDays = range.replace('d', '');
  try {
    const res = await fetch(`/api/v1/insights/${pageId}/overview?range=${rangeDays}`, { credentials: 'include' });
    const data = await res.json();
    if (data.success && data.data) return data.data;
  } catch (error) {
    console.error('getRealKPIs error:', error);
  }
  return null;
}

export function getKPIs(platform = 'all') {
  // Return zeros as default — the renderOverview function will override with real API data
  return {
    followers: 0,
    followersGrowth: 0,
    reach: 0,
    impressions: 0,
    engagementRate: 0,
    postsCount: 0,
    pageHealthScore: 0
  };
}

export function updateKPI(platform, updates) {
  // No-op since we don't maintain local mock state anymore
}

// ── Time Series — From Real API ───────────────────────────────
let _seriesCache = {};

export function getTimeSeries(platform, metric, days) {
  const key = `${platform}-${metric}-${days.length}`;
  if (_seriesCache[key]) return _seriesCache[key];

  // Return empty series — dashboard.view.js uses the enhanced API for charts
  const series = days.map(date => ({ date, value: 0 }));
  _seriesCache[key] = series;
  return series;
}

// ── Post Performance — Fetch from Real API ────────────────────
let _realPostsLoaded = false;
let _postPerformance = [];

async function loadRealPosts() {
  if (_realPostsLoaded) return _postPerformance;
  try {
    const res = await fetch('/api/v1/analytics-enhanced/post-performance?limit=10', { credentials: 'include' });
    const json = await res.json();
    if (json.success && json.data) {
      _postPerformance = json.data.map(p => ({
        id: p.id || p.postId || Math.random().toString(36).slice(2),
        platform: 'facebook',
        content: p.message || p.content || '(Không có nội dung)',
        type: p.type || 'text',
        reach: p.reach || 0,
        impressions: p.impressions || 0,
        likes: p.likes || p.reactions || 0,
        comments: p.comments || 0,
        shares: p.shares || 0,
        engagementRate: p.er || 0,
        publishedAt: p.created_time || p.publishedAt || new Date().toISOString()
      }));
      _realPostsLoaded = true;
    }
  } catch (e) {
    console.error('[AnalyticsStore] loadRealPosts error:', e);
  }
  return _postPerformance;
}

export function getTopPosts(platform = 'all', limit = 10) {
  // Trigger async load if not loaded yet
  if (!_realPostsLoaded) {
    loadRealPosts();
  }

  let posts = platform === 'all'
    ? [..._postPerformance]
    : _postPerformance.filter(p => p.platform === platform);

  return posts
    .sort((a, b) => b.engagementRate - a.engagementRate)
    .slice(0, limit);
}

// ── Audience Demographics — From Real API ─────────────────────
export function getAudience(platform = 'facebook') {
  // Return empty/default structure — in the future, connect to Facebook Audience Insights API
  return {
    ageGender: [
      { group: '13-17', male: 0,  female: 0  },
      { group: '18-24', male: 0, female: 0 },
      { group: '25-34', male: 0, female: 0 },
      { group: '35-44', male: 0, female: 0 },
      { group: '45-54', male: 0,  female: 0  },
      { group: '55+',   male: 0,  female: 0  }
    ],
    topCities: [
      { city: 'Chưa có dữ liệu', pct: 0 }
    ],
    devices: { mobile: 0, desktop: 0, tablet: 0 },
    peakHours: Array.from({ length: 7 }, (_, day) =>
      Array.from({ length: 24 }, (_, hour) => ({
        day, hour, value: 0
      }))
    ).flat()
  };
}

// ── Hashtag Performance — Empty (no demo) ─────────────────────
export function getHashtagStats(platform = 'all') {
  return [];
}

// ── Content Type Breakdown — Empty (no demo) ──────────────────
export function getContentTypeBreakdown(platform = 'all') {
  return [];
}

// ── Competitors ───────────────────────────────────────────────
let competitors = [];

export function addCompetitor(data) {
  const comp = {
    id: crypto.randomUUID(),
    addedAt: new Date().toISOString(),
    ...data,
    metrics: {
      followers: 0,
      followersGrowth: 0,
      engagementRate: 0,
      postsPerWeek: 0,
      avgReach: 0,
      avgLikes: 0,
      avgComments: 0
    }
  };

  const days = getLast30Days();
  comp.followersSeries = days.map(date => ({ date, value: 0 }));

  competitors.push(comp);
  return comp;
}

export function getCompetitors()     { return [...competitors]; }
export function removeCompetitor(id) { competitors = competitors.filter(c => c.id !== id); }

// ── Industry Benchmarks ───────────────────────────────────────
export const INDUSTRY_BENCHMARKS = {
  facebook:  { avgER: 0.9,  goodER: 3.0,  greatER: 6.0 },
  instagram: { avgER: 1.2,  goodER: 4.0,  greatER: 8.0 },
  twitter:   { avgER: 0.5,  goodER: 1.5,  greatER: 3.0 },
  linkedin:  { avgER: 2.0,  goodER: 5.0,  greatER: 10.0 }
};
