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

// ── Gemini AI ────────────────────────────────────────────────────
export const geminiApi = {
  chat: (messages, opts = {}) =>
    apiFetch('/v1/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, ...opts })
    }),
  compose: (opts) =>
    apiFetch('/v1/ai/compose', { method: 'POST', body: JSON.stringify(opts) }),
  repurpose: (opts) =>
    apiFetch('/v1/ai/repurpose', { method: 'POST', body: JSON.stringify(opts) }),

  // Phase W — AI Powerhouse
  bestTime: (platform = 'facebook', engagementData = []) =>
    apiFetch('/v1/ai/best-time', { method: 'POST', body: JSON.stringify({ platform, engagementData }) }),
  hashtags: (content, platform = 'facebook') =>
    apiFetch('/v1/ai/hashtags', { method: 'POST', body: JSON.stringify({ content, platform }) }),
  classify: (message) =>
    apiFetch('/v1/ai/classify', { method: 'POST', body: JSON.stringify({ message }) }),
  autoReply: (message, conversationHistory = []) =>
    apiFetch('/v1/ai/auto-reply', { method: 'POST', body: JSON.stringify({ message, conversationHistory }) }),
  predict: (content, platform = 'facebook') =>
    apiFetch('/v1/ai/predict', { method: 'POST', body: JSON.stringify({ content, platform }) }),
  report: (analyticsData = {}, period = '7 ngày', brandName = 'SocialHub') =>
    apiFetch('/v1/ai/report', { method: 'POST', body: JSON.stringify({ analyticsData, period, brandName }) }),
  getBrandVoice: () => apiFetch('/v1/ai/brand-voice'),
  saveBrandVoice: (data) =>
    apiFetch('/v1/ai/brand-voice', { method: 'PUT', body: JSON.stringify(data) }),
};

// ── Cross-Platform (Unified Publisher) ────────────────────────
export const crossPlatformApi = {
  publish: (platforms, content, images = [], pageId = null) =>
    apiFetch('/v1/cross-platform/publish', {
      method: 'POST',
      body: JSON.stringify({ platforms, content, images, pageId })
    }),
  accounts: () => apiFetch('/v1/cross-platform/accounts'),
  summary: () => apiFetch('/v1/cross-platform/summary'),
  compare: (platforms) => apiFetch(`/v1/cross-platform/compare?platforms=${platforms.join(',')}`)
};

// ── Facebook (Legacy direct) ─────────────────────────────────
export const facebookApi = {
  post: (pageId, accessToken, message, imageUrl = null) =>
    apiFetch('/proxy/facebook/post', {
      method: 'POST',
      body: JSON.stringify({ pageId, accessToken, message, imageUrl })
    })
};

// ── Agency & Workspace ───────────────────────────────────────
export const agencyApi = {
  dashboard: () => apiFetch('/v1/agency/dashboard'),
  workspaces: () => apiFetch('/v1/agency/workspaces'),
  createWorkspace: (data) => apiFetch('/v1/agency/workspaces', { method: 'POST', body: JSON.stringify(data) }),
  updateWorkspace: (id, data) => apiFetch(`/v1/agency/workspaces/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteWorkspace: (id) => apiFetch(`/v1/agency/workspaces/${id}`, { method: 'DELETE' }),
  switchWorkspace: (id) => apiFetch(`/v1/agency/workspaces/${id}/switch`, { method: 'POST' }),
  clients: () => apiFetch('/v1/agency/clients'),
  addClient: (data) => apiFetch('/v1/agency/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id, data) => apiFetch(`/v1/agency/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteClient: (id) => apiFetch(`/v1/agency/clients/${id}`, { method: 'DELETE' })
};

// ── Team ─────────────────────────────────────────────────────
export const teamApi = {
  get: () => apiFetch('/v1/team'),
  addMember: (data) => apiFetch('/v1/team/members', { method: 'POST', body: JSON.stringify(data) }),
  updateMember: (id, data) => apiFetch(`/v1/team/members/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  removeMember: (id) => apiFetch(`/v1/team/members/${id}`, { method: 'DELETE' }),
  invite: (data) => apiFetch('/v1/team/invitations', { method: 'POST', body: JSON.stringify(data) }),
  revokeInvite: (id) => apiFetch(`/v1/team/invitations/${id}`, { method: 'DELETE' })
};

// ── Generic API helper ────────────────────────────────────────
export const api = {
  get: (path) => apiFetch('/v1' + path),
  post: (path, data) => apiFetch('/v1' + path, { method: 'POST', body: JSON.stringify(data) }),
  put: (path, data) => apiFetch('/v1' + path, { method: 'PUT', body: JSON.stringify(data) }),
  patch: (path, data) => apiFetch('/v1' + path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (path) => apiFetch('/v1' + path, { method: 'DELETE' })
};
