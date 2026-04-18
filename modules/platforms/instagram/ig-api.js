// ============================================================
// Instagram Graph API — Business/Creator accounts
// ============================================================

const BASE = 'https://graph.facebook.com/v21.0';

export async function postSingleImage(igUserId, pageToken, { imageUrl, caption }) {
  const containerRes = await fetch(`${BASE}/${igUserId}/media`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: pageToken })
  });
  const container = await containerRes.json();
  if (container.error) throw new Error(container.error.message);

  await waitForContainerReady(container.id, pageToken);

  const publishRes = await fetch(`${BASE}/${igUserId}/media_publish`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: container.id, access_token: pageToken })
  });
  const result = await publishRes.json();
  if (result.error) throw new Error(result.error.message);
  return result;
}

export async function postCarousel(igUserId, pageToken, { imageUrls, caption }) {
  const childContainers = await Promise.all(
    imageUrls.map(url =>
      fetch(`${BASE}/${igUserId}/media`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: url, is_carousel_item: true, access_token: pageToken })
      }).then(r => r.json())
    )
  );

  const carouselRes = await fetch(`${BASE}/${igUserId}/media`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'CAROUSEL',
      children: childContainers.map(c => c.id).join(','),
      caption, access_token: pageToken
    })
  });
  const carousel = await carouselRes.json();
  if (carousel.error) throw new Error(carousel.error.message);

  const publishRes = await fetch(`${BASE}/${igUserId}/media_publish`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: carousel.id, access_token: pageToken })
  });
  return publishRes.json();
}

export async function getIGInsights(igUserId, pageToken) {
  const res = await fetch(
    `${BASE}/${igUserId}/insights?metric=impressions,reach,profile_views,follower_count&period=day&access_token=${pageToken}`
  );
  return res.json();
}

async function waitForContainerReady(containerId, token, maxWait = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const res = await fetch(`${BASE}/${containerId}?fields=status_code&access_token=${token}`);
    const data = await res.json();
    if (data.status_code === 'FINISHED') return true;
    if (data.status_code === 'ERROR') throw new Error('IG container error');
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error('IG container timeout');
}
