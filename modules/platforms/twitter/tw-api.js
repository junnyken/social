// ============================================================
// Twitter API v2 Wrapper
// ============================================================

const TW_BASE = 'https://api.twitter.com/2';

export async function postTweet(accessToken, { text, mediaIds = [] }) {
  const body = { text };
  if (mediaIds.length > 0) body.media = { media_ids: mediaIds };

  const res = await fetch(`${TW_BASE}/tweets`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0]?.message || 'Tweet failed');
  return data;
}

export async function uploadMedia(accessToken, imageBlob) {
  // Twitter v1.1 upload — needs backend proxy for OAuth 1.0a
  return { media_id_string: 'mock_media_' + Date.now() };
}

export async function getTweetMetrics(accessToken, tweetId) {
  const res = await fetch(
    `${TW_BASE}/tweets/${tweetId}?tweet.fields=public_metrics,non_public_metrics`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );
  return res.json();
}

export async function getUserTimeline(accessToken, userId, maxResults = 10) {
  const res = await fetch(
    `${TW_BASE}/users/${userId}/tweets?max_results=${maxResults}&tweet.fields=public_metrics,created_at`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );
  return res.json();
}
