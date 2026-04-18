/**
 * Link Analytics — Track clicks on shortened/tracked links
 * Link shortening + click tracking + referrer data
 */

// Link Store
let trackedLinks = [];
let linkClicks = [];

export function createTrackedLink(linkData) {
  // linkData: { url, campaign, platform, postId, name }

  const link = {
    id: crypto.randomUUID(),
    originalUrl: linkData.url,
    shortCode: generateShortCode(),
    shortUrl: `https://link.social/${generateShortCode()}`,
    campaign: linkData.campaign,
    platform: linkData.platform,
    postId: linkData.postId,
    name: linkData.name || linkData.url.slice(0, 50),
    clicks: 0,
    uniqueClicks: 0,
    createdAt: new Date().toISOString(),
    expiresAt: linkData.expiresAt || null
  };

  trackedLinks.push(link);
  return link;
}

export function getTrackedLinks(filter = null, limit = 50) {
  let links = [...trackedLinks];

  if (filter) {
    if (filter.campaign) {
      links = links.filter(l => l.campaign === filter.campaign);
    }
    if (filter.platform) {
      links = links.filter(l => l.platform === filter.platform);
    }
    if (filter.postId) {
      links = links.filter(l => l.postId === filter.postId);
    }
  }

  return links.slice(0, limit);
}

export function getTrackedLink(id) {
  return trackedLinks.find(l => l.id === id);
}

// ── Track Click ───────────────────────────────────────────────
export function trackLinkClick(linkId, clickData = {}) {
  const link = getTrackedLink(linkId);
  if (!link) return { error: 'Link not found' };

  // Update link stats
  link.clicks++;

  // Track unique (simple: check if IP changed)
  const isUnique = !linkClicks.some(c => 
    c.linkId === linkId && c.ipHash === clickData.ipHash
  );

  if (isUnique) link.uniqueClicks++;

  // Record click
  const click = {
    id: crypto.randomUUID(),
    linkId,
    originalUrl: link.originalUrl,
    shortCode: link.shortCode,
    referrer: clickData.referrer || document.referrer || 'direct',
    userAgent: clickData.userAgent || navigator.userAgent || '',
    ipHash: clickData.ipHash || hashIP(clickData.ip || '0.0.0.0'),
    timestamp: new Date().toISOString(),
    country: clickData.country,
    device: clickData.device,
    browser: clickData.browser
  };

  linkClicks.push(click);

  return {
    link: link,
    click: click,
    redirectUrl: link.originalUrl
  };
}

export function getLinkClicks(linkId, limit = 100) {
  return linkClicks
    .filter(c => c.linkId === linkId)
    .slice(0, limit);
}

// ── Link Analytics ────────────────────────────────────────────
export function getLinkAnalytics(linkId) {
  const link = getTrackedLink(linkId);
  if (!link) return null;

  const clicks = getLinkClicks(linkId);

  // Device breakdown
  const deviceBreakdown = {};
  clicks.forEach(c => {
    const device = c.device || 'unknown';
    deviceBreakdown[device] = (deviceBreakdown[device] || 0) + 1;
  });

  // Browser breakdown
  const browserBreakdown = {};
  clicks.forEach(c => {
    const browser = c.browser || 'unknown';
    browserBreakdown[browser] = (browserBreakdown[browser] || 0) + 1;
  });

  // Country breakdown
  const countryBreakdown = {};
  clicks.forEach(c => {
    const country = c.country || 'Unknown';
    countryBreakdown[country] = (countryBreakdown[country] || 0) + 1;
  });

  // Hourly distribution
  const hourly = new Array(24).fill(0);
  clicks.forEach(c => {
    const hour = new Date(c.timestamp).getHours();
    hourly[hour]++;
  });

  // Click rate (from impressions if available)
  const impressions = link.estimatedImpressions || 1000;
  const ctr = (link.clicks / impressions * 100).toFixed(2);

  return {
    link,
    clicks: link.clicks,
    uniqueClicks: link.uniqueClicks,
    clickRate: `${ctr}%`,
    deviceBreakdown,
    browserBreakdown,
    countryBreakdown,
    hourlyDistribution: hourly,
    topReferrers: getTopReferrers(linkId, 5),
    avgClicksPerDay: (link.clicks / Math.max(1, daysSinceCreation(link.createdAt))).toFixed(2)
  };
}

export function getTopReferrers(linkId, limit = 5) {
  const clicks = getLinkClicks(linkId);
  const referrers = {};

  clicks.forEach(c => {
    const ref = c.referrer || 'direct';
    referrers[ref] = (referrers[ref] || 0) + 1;
  });

  return Object.entries(referrers)
    .sort((a, b) => b - a)[1]
    .slice(0, limit)
    .map(([referrer, count]) => ({ referrer, count }));
}

// ── Bulk Link Creation ────────────────────────────────────────
export function batchCreateTrackedLinks(links) {
  return links.map(link => createTrackedLink(link));
}

// ── Link Performance Comparison ───────────────────────────────
export function compareLinkPerformance(linkIds) {
  return linkIds
    .map(id => {
      const link = getTrackedLink(id);
      if (!link) return null;
      const analytics = getLinkAnalytics(id);
      return {
        ...link,
        ...analytics
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.clicks - a.clicks);
}

// ── Helpers ───────────────────────────────────────────────────
function generateShortCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function hashIP(ip) {
  // Simple hash for privacy (don't store actual IPs)
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = ((hash << 5) - hash) + ip.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

function daysSinceCreation(createdAt) {
  return (Date.now() - new Date(createdAt)) / (1000 * 60 * 60 * 24);
}
