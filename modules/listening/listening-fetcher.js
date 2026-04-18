// ============================================================
// Listening Fetcher — Phase O: API-backed + mock fallback
// ============================================================

import { addMentions, getKeywords } from './listening-store.js';
import { analyzeSentiment } from './sentiment.js';

let fetchTimer = null;

export function startListeningPolling(onNew) {
  fetchMentions(onNew);
  fetchTimer = setInterval(() => fetchMentions(onNew), 3 * 60 * 1000);
}

export function stopListeningPolling() { clearInterval(fetchTimer); }

async function fetchMentions(onNew) {
  const keywords = getKeywords();
  if (!keywords.length) return;

  // In production: call platform APIs to search for keyword mentions
  // For now: generate mock mentions
  const newMentions = generateMockMentions(keywords, 2 + Math.floor(Math.random() * 3));
  const added = addMentions(newMentions);
  if (added > 0 && onNew) onNew(added);
}

function generateMockMentions(keywords, count) {
  const sampleTexts = [
    'Sản phẩm {kw} này dùng tốt lắm, recommend cho mọi người! 👍',
    'Vừa mua {kw} về, chất lượng ổn so với giá tiền',
    'Ai dùng {kw} chưa? Giá có hợp lý không vậy?',
    '{kw} shop này giao hàng nhanh, đóng gói cẩn thận ❤️',
    'Thất vọng quá, {kw} không như quảng cáo 😞',
    'Tìm mua {kw} ở đâu chất lượng vậy mọi người?',
    '{kw} ngon bổ rẻ, mình đã dùng được 2 tháng rồi 🔥',
    'Lần đầu dùng {kw}, cảm thấy ok, sẽ mua lại',
    'Review {kw}: xịn so với giá, đáng mua! ⭐',
    '{kw} bên này bị lỗi rồi mọi ơi, ai bị giống mình không? 😤',
    'Cảm ơn shop {kw}, tư vấn nhiệt tình quá! 😊',
    'Mình đang cân nhắc mua {kw}, bạn nào có review không?',
    '{kw} quá tệ, lần sau không mua nữa 😡',
    'Siêu xịn {kw}! Chất lượng vượt kỳ vọng 💯',
    '{kw} giao chậm quá, đợi cả tuần luôn 😔',
    'Wow {kw} đỉnh thật sự, giá lại rẻ nữa! 🤩',
  ];
  const platforms = ['facebook', 'instagram', 'twitter'];
  const names = ['nguyenA_shop', 'tran_b_reviewer', 'le_c_daily', 'pham_beauty', 'hoang_tech', 'do_food', 'mai_travel', 'vu_lifestyle'];

  return Array.from({ length: count }, () => {
    const kw = keywords[Math.floor(Math.random() * keywords.length)];
    const text = sampleTexts[Math.floor(Math.random() * sampleTexts.length)].replace(/\{kw\}/g, kw.term);
    const sentiment = analyzeSentiment(text);
    return {
      id: `listen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      platform: platforms[Math.floor(Math.random() * platforms.length)],
      text,
      from: names[Math.floor(Math.random() * names.length)],
      url: '#',
      sentiment: sentiment.label,
      sentimentScore: sentiment.score,
      keyword: kw.term,
      timestamp: new Date(Date.now() - Math.random() * 7200000).toISOString()
    };
  });
}
