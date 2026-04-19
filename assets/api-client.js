// ============================================================
// API Client — Kết nối Web App với Backend (localhost:3000)
// ============================================================

const API_BASE = '/api/v1';
const WS_URL   = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host;

// ── HTTP Helpers ─────────────────────────────────────────────

async function request(method, path, body = null, retries = 2) {
  const headers = { 'Content-Type': 'application/json' };

  // Gắn auth token từ localStorage vào mọi request
  const authToken = localStorage.getItem('auth_token');
  if (authToken) {
    headers['Authorization'] = 'Bearer ' + authToken;
  }

  const opts = {
    method,
    credentials: 'same-origin', // Fallback: cũng gửi cookie nếu có
    headers
  };
  if (body) opts.body = JSON.stringify(body);

  let attempt = 0;
  while (attempt <= retries) {
      try {
          const res = await fetch(`${API_BASE}${path}`, opts);

          // Token hết hạn → xóa token, redirect về login
          if (res.status === 401) {
            localStorage.removeItem('auth_token');
            window.location.hash = '#/login';
            throw new Error('Unauthorized');
          }

          if (!res.ok) {
            // If 5xx or rate limited and we have retries left, throw to trigger retry
            if ((res.status >= 500 || res.status === 429) && attempt < retries) {
                throw new Error(`HTTP ${res.status}`);
            }
            // Otherwise, it's a hard error (like 400, 404)
            const err = await res.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(err.message || `HTTP ${res.status}`);
          }

          return await res.json();
      } catch (e) {
          if (e.message === 'Unauthorized' || attempt >= retries) {
              throw e;
          }
          attempt++;
          // Exponential backoff
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt-1)));
      }
  }
}

export const api = {
  get:    (path)        => request('GET', path),
  post:   (path, body)  => request('POST', path, body),
  put:    (path, body)  => request('PUT', path, body),
  delete: (path)        => request('DELETE', path),
};

// ── WebSocket (Realtime) ──────────────────────────────────────

let ws = null;
const listeners = {};

export function connectWebSocket() {
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('[WS] Connected');
    updateConnectionStatus('online');
  };

  ws.onmessage = ({ data }) => {
    try {
      const { event, payload } = JSON.parse(data);
      if (listeners[event]) {
        listeners[event].forEach(fn => fn(payload));
      }
      // Tất cả events cũng trigger 'any' listeners
      if (listeners['any']) {
        listeners['any'].forEach(fn => fn({ event, payload }));
      }
    } catch (e) {
      console.error('[WS] Parse error:', e);
    }
  };

  ws.onerror = () => updateConnectionStatus('error');

  ws.onclose = () => {
    updateConnectionStatus('offline');
    // Auto-reconnect sau 5 giây
    setTimeout(connectWebSocket, 5000);
  };
}

export function onEvent(event, callback) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(callback);
}

export function offEvent(event, callback) {
  if (listeners[event]) {
    listeners[event] = listeners[event].filter(fn => fn !== callback);
  }
}

function updateConnectionStatus(status) {
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  if (statusDot && statusText) {
      const labels = { online: 'System Online', offline: 'System Offline', error: 'Connection Error' };
      const colors = { online: 'var(--color-success)', offline: 'var(--color-text-muted)', error: 'var(--color-error)' };
      
      statusText.textContent = labels[status];
      statusDot.style.background = colors[status];
      statusDot.style.boxShadow = `0 0 6px ${colors[status]}`;
  }
}

// ── Endpoint Wrappers ─────────────────────────────────────────

export const Auth = {
  getLoginUrl: ()        => api.get('/auth/login-url'),
  getStatus:   ()        => api.get('/auth/status'),
  logout:      ()        => {
    localStorage.removeItem('auth_token');
    return api.post('/auth/logout');
  },
  isLoggedIn:  ()        => !!localStorage.getItem('auth_token'),
  getToken:    ()        => localStorage.getItem('auth_token'),
};

export const Accounts = {
  list:    ()            => api.get('/accounts'),
  get:     (id)          => api.get(`/accounts/${id}`),
  create:  (data)        => api.post('/accounts', data),
  update:  (id, data)    => api.put(`/accounts/${id}`, data),
  remove:  (id)          => api.delete(`/accounts/${id}`),
  sync:    (id)          => api.post(`/accounts/${id}/sync`),
  getPages:(id)          => api.get(`/accounts/${id}/pages`),
};

export const Pages = {
  list:         ()       => api.get('/pages'),
  postNow:      (data)   => api.post('/pages/post', data),
  schedule:     (data)   => api.post('/pages/schedule', data),
  getPostHistory:(pageId)=> api.get(`/pages/${pageId}/posts`),
};

export const Queue = {
  list:    (params = {}) => api.get('/queue?' + new URLSearchParams(params)),
  add:     (data)        => api.post('/queue', data),
  update:  (id, data)    => api.put(`/queue/${id}`, data),
  remove:  (id)          => api.delete(`/queue/${id}`),
  pause:   ()            => api.post('/queue/pause'),
  resume:  ()            => api.post('/queue/resume'),
  status:  ()            => api.get('/queue/status').catch(() => ({isPaused: false, count: 0})),
};

export const Logs = {
  list:   (params = {})  => api.get('/logs?' + new URLSearchParams(params)),
  stats:  ()             => api.get('/logs/stats').catch(() => ({postsByDay: []})),
  export: (params = {})  => {
    const url = `${API_BASE}/logs/export?` + new URLSearchParams(params);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fb-autoposter-logs-${Date.now()}.csv`;
    a.click();
  }
};

export const Config = {
  get:                () => api.get('/config'),
  update:         (data) => api.post('/config/update', data),
};
