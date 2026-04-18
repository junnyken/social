/**
 * API Client — Gọi backend thay vì gọi external APIs trực tiếp
 * Tất cả calls đi qua /api/proxy/* để ẩn keys và bypass CORS
 */

const API_BASE = window.__API_BASE__ || (window.location.origin + '/api');
// Môi trường vite không có sẵn nên thay bằng logic đơn giản hoặc import.meta.env nếu có.
// const API_BASE = import.meta.env?.VITE_API_URL || window.__API_BASE__ || (window.location.origin + '/api');

// JWT token storage (in-memory only — không dùng localStorage)
let _token = null;

export function setToken(token) { _token = token; }
export function getToken()      { return _token; }
export function clearToken()    { _token = null; }

// ── Base fetch ────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (_token) headers['Authorization'] = `Bearer ${_token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  // Auto-refresh on 401
  if (response.status === 401 && _token) {
    try {
      const refreshed = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${_token}`, 'Content-Type': 'application/json' }
      });
      if (refreshed.ok) {
        const { token } = await refreshed.json();
        setToken(token);
        headers['Authorization'] = `Bearer ${token}`;
        // Retry original request
        return fetch(`${API_BASE}${path}`, { ...options, headers });
      }
    } catch {}
    clearToken();
    window.location.hash = '#login';
    throw new Error('Session hết hạn. Vui lòng đăng nhập lại.');
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  login: (email, password) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => apiFetch('/auth/me'),
  refresh: () => apiFetch('/auth/refresh', { method: 'POST' })
};

// ── OpenAI ────────────────────────────────────────────────────
export const openaiApi = {
  chat: (messages, opts = {}) =>
    apiFetch('/proxy/openai/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, ...opts })
    })
};

// ── Facebook ──────────────────────────────────────────────────
export const facebookApi = {
  post: (pageId, accessToken, message, imageUrl = null) =>
    apiFetch('/proxy/facebook/post', {
      method: 'POST',
      body: JSON.stringify({ pageId, accessToken, message, imageUrl })
    })
};

// ── Instagram ─────────────────────────────────────────────────
export const instagramApi = {
  post: (igUserId, accessToken, imageUrl, caption) =>
    apiFetch('/proxy/instagram/post', {
      method: 'POST',
      body: JSON.stringify({ igUserId, accessToken, imageUrl, caption })
    })
};

// ── Twitter ───────────────────────────────────────────────────
export const twitterApi = {
  tweet: (accessToken, text, mediaIds = []) =>
    apiFetch('/proxy/twitter/tweet', {
      method: 'POST',
      body: JSON.stringify({ accessToken, text, mediaIds })
    })
};
