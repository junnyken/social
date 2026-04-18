/**
 * GA4 Tracker — Track social posts, clicks, conversions
 * Events: post_published, link_clicked, conversion_tracked
 */

// GA4 Config
let ga4Config = {
  enabled: false,
  measurementId: '',      // e.g., G-XXXXXXXXXX
  apiSecret: '',          // Backend only
  trackingId: '',         // UA-XXXXXXXXX-X (optional UA fallback)
  propertyId: '',         // GA4 property ID
  isConfigured: false
};

// Event queue (simulate before sending)
let ga4Events = [];

export function configureGA4(config) {
  ga4Config = {
    ...ga4Config,
    ...config,
    enabled: !!(config.measurementId && config.apiSecret),
    isConfigured: true
  };

  // In real app: load gtag script
  if (typeof window !== 'undefined' && !window.gtag) {
    loadGTag();
  }

  return { success: true, message: 'GA4 configured' };
}

export function getGA4Config() {
  return {
    ...ga4Config,
    apiSecret: ga4Config.apiSecret ? '***' : '' // Hide secret
  };
}

function loadGTag() {
  // Script would load: https://www.googletagmanager.com/gtag/js?id=G-XXXXX
  // window.dataLayer = window.dataLayer || [];
  // function gtag(){dataLayer.push(arguments);}
  // gtag('js', new Date());
  // gtag('config', measurementId);

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', ga4Config.measurementId, {
      page_path: window.location.pathname,
      page_title: document.title
    });
  }
}

// ── Event Tracking ────────────────────────────────────────────
export function trackPostPublished(postData) {
  const event = {
    name: 'post_published',
    params: {
      post_id: postData.id,
      platform: postData.platform,
      post_type: postData.type || 'standard',
      character_count: (postData.text || '').length,
      has_media: !!postData.mediaUrl,
      has_link: (postData.text || '').includes('http'),
      scheduled_at: postData.scheduledAt,
      timestamp: new Date().toISOString()
    }
  };

  ga4Events.push(event);

  if (ga4Config.enabled) {
    sendGA4Event(event);
  }

  return event;
}

export function trackLinkClicked(linkData) {
  const event = {
    name: 'link_clicked',
    params: {
      link_id: linkData.id,
      post_id: linkData.postId,
      platform: linkData.platform,
      url: linkData.url,
      utm_source: linkData.utm_source,
      utm_medium: linkData.utm_medium,
      utm_campaign: linkData.utm_campaign,
      timestamp: new Date().toISOString()
    }
  };

  ga4Events.push(event);

  if (ga4Config.enabled) {
    sendGA4Event(event);
  }

  return event;
}

export function trackEngagement(engagementData) {
  const event = {
    name: 'engagement_tracked',
    params: {
      post_id: engagementData.postId,
      platform: engagementData.platform,
      engagement_type: engagementData.type, // view, like, comment, share
      engagement_count: engagementData.count,
      engagement_rate: engagementData.rate,
      timestamp: new Date().toISOString()
    }
  };

  ga4Events.push(event);

  if (ga4Config.enabled) {
    sendGA4Event(event);
  }

  return event;
}

export function trackConversion(conversionData) {
  const event = {
    name: 'conversion_completed',
    params: {
      post_id: conversionData.postId,
      platform: conversionData.platform,
      conversion_type: conversionData.type, // purchase, signup, download
      conversion_value: conversionData.value || 0,
      currency: conversionData.currency || 'VND',
      user_id: conversionData.userId,
      timestamp: new Date().toISOString()
    }
  };

  ga4Events.push(event);

  if (ga4Config.enabled) {
    sendGA4Event(event);
  }

  return event;
}

export function trackABTest(testData) {
  const event = {
    name: 'ab_test_tracked',
    params: {
      test_id: testData.testId,
      variant: testData.variant, // A or B
      post_id: testData.postId,
      performance_metric: testData.metric,
      timestamp: new Date().toISOString()
    }
  };

  ga4Events.push(event);

  if (ga4Config.enabled) {
    sendGA4Event(event);
  }

  return event;
}

// ── Send to GA4 (Mock) ────────────────────────────────────────
async function sendGA4Event(event) {
  // In production: send to GA4 Measurement Protocol
  // POST https://www.google-analytics.com/mp/collect
  // Headers: Content-Type: application/json
  // Body: { client_id, events: [event] }

  console.log(`[GA4] Event sent: ${event.name}`, event.params);

  // Mock response
  return {
    success: true,
    event: event.name,
    timestamp: new Date().toISOString()
  };
}

// ── Event History ─────────────────────────────────────────────
export function getGA4Events(filter = null, limit = 100) {
  let events = [...ga4Events];

  if (filter) {
    if (filter.eventName) {
      events = events.filter(e => e.name === filter.eventName);
    }
    if (filter.postId) {
      events = events.filter(e => e.params.post_id === filter.postId);
    }
    if (filter.platform) {
      events = events.filter(e => e.params.platform === filter.platform);
    }
  }

  return events.slice(0, limit);
}

export function getGA4Stats() {
  const events = ga4Events;

  return {
    totalEvents: events.length,
    eventTypes: {
      post_published: events.filter(e => e.name === 'post_published').length,
      link_clicked: events.filter(e => e.name === 'link_clicked').length,
      engagement_tracked: events.filter(e => e.name === 'engagement_tracked').length,
      conversion_completed: events.filter(e => e.name === 'conversion_completed').length
    },
    totalConversions: events
      .filter(e => e.name === 'conversion_completed')
      .reduce((sum, e) => sum + (e.params.conversion_value || 0), 0),
    totalConversionValue: events
      .filter(e => e.name === 'conversion_completed')
      .reduce((sum, e) => sum + (e.params.conversion_value || 0), 0),
    lastEventAt: events.length > 0 ? events[events.length - 1].params.timestamp : null
  };
}

export function clearGA4Events() {
  ga4Events = [];
}
