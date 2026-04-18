// ============================================================
// Facebook Graph API Wrapper
// ============================================================

import { getPageToken } from './fb-auth.js';

const BASE = 'https://graph.facebook.com/v21.0';

// ── Core Request ─────────────────────────────────────────────

async function fbRequest(method, endpoint, params = {}) {
  const url = new URL(`${BASE}${endpoint}`);

  if (method === 'GET') {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    method,
    headers: method !== 'GET' ? { 'Content-Type': 'application/json' } : {},
    body: method !== 'GET' ? JSON.stringify(params) : undefined
  });

  const data = await res.json();

  // Facebook error handling
  if (data.error) {
    const { code, message } = data.error;
    if (code === 190) throw new Error('TOKEN_EXPIRED');
    if (code === 32 || code === 17) throw new Error('RATE_LIMITED');
    throw new Error(`FB API Error ${code}: ${message}`);
  }

  return data;
}

// ── Page Posts ───────────────────────────────────────────────

/**
 * Đăng bài text lên Page
 * @param {string} pageId
 * @param {string} message - Nội dung bài (đã qua spinner)
 * @param {string|null} scheduledAt - ISO8601, null = post ngay
 */
export async function postToPage(pageId, message, scheduledAt = null) {
  const token = getPageToken(pageId);
  const params = { message, access_token: token };

  // Scheduled post: Facebook nhận UNIX timestamp
  if (scheduledAt) {
    params.published = false;
    params.scheduled_publish_time = Math.floor(new Date(scheduledAt).getTime() / 1000);
  }

  return fbRequest('POST', `/${pageId}/feed`, params);
}

/**
 * Đăng bài kèm ảnh lên Page
 * @param {string} pageId
 * @param {string} message
 * @param {string[]} imageUrls - Mảng URL ảnh public
 */
export async function postWithImages(pageId, message, imageUrls = []) {
  const token = getPageToken(pageId);

  // Nếu 1 ảnh: dùng endpoint /photos
  if (imageUrls.length === 1) {
    return fbRequest('POST', `/${pageId}/photos`, {
      caption: message,
      url: imageUrls[0],
      access_token: token
    });
  }

  // Nếu nhiều ảnh: upload từng ảnh unpublished, rồi đính vào 1 post
  const photoIds = await Promise.all(
    imageUrls.map(url =>
      fbRequest('POST', `/${pageId}/photos`, {
        url,
        published: false,
        access_token: token
      })
    )
  );

  return fbRequest('POST', `/${pageId}/feed`, {
    message,
    attached_media: photoIds.map(p => ({ media_fbid: p.id })),
    access_token: token
  });
}

/**
 * Lấy insights của Page (stats tổng quan)
 */
export async function getPageInsights(pageId) {
  try {
    const res = await fetch(`/api/v1/insights/${pageId}/overview?range=7`);
    const data = await res.json();
    if (data.success) return data.data;
    throw new Error(data.message);
  } catch (error) {
    console.warn('[fb-api] fallback for insights', error);
    // Backwards compatible fallback
    const token = getPageToken(pageId);
    return fbRequest('GET', `/${pageId}/insights`, {
      metric: 'page_fans,page_post_engagements,page_impressions',
      period: 'day',
      access_token: token
    });
  }
}

/**
 * Lấy danh sách bài đã đăng
 */
export async function getPagePosts(pageId, limit = 10) {
  try {
    const res = await fetch(`/api/v1/fb/pages/${pageId}/posts?limit=${limit}`);
    const data = await res.json();
    if (data.success && data.data && data.data.posts) {
      return { data: data.data.posts }; // match old structure
    }
    throw new Error(data.message);
  } catch (error) {
    console.warn('[fb-api] fallback for getPagePosts', error);
    // Backwards compatible fallback
    const token = getPageToken(pageId);
    return fbRequest('GET', `/${pageId}/feed`, {
      fields: 'id,message,created_time,permalink_url,full_picture',
      limit,
      access_token: token
    });
  }
}
