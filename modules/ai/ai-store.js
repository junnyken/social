/**
 * AI Store — Brand Voice, History, Caches, Preferences
 * In-memory state (sandbox-safe, no localStorage)
 */

// ── Brand Voice Profile ───────────────────────────────────────
let brandVoice = {
  name:           '',
  industry:       '',
  tone:           'friendly',        // friendly | professional | playful | authoritative
  language:       'vi',              // vi | en | vi-en (mixed)
  targetAudience: '',
  keyMessages:    [],                // string[]
  avoidWords:     [],                // string[]
  emojiUsage:     'moderate',        // none | light | moderate | heavy
  cta:            '',                // CTA mặc định
  learnedSamples: [],               // bài cũ để AI học theo
  configured:     false
};

export function getBrandVoice()           { return { ...brandVoice }; }
export function updateBrandVoice(updates) { Object.assign(brandVoice, updates, { configured: true }); }
export function isBrandVoiceConfigured()  { return brandVoice.configured; }

// ── AI Generation History ─────────────────────────────────────
let aiHistory = [];

export function addToHistory(entry) {
  aiHistory.unshift({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...entry
    // type: 'repurpose'|'bulk'|'predict'|'caption'|'trend'|'sentiment'
    // input, output, platform, liked
  });
  if (aiHistory.length > 200) aiHistory = aiHistory.slice(0, 200);
}

export function getHistory(type = null, limit = 20) {
  const list = type ? aiHistory.filter(h => h.type === type) : aiHistory;
  return list.slice(0, limit);
}

export function likeHistoryItem(id) {
  const item = aiHistory.find(h => h.id === id);
  if (item) item.liked = !item.liked;
}

export function getLikedItems() {
  return aiHistory.filter(h => h.liked);
}

// ── Trending Topics Cache ─────────────────────────────────────
let _trendsCache = null;
let _trendsFetched = null;

export function getTrendsCache()     { return _trendsCache; }
export function setTrendsCache(data) {
  _trendsCache = data;
  _trendsFetched = new Date();
}
export function isTrendsCacheStale() {
  if (!_trendsFetched) return true;
  return (Date.now() - _trendsFetched.getTime()) > 30 * 60 * 1000; // 30 min
}

// ── Sentiment Cache ───────────────────────────────────────────
let sentimentCache = {};

export function getSentimentCache(postId) { return sentimentCache[postId] || null; }
export function setSentimentCache(postId, data) { sentimentCache[postId] = data; }

// ── Tone Labels ───────────────────────────────────────────────
export const TONE_OPTIONS = [
  { value: 'friendly',      label: '😊 Thân thiện',      desc: 'Gần gũi, dễ thương' },
  { value: 'professional',  label: '💼 Chuyên nghiệp',   desc: 'Formal, tin cậy' },
  { value: 'playful',       label: '🎉 Vui tươi',        desc: 'Hài hước, sáng tạo' },
  { value: 'authoritative', label: '🎯 Uy quyền',        desc: 'Expert, dẫn đầu ngành' },
  { value: 'inspirational', label: '✨ Truyền cảm hứng', desc: 'Motivate, uplift' },
  { value: 'urgent',        label: '🔥 Khẩn cấp',        desc: 'FOMO, flash sale' }
];

export const INDUSTRY_OPTIONS = [
  'Thời trang & Lifestyle', 'Ẩm thực & F&B', 'Sức khỏe & Làm đẹp',
  'Công nghệ & SaaS', 'Giáo dục & Đào tạo', 'Bất động sản',
  'Du lịch & Hospitality', 'Tài chính & Đầu tư', 'Thương mại điện tử',
  'Dịch vụ chuyên môn', 'Giải trí & Media', 'Khác'
];
