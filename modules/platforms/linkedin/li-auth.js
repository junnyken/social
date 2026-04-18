// ============================================================
// LinkedIn Auth — OAuth 2.0
// ============================================================

const LI_CONFIG = {
  clientId: 'YOUR_LINKEDIN_CLIENT_ID',
  redirectUri: window.location.origin + '/auth/linkedin/callback',
  scopes: 'openid profile w_member_social'
};

let _liState = { accessToken: null, user: null, organizationUrn: null };

export function getLoginURL() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LI_CONFIG.clientId,
    redirect_uri: LI_CONFIG.redirectUri,
    scope: LI_CONFIG.scopes,
    state: crypto.randomUUID()
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
}

export async function handleCallback(code) {
  // Exchange code for token — requires backend proxy
  _liState.accessToken = 'li_mock_token_' + Date.now();
  _liState.user = { id: 'li_user_mock', name: 'LinkedIn User', urn: 'urn:li:person:mock123' };
  return _liState.user;
}

export function getToken() { return _liState.accessToken; }
export function getUser() { return _liState.user; }
export function getAuthorUrn() { return _liState.user?.urn || _liState.organizationUrn; }
export function isAuthenticated() { return !!_liState.accessToken; }
export function logout() { _liState = { accessToken: null, user: null, organizationUrn: null }; }
