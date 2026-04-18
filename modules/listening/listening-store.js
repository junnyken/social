// ============================================================
// Social Listening Store — Phase O: API-backed + local cache
// ============================================================

let keywords = [];
let mentions = [];
const listeners = [];

// ── API Layer ─────────────────────────────────────────────────
async function apiCall(endpoint, options = {}) {
  try {
    const res = await fetch(`/api/v1/listening${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const json = await res.json();
    if (json.success) return json.data;
  } catch (e) {
    console.error('[Listening API]', e);
  }
  return null;
}

// ── Keywords (persisted via API) ──────────────────────────────
export async function loadKeywords() {
  const data = await apiCall('/keywords');
  if (data) keywords = data;
  notify();
  return keywords;
}

export async function addKeyword(term) {
  const data = await apiCall('/keywords', {
    method: 'POST',
    body: JSON.stringify({ term })
  });
  if (data) {
    keywords.push(data);
    notify();
    return data;
  }
  // Fallback: local only
  const colors = ['#1877F2','#E1306C','#10B981','#F59E0B','#8B5CF6','#EC4899','#14B8A6','#F97316'];
  const kw = {
    id: crypto.randomUUID(),
    term: term.toLowerCase().trim(),
    color: colors[keywords.length % colors.length],
    createdAt: new Date().toISOString(),
    mentionCount: 0
  };
  keywords.push(kw);
  notify();
  return kw;
}

export async function removeKeyword(id) {
  await apiCall(`/keywords/${id}`, { method: 'DELETE' });
  keywords = keywords.filter(k => k.id !== id);
  notify();
}

export function getKeywords() { return [...keywords]; }

// ── Mentions (cached locally, synced from API) ────────────────
export async function loadMentions(filters = {}) {
  const params = new URLSearchParams();
  if (filters.keyword) params.set('keyword', filters.keyword);
  if (filters.platform) params.set('platform', filters.platform);
  if (filters.sentiment) params.set('sentiment', filters.sentiment);
  if (filters.range) params.set('range', filters.range);
  const data = await apiCall(`/mentions?${params.toString()}`);
  if (data) mentions = data;
  return mentions;
}

export function addMentions(newMentions) {
  const existingIds = new Set(mentions.map(m => m.id));
  const added = newMentions.filter(m => !existingIds.has(m.id));
  mentions = [...added, ...mentions].slice(0, 500);
  added.forEach(m => {
    const kw = keywords.find(k => k.term === m.keyword);
    if (kw) kw.mentionCount++;
  });

  // Persist to backend (fire-and-forget)
  added.forEach(m => {
    apiCall('/mentions', { method: 'POST', body: JSON.stringify(m) }).catch(() => {});
  });

  notify();
  return added.length;
}

export function getMentions(filters = {}) {
  let result = [...mentions];
  if (filters.keyword) result = result.filter(m => m.keyword === filters.keyword);
  if (filters.platform) result = result.filter(m => m.platform === filters.platform);
  if (filters.sentiment) result = result.filter(m => m.sentiment === filters.sentiment);
  return result;
}

// ── Sentiment Analytics (from API) ────────────────────────────
export function getSentimentSummary() {
  // Compute locally from current mentions
  const counts = { positive: 0, neutral: 0, negative: 0 };
  mentions.forEach(m => { if (counts[m.sentiment] !== undefined) counts[m.sentiment]++; });
  return counts;
}

export async function getSentimentSummaryFromAPI() {
  const data = await apiCall('/sentiment/summary');
  return data || { positive: 0, neutral: 0, negative: 0, brandHealth: 50, avgScore: 0, total: 0 };
}

export async function getSentimentTrends(range = 30) {
  const data = await apiCall(`/sentiment/trends?range=${range}`);
  return data || [];
}

export async function getAlerts() {
  const data = await apiCall('/alerts');
  return data || [];
}

// ── Events ────────────────────────────────────────────────────
export function onUpdate(fn) { listeners.push(fn); }
function notify() { listeners.forEach(fn => fn()); }
