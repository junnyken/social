// ============================================================
// Facebook OAuth + Token Management
// ============================================================

// State lưu in-memory (không localStorage - sandbox safe)
let _state = {
  userToken:  null,
  pages:      [],       // [{ id, name, access_token, picture }]
  activePageId: null
};

// ── Login ────────────────────────────────────────────────────

export async function getLoginURL() {
  try {
    const res = await fetch('/api/v1/auth/login-url');
    const data = await res.json();
    if (data.success && data.loginUrl) {
      return data.loginUrl;
    }
    throw new Error('Failed to get login URL');
  } catch (error) {
    console.error('Error fetching login URL:', error);
    return null;
  }
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
