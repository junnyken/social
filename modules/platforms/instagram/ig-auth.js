// ============================================================
// Instagram Auth — Dùng chung Meta token với Facebook
// ============================================================

let _igState = { accounts: [], activeAccountId: null };

export function getIGAccounts() { return _igState.accounts; }
export function isAuthenticated() { return _igState.accounts.length > 0; }

export async function fetchLinkedIGAccounts(fbUserToken) {
  const BASE = 'https://graph.facebook.com/v21.0';
  const res = await fetch(
    `${BASE}/me/accounts?fields=instagram_business_account{id,name,username,profile_picture_url}&access_token=${fbUserToken}`
  );
  const pages = await res.json();
  if (pages.error) throw new Error(pages.error.message);

  _igState.accounts = (pages.data || [])
    .filter(p => p.instagram_business_account)
    .map(p => ({
      igId: p.instagram_business_account.id,
      name: p.instagram_business_account.name || p.instagram_business_account.username,
      username: p.instagram_business_account.username,
      picture: p.instagram_business_account.profile_picture_url,
      pageToken: p.access_token
    }));

  return _igState.accounts;
}

export function getActiveAccount() {
  if (_igState.activeAccountId) return _igState.accounts.find(a => a.igId === _igState.activeAccountId);
  return _igState.accounts[0] || null;
}

export function setActiveAccount(igId) { _igState.activeAccountId = igId; }
export function logout() { _igState = { accounts: [], activeAccountId: null }; }
