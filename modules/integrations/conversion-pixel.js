/**
 * Conversion Pixel — Facebook, TikTok, Google Ads pixel tracking
 * Track conversions back to social ads
 */

// Pixel Config
let pixels = {
  facebook: { enabled: false, pixelId: '', installed: false },
  tiktok:   { enabled: false, pixelId: '', installed: false },
  google:   { enabled: false, measurementId: '', installed: false }
};

let pixelEvents = [];

// ── Configure Pixels ──────────────────────────────────────────
export function configurePixel(platform, config) {
  if (pixels[platform]) {
    pixels[platform] = {
      ...pixels[platform],
      ...config,
      enabled: !!(config.pixelId || config.measurementId),
      installedAt: new Date().toISOString()
    };

    // In production: load pixel script
    if (typeof window !== 'undefined') {
      installPixelScript(platform, config);
    }

    return { success: true, message: `${platform} pixel configured` };
  }
  return { error: `Platform ${platform} not supported` };
}

export function getPixelConfig(platform) {
  const config = pixels[platform];
  if (!config) return null;

  return {
    ...config,
    pixelId: config.pixelId ? '***' : '', // Hide IDs
    measurementId: config.measurementId ? '***' : ''
  };
}

export function getAllPixels() {
  return Object.entries(pixels).map(([platform, config]) => ({
    platform,
    enabled: config.enabled,
    installed: config.installed
  }));
}

// ── Install Pixel Script ──────────────────────────────────────
function installPixelScript(platform, config) {
  // In real app: inject script tags
  // Facebook: fbq('init', PIXEL_ID)
  // TikTok: ttq.track('PageView')
  // Google: gtag('config', MEASUREMENT_ID)

  pixels[platform].installed = true;
  console.log(`[${platform.toUpperCase()}] Pixel installed`);
}

// ── Track Conversion Events ───────────────────────────────────
export function trackConversionEvent(event) {
  // event: {
  //   type: 'purchase' | 'add_to_cart' | 'signup' | 'download',
  //   value: number,
  //   currency: 'VND' | 'USD',
  //   contentIds: [id1, id2],  // for Facebook
  //   contentName: string,
  //   userId: string
  // }

  const pixelEvent = {
    id: crypto.randomUUID(),
    type: event.type,
    value: event.value || 0,
    currency: event.currency || 'VND',
    contentIds: event.contentIds || [],
    contentName: event.contentName || '',
    userId: event.userId,
    timestamp: new Date().toISOString()
  };

  pixelEvents.push(pixelEvent);

  // Send to active platforms
  if (pixels.facebook.enabled) {
    sendFacebookPixelEvent(pixelEvent);
  }
  if (pixels.tiktok.enabled) {
    sendTikTokPixelEvent(pixelEvent);
  }
  if (pixels.google.enabled) {
    sendGooglePixelEvent(pixelEvent);
  }

  return pixelEvent;
}

// ── Send to Platforms ─────────────────────────────────────────
function sendFacebookPixelEvent(event) {
  // fbq('track', event.type, {
  //   value: event.value,
  //   currency: event.currency,
  //   content_ids: event.contentIds,
  //   content_name: event.contentName
  // });

  console.log('[Facebook] Pixel event tracked:', event.type, event.value);
}

function sendTikTokPixelEvent(event) {
  // ttq.track(event.type, {
  //   value: event.value,
  //   currency: event.currency,
  //   contents: event.contentIds
  // });

  console.log('[TikTok] Pixel event tracked:', event.type, event.value);
}

function sendGooglePixelEvent(event) {
  // gtag('event', 'purchase', {
  //   value: event.value,
  //   currency: event.currency,
  //   items: event.contentIds
  // });

  console.log('[Google] Pixel event tracked:', event.type, event.value);
}

// ── Common Conversion Types ───────────────────────────────────
export const CONVERSION_TYPES = {
  PURCHASE: 'purchase',
  ADD_TO_CART: 'add_to_cart',
  CHECKOUT: 'begin_checkout',
  SIGNUP: 'sign_up',
  DOWNLOAD: 'download',
  LEAD: 'generate_lead',
  VIEW_CONTENT: 'view_content',
  INITIATE_CHECKOUT: 'initiate_checkout'
};

export function trackPurchase(data) {
  return trackConversionEvent({
    type: CONVERSION_TYPES.PURCHASE,
    value: data.value,
    currency: data.currency || 'VND',
    contentIds: data.productIds,
    contentName: data.productName,
    userId: data.userId
  });
}

export function trackSignup(data) {
  return trackConversionEvent({
    type: CONVERSION_TYPES.SIGNUP,
    contentName: data.signupType || 'website_signup',
    userId: data.userId
  });
}

export function trackDownload(data) {
  return trackConversionEvent({
    type: CONVERSION_TYPES.DOWNLOAD,
    contentName: data.fileName || 'resource_download',
    contentIds: [data.downloadId]
  });
}

// ── Event History ─────────────────────────────────────────────
export function getPixelEvents(filter = null, limit = 100) {
  let events = [...pixelEvents];

  if (filter) {
    if (filter.type) {
      events = events.filter(e => e.type === filter.type);
    }
    if (filter.valueMin) {
      events = events.filter(e => e.value >= filter.valueMin);
    }
  }

  return events.slice(0, limit);
}

export function getPixelStats() {
  const events = pixelEvents;

  const statsByType = {};
  const totalValue = events.reduce((sum, e) => sum + (e.value || 0), 0);

  events.forEach(e => {
    statsByType[e.type] = (statsByType[e.type] || 0) + 1;
  });

  return {
    totalEvents: events.length,
    totalValue,
    averageValue: (totalValue / Math.max(1, events.length)).toFixed(2),
    eventsByType: statsByType,
    lastEventAt: events.length > 0 ? events[events.length - 1].timestamp : null
  };
}
