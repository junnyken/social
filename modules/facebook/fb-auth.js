// ============================================================
// Facebook OAuth + Token Management
// ============================================================

const FB_CONFIG = {
  appId:       'YOUR_APP_ID',         // Lấy từ developers.facebook.com
  apiVersion:  'v21.0',
  scopes: [
    'pages_manage_posts',
    'pages_read_engagement',
    'pages_show_list'
  ].join(','),
  redirectUri: window.location.origin + '/auth/facebook/callback'
};

// State lưu in-memory (không localStorage - sandbox safe)
let _state = {
  userToken:  null,
  pages:      [],       // [{ id, name, access_token, picture }]
  activePageId: null
};

// ── Login ────────────────────────────────────────────────────

export function getLoginURL() {
  const params = new URLSearchParams({
    client_id:     FB_CONFIG.appId,
    redirect_uri:  FB_CONFIG.redirectUri,
    scope:         FB_CONFIG.scopes,
    response_type: 'token',   // Implicit flow cho client-side
    state:         crypto.randomUUID()
  });
  return `https://www.facebook.com/dialog/oauth?${params}`;
}

// Xử lý callback sau OAuth (gọi từ redirect URI page)
export async function handleCallback(accessToken) {
  _state.userToken = accessToken;

  // Lấy danh sách Pages user quản lý
  const res = await fetch(
    `https://graph.facebook.com/${FB_CONFIG.apiVersion}/me/accounts` +
    `?fields=id,name,access_token,picture` +
    `&access_token=${accessToken}`
  );
  const data = await res.json();

  if (data.error) throw new Error(data.error.message);

  _state.pages = data.data;
  return _state.pages;
}

// ── Token Management ─────────────────────────────────────────

export function getPageToken(pageId) {
  const page = _state.pages.find(p => p.id === pageId);
  if (!page) throw new Error(`Page ${pageId} not found`);
  return page.access_token;
}

export function getPages() { return _state.pages; }
export function isAuthenticated() { return !!_state.userToken; }
export function logout() { _state = { userToken: null, pages: [], activePageId: null }; }

// ── Config setter (runtime update App ID) ────────────────────
export function setAppId(appId) {
  FB_CONFIG.appId = appId;
}
