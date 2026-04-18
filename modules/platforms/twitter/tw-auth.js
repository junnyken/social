// ============================================================
// Twitter/X Auth — OAuth 2.0 PKCE (Client-side safe)
// ============================================================

const TW_CONFIG = {
  clientId: 'YOUR_TWITTER_CLIENT_ID',
  redirectUri: window.location.origin + '/auth/twitter/callback',
  scopes: 'tweet.read tweet.write users.read offline.access'
};

let _twState = { accessToken: null, refreshToken: null, user: null };

export function getLoginURL() {
  // PKCE flow — generate code verifier/challenge
  const codeVerifier = generateCodeVerifier();
  sessionStorage.setItem('tw_code_verifier', codeVerifier);
  const codeChallenge = codeVerifier; // In production use S256 hash

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: TW_CONFIG.clientId,
    redirect_uri: TW_CONFIG.redirectUri,
    scope: TW_CONFIG.scopes,
    state: crypto.randomUUID(),
    code_challenge: codeChallenge,
    code_challenge_method: 'plain'
  });
  return `https://twitter.com/i/oauth2/authorize?${params}`;
}

export async function handleCallback(code) {
  // Exchange code for token — requires backend proxy for client_secret
  // For now, mock the token
  _twState.accessToken = 'tw_mock_token_' + Date.now();
  _twState.user = { id: 'tw_user_mock', name: 'Twitter User', username: '@user' };
  return _twState.user;
}

export function getToken() { return _twState.accessToken; }
export function getUser() { return _twState.user; }
export function isAuthenticated() { return !!_twState.accessToken; }
export function logout() { _twState = { accessToken: null, refreshToken: null, user: null }; }

function generateCodeVerifier() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(36)).join('').slice(0, 43);
}
