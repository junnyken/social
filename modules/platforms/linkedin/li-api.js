// ============================================================
// LinkedIn API v2 Wrapper
// ============================================================

const LI_BASE = 'https://api.linkedin.com/v2';

export async function getProfile(accessToken) {
  const res = await fetch(`${LI_BASE}/me`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  return res.json();
}

export async function postToLinkedIn(accessToken, authorUrn, { text, imageUrl = null }) {
  const body = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text },
        shareMediaCategory: imageUrl ? 'IMAGE' : 'NONE',
        ...(imageUrl && {
          media: [{ status: 'READY', description: { text: '' }, media: imageUrl, title: { text: '' } }]
        })
      }
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
  };

  const res = await fetch(`${LI_BASE}/ugcPosts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0'
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (data.serviceErrorCode) throw new Error(data.message);
  return data;
}

export async function getOrganizationFollowers(accessToken, orgId) {
  const res = await fetch(
    `${LI_BASE}/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${orgId}`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );
  return res.json();
}
