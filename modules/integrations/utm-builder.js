/**
 * UTM Builder — Generate UTM parameters, manage templates
 * Standardize campaign naming + auto-apply to links
 */

// UTM Naming Conventions Store
let utmTemplates = [
  {
    id: 'default',
    name: 'Default',
    pattern: '{campaign}_{platform}_{content_type}',
    rules: {
      source: '{platform}',      // facebook, instagram, twitter
      medium: 'social',
      campaign: '{campaign_name}',
      content: '{post_id}',
      term: '{target_audience}'  // optional
    },
    isDefault: true
  },
  {
    id: 'seasonal',
    name: 'Seasonal Campaign',
    pattern: 'season_{season}_{platform}',
    rules: {
      source: '{platform}',
      medium: 'social',
      campaign: 'season_{season}',
      content: '{post_id}',
      term: null
    }
  }
];

let utmHistory = [];

// ── UTM Template Management ───────────────────────────────────
export function getUTMTemplates() { return [...utmTemplates]; }

export function addUTMTemplate(template) {
  const newTemplate = {
    id: crypto.randomUUID(),
    ...template,
    createdAt: new Date().toISOString()
  };
  utmTemplates.push(newTemplate);
  return newTemplate;
}

export function updateUTMTemplate(id, updates) {
  const template = utmTemplates.find(t => t.id === id);
  if (template) Object.assign(template, updates);
  return template;
}

export function deleteUTMTemplate(id) {
  if (id === 'default') return false;
  utmTemplates = utmTemplates.filter(t => t.id !== id);
  return true;
}

// ── UTM Parameter Generator ───────────────────────────────────
export function generateUTM(params) {
  // params: {
  //   url, platform, campaign, content_type, post_id,
  //   audience, templateId
  // }

  const template = params.templateId
    ? utmTemplates.find(t => t.id === params.templateId)
    : utmTemplates.find(t => t.isDefault);

  if (!template) return { error: 'Template not found' };

  // Resolve values
  const values = {
    platform: params.platform || '',
    campaign_name: params.campaign || '',
    post_id: params.post_id || '',
    target_audience: params.audience || '',
    content_type: params.content_type || 'post',
    season: getSeason(),
    ...params // Allow overrides
  };

  // Build UTM params
  const utmParams = {};
  Object.entries(template.rules).forEach(([key, pattern]) => {
    if (!pattern) return;
    let value = pattern;

    // Replace {placeholder}
    Object.entries(values).forEach(([k, v]) => {
      value = value.replace(`{${k}}`, v);
    });

    utmParams[`utm_${key}`] = value;
  });

  // Build full URL
  const url = new URL(params.url);
  Object.entries(utmParams).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  const utmUrl = url.toString();
  const utmString = new URLSearchParams(utmParams).toString();

  const record = {
    id: crypto.randomUUID(),
    originalUrl: params.url,
    utmUrl,
    utmParams,
    utmString,
    platform: params.platform,
    campaign: params.campaign,
    templateId: template.id,
    createdAt: new Date().toISOString()
  };

  utmHistory.push(record);

  return record;
}

// ── UTM Shortener (integrate with URL shortener) ───────────────
export function generateShortenedUTM(utmUrl) {
  // In production: call shortener API
  // For demo: simulate TinyURL
  const hash = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `https://short.url/${hash}`;
}

// ── Batch UTM Generation ──────────────────────────────────────
export function batchGenerateUTM(posts, campaign, templateId = null) {
  return posts.map((post, i) => {
    return generateUTM({
      url: post.url || post.link || 'https://example.com',
      platform: post.platform,
      campaign,
      content_type: post.type,
      post_id: post.id,
      audience: post.audience,
      templateId
    });
  });
}

// ── UTM History & Analysis ────────────────────────────────────
export function getUTMHistory(filter = null, limit = 50) {
  let history = [...utmHistory];

  if (filter) {
    if (filter.campaign) {
      history = history.filter(h => h.campaign === filter.campaign);
    }
    if (filter.platform) {
      history = history.filter(h => h.platform === filter.platform);
    }
  }

  return history.slice(0, limit);
}

export function getUTMStats() {
  return {
    totalUTMs: utmHistory.length,
    byPlatform: {
      facebook: utmHistory.filter(h => h.platform === 'facebook').length,
      instagram: utmHistory.filter(h => h.platform === 'instagram').length,
      twitter: utmHistory.filter(h => h.platform === 'twitter').length,
      linkedin: utmHistory.filter(h => h.platform === 'linkedin').length
    },
    byCampaign: Object.fromEntries(
      [...new Set(utmHistory.map(h => h.campaign))].map(c => [
        c,
        utmHistory.filter(h => h.campaign === c).length
      ])
    )
  };
}

// ── UTM Preview ───────────────────────────────────────────────
export function previewUTM(baseUrl, utmParams) {
  const url = new URL(baseUrl);
  Object.entries(utmParams).forEach(([key, value]) => {
    if (value) url.searchParams.set(`utm_${key}`, value);
  });
  return url.toString();
}

// ── Helper: Get Season ────────────────────────────────────────
function getSeason() {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}
