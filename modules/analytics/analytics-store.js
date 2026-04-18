// ============================================================
// Analytics Data Store — Metrics, Series, Competitors, Audience
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
        const res = await fetch(`/api/v1/analytics/${endpoint}?range=${range}`);
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


// ── Mock Data Generator ───────────────────────────────────────
function randBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateTimeSeries(days, baseVal, variance = 0.3) {
  let val = baseVal;
  return days.map(date => {
    val = Math.max(0, val + val * (Math.random() - 0.5) * variance);
    return { date, value: Math.round(val) };
  });
}

// ── Platform Stats Store ──────────────────────────────────────
let platformStats = {
  facebook: {
    followers: 12480,
    followersGrowth: +342,
    reach: 45200,
    impressions: 87600,
    engagementRate: 4.2,
    postsCount: 48,
    pageHealthScore: 78
  },
  instagram: {
    followers: 8920,
    followersGrowth: +215,
    reach: 32100,
    impressions: 61400,
    engagementRate: 5.8,
    postsCount: 36,
    pageHealthScore: 84
  },
  twitter: {
    followers: 3240,
    followersGrowth: -18,
    reach: 12400,
    impressions: 28900,
    engagementRate: 1.9,
    postsCount: 92,
    pageHealthScore: 61
  },
  linkedin: {
    followers: 1820,
    followersGrowth: +89,
    reach: 7600,
    impressions: 14200,
    engagementRate: 3.4,
    postsCount: 24,
    pageHealthScore: 72
  }
};

// ── Time Series Cache ─────────────────────────────────────────
let _seriesCache = {};

export function getTimeSeries(platform, metric, days) {
  const key = `${platform}-${metric}-${days.length}`;
  if (_seriesCache[key]) return _seriesCache[key];

  const configs = {
    reach:       { base: platform === 'facebook' ? 1400 : 900, variance: 0.4 },
    impressions: { base: platform === 'facebook' ? 2800 : 1800, variance: 0.35 },
    followers:   { base: 5, variance: 1.2 },
    engagement:  { base: 3.8, variance: 0.25 },
    clicks:      { base: 240, variance: 0.5 },
    saves:       { base: 45, variance: 0.6 }
  };

  const cfg = configs[metric] || { base: 100, variance: 0.3 };
  const series = generateTimeSeries(days, cfg.base, cfg.variance);
  _seriesCache[key] = series;
  return series;
}

export async function getRealKPIs(range = '30d') {
  const data = await fetchAnalyticsAPI('overview', range);
  if (data) return data;
  return null; // fallback signal
}

export function getKPIs(platform = 'all') {
  if (platform === 'all') {
    const totals = Object.values(platformStats).reduce((acc, s) => ({
      followers:       (acc.followers || 0) + s.followers,
      followersGrowth: (acc.followersGrowth || 0) + s.followersGrowth,
      reach:           (acc.reach || 0) + s.reach,
      impressions:     (acc.impressions || 0) + s.impressions,
      postsCount:      (acc.postsCount || 0) + s.postsCount
    }), {});
    totals.engagementRate = 3.8;
    totals.pageHealthScore = 74;
    return totals;
  }
  return platformStats[platform] || {};
}

export function updateKPI(platform, updates) {
  if (platformStats[platform]) {
    Object.assign(platformStats[platform], updates);
  }
}

// ── Post Performance ──────────────────────────────────────────
let _postPerformance = null;

export function getTopPosts(platform = 'all', limit = 10) {
  if (!_postPerformance) {
    _postPerformance = [
      { id: 'p1', platform: 'facebook', content: '🔥 FLASH SALE 50% hôm nay!', type: 'image',
        reach: 8420, impressions: 14200, likes: 342, comments: 87, shares: 156,
        engagementRate: 6.9, publishedAt: '2026-04-14T09:00:00Z' },
      { id: 'p2', platform: 'instagram', content: '✨ Sản phẩm mới ra mắt hôm nay', type: 'carousel',
        reach: 6200, impressions: 9800, likes: 521, comments: 43, shares: 0, saves: 234,
        engagementRate: 8.4, publishedAt: '2026-04-13T18:00:00Z' },
      { id: 'p3', platform: 'facebook', content: '💬 Bạn thích màu nào nhất?', type: 'text',
        reach: 5100, impressions: 7400, likes: 198, comments: 312, shares: 89,
        engagementRate: 11.7, publishedAt: '2026-04-12T12:00:00Z' },
      { id: 'p4', platform: 'linkedin', content: '📢 Case study: tăng 300% doanh thu', type: 'article',
        reach: 3200, impressions: 5600, likes: 187, comments: 34, shares: 92,
        engagementRate: 9.8, publishedAt: '2026-04-11T08:00:00Z' },
      { id: 'p5', platform: 'instagram', content: '🌿 Behind the scenes sản xuất', type: 'video',
        reach: 7800, impressions: 12400, likes: 634, comments: 91, shares: 0, saves: 418,
        engagementRate: 14.7, publishedAt: '2026-04-10T15:00:00Z' },
      { id: 'p6', platform: 'twitter', content: 'Thread: 10 tips marketing không cần budget lớn',
        type: 'text', reach: 4200, impressions: 8900, likes: 287, comments: 64, shares: 198,
        engagementRate: 6.3, publishedAt: '2026-04-09T11:00:00Z' },
      { id: 'p7', platform: 'facebook', content: 'Review từ khách hàng thật 💯', type: 'image',
        reach: 4800, impressions: 7200, likes: 156, comments: 98, shares: 67,
        engagementRate: 6.7, publishedAt: '2026-04-08T10:00:00Z' },
      { id: 'p8', platform: 'instagram', content: 'Giveaway 🎁 Tag 2 bạn bên dưới!', type: 'image',
        reach: 9200, impressions: 15600, likes: 892, comments: 1240, shares: 0, saves: 87,
        engagementRate: 23.6, publishedAt: '2026-04-07T14:00:00Z' }
    ];
  }

  let posts = platform === 'all'
    ? [..._postPerformance]
    : _postPerformance.filter(p => p.platform === platform);

  return posts
    .sort((a, b) => b.engagementRate - a.engagementRate)
    .slice(0, limit);
}

// ── Audience Demographics ─────────────────────────────────────
export function getAudience(platform = 'facebook') {
  return {
    ageGender: [
      { group: '13-17', male: 3,  female: 4  },
      { group: '18-24', male: 18, female: 22 },
      { group: '25-34', male: 24, female: 19 },
      { group: '35-44', male: 12, female: 10 },
      { group: '45-54', male: 5,  female: 4  },
      { group: '55+',   male: 2,  female: 3  }
    ],
    topCities: [
      { city: 'TP. Hồ Chí Minh', pct: 42 },
      { city: 'Hà Nội',          pct: 28 },
      { city: 'Đà Nẵng',         pct: 8  },
      { city: 'Cần Thơ',         pct: 5  },
      { city: 'Khác',            pct: 17 }
    ],
    devices: { mobile: 78, desktop: 18, tablet: 4 },
    peakHours: Array.from({ length: 7 }, (_, day) =>
      Array.from({ length: 24 }, (_, hour) => ({
        day, hour,
        value: (hour >= 7 && hour <= 9)   ? randBetween(50, 80)
             : (hour >= 11 && hour <= 13) ? randBetween(60, 90)
             : (hour >= 18 && hour <= 22) ? randBetween(70, 100)
             : randBetween(5, 30)
      }))
    ).flat()
  };
}

// ── Hashtag Performance ───────────────────────────────────────
export function getHashtagStats(platform = 'all') {
  return [
    { tag: '#flashsale',    reach: 24200, posts: 8,  avgER: 7.2 },
    { tag: '#sale',         reach: 18900, posts: 12, avgER: 5.4 },
    { tag: '#newproduct',   reach: 15400, posts: 6,  avgER: 8.1 },
    { tag: '#giveaway',     reach: 32100, posts: 3,  avgER: 18.4 },
    { tag: '#behindscenes', reach: 12800, posts: 5,  avgER: 11.2 },
    { tag: '#review',       reach: 9400,  posts: 9,  avgER: 6.3 },
    { tag: '#tips',         reach: 8700,  posts: 7,  avgER: 5.9 },
    { tag: '#ootd',         reach: 7200,  posts: 4,  avgER: 9.4 }
  ].sort((a, b) => b.reach - a.reach);
}

// ── Content Type Breakdown ────────────────────────────────────
export function getContentTypeBreakdown(platform = 'all') {
  return [
    { type: 'image',    count: 48, avgER: 6.8,  reach: 168000 },
    { type: 'video',    count: 18, avgER: 12.4, reach: 142000 },
    { type: 'carousel', count: 12, avgER: 9.7,  reach: 97000  },
    { type: 'text',     count: 24, avgER: 4.2,  reach: 72000  },
    { type: 'link',     count: 16, avgER: 3.1,  reach: 48000  },
    { type: 'story',    count: 31, avgER: 8.9,  reach: 124000 }
  ];
}

// ── Competitors ───────────────────────────────────────────────
let competitors = [];

export function addCompetitor(data) {
  const comp = {
    id: crypto.randomUUID(),
    addedAt: new Date().toISOString(),
    ...data
  };

  comp.metrics = {
    followers: randBetween(5000, 80000),
    followersGrowth: randBetween(-50, 500),
    engagementRate: (Math.random() * 8 + 1).toFixed(1),
    postsPerWeek: randBetween(3, 14),
    avgReach: randBetween(2000, 20000),
    avgLikes: randBetween(100, 2000),
    avgComments: randBetween(10, 300)
  };

  const days = getLast30Days();
  comp.followersSeries = generateTimeSeries(days, comp.metrics.followers * 0.97, 0.02);

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
