// ============================================================
// Advanced Vietnamese Sentiment Analysis — Phase O
// Supports: dictionary matching, n-gram, negation, intensity scoring, emoji
// ============================================================

const POSITIVE = new Set([
  'tốt','hay','đẹp','ngon','tuyệt','xuất sắc','thích','yêu','tuyệt vời',
  'chất lượng','hài lòng','ưng','ok','ổn','được','hoàn hảo','cảm ơn',
  'recommend','giỏi','nhanh','uy tín','chuyên nghiệp','đáng','worth',
  'hợp lý','rẻ','tiết kiệm','pro','xịn','đỉnh','chill','smooth',
  'dễ thương','cute','xinh','sáng tạo','bền','mới','hot','trending',
  'amazing','great','love','best','excellent','perfect','awesome',
  'fantastic','wonderful','brilliant','superb','outstanding',
  'đáng giá','nhiệt tình','chu đáo','tận tâm','thân thiện',
  'hỗ trợ','gợi ý','nổi bật','ấn tượng','khuyến mãi',
  'giảm giá','freeship','miễn phí','quà tặng','ưu đãi',
  'sạch','thơm','mịn','êm','nhẹ','gọn','tiện','đẳng cấp',
  'sang','cao cấp','premium','vip','luxury','authentic','chính hãng',
  'bảo hành','đổi trả','hỗ trợ tốt','ship nhanh','giao nhanh',
  'đóng gói đẹp','phục vụ tốt','giá tốt','rất tốt','rất đẹp',
  'rất ngon','quá tuyệt','quá đỉnh','siêu xịn','cực kỳ tốt',
  'tốt lắm','hay lắm','đẹp lắm','ngon lắm','ok lắm',
  'thật sự tốt','chất','max','xịn sò','xứng đáng',
  'hơn mong đợi','vượt kỳ vọng','đáng đồng tiền','rất ưng',
  'mua lại','sẽ quay lại','giới thiệu','khuyên dùng','nên mua',
  'wow','bravo','nice','top','cool','lit','fire','chef kiss'
]);

const NEGATIVE = new Set([
  'tệ','xấu','dở','kém','thất vọng','tức','bực','chán','ghét',
  'lừa','scam','giả','fake','không tốt','phí','waste',
  'chậm','trễ','sai','lỗi','hỏng','bể','vỡ','mất','thiếu',
  'phàn nàn','complaint','refund','hoàn tiền','đắt','mắc',
  'cũ','fail','thua','hư','gãy','rách','tồi','bẩn','kém chất lượng',
  'bad','terrible','worst','awful','horrible','poor','disappointed',
  'giao chậm','đóng gói tệ','thái độ kém','không nhiệt tình','hàng lỗi',
  'rất tệ','rất xấu','rất dở','quá tệ','quá xấu','cực kỳ tệ',
  'tệ lắm','xấu lắm','dở lắm','chán lắm',
  'không hài lòng','không ổn','không ok','không được','không đáng',
  'hối hận','phí tiền','lãng phí','vứt','bỏ','trả lại',
  'không bao giờ','không quay lại','không giới thiệu','không khuyên',
  'ăn cắp','lừa đảo','bịp','gian lận','hàng nhái','hàng dỏm',
  'hàng kém','hàng xấu','hàng cũ','chất lượng kém',
  'chậm trả lời','không trả lời','bơ','phớt lờ','vô trách nhiệm',
  'rip off','overpriced','broken','damaged','defective',
  'toxic','spam','annoying','ridiculous','unacceptable'
]);

const INTENSIFIERS = new Set(['rất','cực','siêu','quá','vô cùng','hết sức','cực kỳ','thật sự','vô cực','max','mega','ultra']);

const EMOJI_POS = ['👍','❤️','🔥','⭐','😍','🥰','😊','✅','💯','🎉','💪','🙏','💕','😘','🤩','👏','💖','🥇','🏆','😁','😃','😄'];
const EMOJI_NEG = ['👎','😡','😤','🤬','💔','❌','😔','😞','🤮','💩','😒','😑','🙄','😫','😩','🤦','👊','😠','😢','😭'];

export function analyzeSentiment(text) {
  if (!text) return { label: 'neutral', score: 0 };
  const normalized = text.toLowerCase();
  const words = normalized.split(/\s+/);

  let pos = 0, neg = 0;

  // 1. Single word matching
  words.forEach((word, i) => {
    let multiplier = 1;
    // Check if previous word is an intensifier
    if (i > 0 && INTENSIFIERS.has(words[i - 1])) multiplier = 1.5;

    if (POSITIVE.has(word)) pos += multiplier;
    if (NEGATIVE.has(word)) neg += multiplier;
  });

  // 2. N-gram matching (bigrams and trigrams)
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = words[i] + ' ' + words[i + 1];
    if (POSITIVE.has(bigram)) pos += 1.5;
    if (NEGATIVE.has(bigram)) neg += 1.5;

    if (i < words.length - 2) {
      const trigram = words[i] + ' ' + words[i + 1] + ' ' + words[i + 2];
      if (POSITIVE.has(trigram)) pos += 2;
      if (NEGATIVE.has(trigram)) neg += 2;
    }
  }

  // 3. Emoji sentiment
  for (const emoji of EMOJI_POS) {
    if (normalized.includes(emoji)) pos += 0.5;
  }
  for (const emoji of EMOJI_NEG) {
    if (normalized.includes(emoji)) neg += 0.5;
  }

  // 4. Negation patterns (flip sentiment)
  const negations = normalized.match(/(không|chẳng|chưa|ko|k|chả|đừng|hết)\s+\w+/g) || [];
  negations.forEach(phrase => {
    const afterWord = phrase.split(/\s+/)[1];
    if (POSITIVE.has(afterWord)) { pos -= 1; neg += 0.5; }
    if (NEGATIVE.has(afterWord)) { neg -= 0.5; pos += 0.5; }
  });

  // 5. Sarcasm detection (positive words + negative emoji = likely sarcastic)
  const hasNegEmoji = EMOJI_NEG.some(e => normalized.includes(e));
  if (pos > neg && hasNegEmoji) {
    // Likely sarcastic — reduce positive weight
    pos *= 0.3;
    neg += 1;
  }

  // 6. Calculate final score [-1.0 to +1.0]
  const total = pos + neg || 1;
  const score = parseFloat(((pos - neg) / total).toFixed(2));

  let label = 'neutral';
  if (score > 0.15) label = 'positive';
  else if (score < -0.15) label = 'negative';

  return { label, score };
}

// Export intensity score for external use
export function getSentimentScore(text) {
  return analyzeSentiment(text).score;
}
