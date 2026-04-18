/**
 * Predictive Performance Score
 * Score posts 0–100 before publishing
 * Local heuristics + optional backend AI
 */
import { getBrandVoice } from './ai-store.js';

// ── Safe AI caller (graceful fallback) ────────────────────────
async function tryCallAI(messages, opts) {
  try {
    const { openaiApi } = await import('../api-client.js');
    return await openaiApi.chat(messages, opts);
  } catch { return null; }
}

// ── Local Heuristic Scoring ───────────────────────────────────
function scoreLocal(content, platform, scheduledTime) {
  let score = 50;
  const reasons = [];
  const warnings = [];

  const text = content.text || '';
  const hasImage  = !!(content.imageUrl || content.imageBase64);
  const hasVideo  = !!content.videoUrl;
  const hashtags  = (text.match(/#\w+/g) || []);
  const emojis    = (text.match(/\p{Emoji}/gu) || []);
  const wordCount = text.trim().split(/\s+/).length;
  const hasQuestion = /\?/.test(text);
  const hasCTA    = /mua|đặt|xem|click|link|bình luận|tag|chia sẻ|dm|inbox/i.test(text);
  const hasPromo  = /sale|giảm|khuyến|miễn phí|free|giveaway|tặng/i.test(text);

  const hour = scheduledTime ? new Date(scheduledTime).getHours() : 12;
  const day  = scheduledTime ? new Date(scheduledTime).getDay()   : 1;

  // ── Content Quality ─────────────────────────────────────────
  if (hasImage || hasVideo) { score += 12; reasons.push('✅ Có media → reach cao hơn 2-3x'); }
  else                      { score -= 10; warnings.push('⚠️ Không có ảnh/video'); }

  if (hasVideo)             { score += 8;  reasons.push('✅ Video → ưu tiên bởi thuật toán'); }

  if (wordCount < 10)       { score -= 8;  warnings.push('⚠️ Nội dung quá ngắn'); }
  else if (wordCount > 300) { score -= 5;  warnings.push('⚠️ Nội dung có thể quá dài'); }
  else                      { score += 5;  reasons.push('✅ Độ dài nội dung phù hợp'); }

  if (hasQuestion)          { score += 8;  reasons.push('✅ Câu hỏi → tăng comments'); }
  if (hasCTA)               { score += 7;  reasons.push('✅ Có call-to-action'); }
  if (hasPromo)             { score += 6;  reasons.push('✅ Nội dung khuyến mãi'); }

  // ── Platform-specific ───────────────────────────────────────
  if (platform === 'instagram') {
    if (hashtags.length >= 5 && hashtags.length <= 15)  { score += 8; reasons.push('✅ Hashtag tối ưu (5-15)'); }
    else if (hashtags.length > 25)                       { score -= 8; warnings.push('⚠️ Quá nhiều hashtag (>25)'); }
    else if (hashtags.length === 0)                      { score -= 5; warnings.push('⚠️ Instagram không có hashtag'); }
  }
  if (platform === 'twitter') {
    if (text.length > 280)    { score -= 20; warnings.push('❌ Vượt giới hạn 280 ký tự Twitter'); }
    if (hashtags.length > 3)  { score -= 5;  warnings.push('⚠️ Twitter: nên dùng ≤3 hashtag'); }
  }
  if (platform === 'linkedin') {
    if (wordCount < 50)       { score -= 10; warnings.push('⚠️ LinkedIn: bài ngắn thường ít reach'); }
    if (wordCount > 100)      { score += 8;  reasons.push('✅ LinkedIn: bài dài được ưu tiên'); }
  }
  if (platform === 'facebook') {
    if (hashtags.length > 5)  { score -= 5;  warnings.push('⚠️ Facebook: ít dùng hashtag hơn'); }
  }

  // ── Timing ──────────────────────────────────────────────────
  const isGoodHour = (hour >= 7 && hour <= 9) ||
                     (hour >= 11 && hour <= 13) ||
                     (hour >= 18 && hour <= 22);
  const isWeekend = day === 0 || day === 6;

  if (isGoodHour) { score += 8; reasons.push('✅ Giờ đăng tốt (peak hours)'); }
  else            { score -= 5; warnings.push('⚠️ Giờ đăng ngoài peak hours'); }

  if (!isWeekend) { score += 3; reasons.push('✅ Ngày trong tuần'); }

  // ── Brand Voice ─────────────────────────────────────────────
  const bv = getBrandVoice();
  if (bv.configured) {
    const hasAvoidWords = bv.avoidWords.some(w =>
      text.toLowerCase().includes(w.toLowerCase())
    );
    if (hasAvoidWords) { score -= 15; warnings.push('❌ Chứa từ ngữ brand không muốn dùng'); }
  }

  score = Math.min(100, Math.max(0, Math.round(score)));

  return { score, reasons, warnings, predictedER: (score * 0.18).toFixed(1) };
}

// ── Predict (local + optional backend) ────────────────────────
export async function predictPerformance(content, platform, scheduledTime, useAI = false) {
  const local = scoreLocal(content, platform, scheduledTime);

  if (!useAI) return { ...local, source: 'heuristic' };

  try {
    const bv = getBrandVoice();
    const prompt = `Bạn là chuyên gia social media marketing. Đánh giá bài đăng:
Platform: ${platform}
Nội dung: "${content.text}"
Có media: ${!!(content.imageUrl || content.videoUrl)}
Giờ đăng: ${scheduledTime ? new Date(scheduledTime).toLocaleString('vi-VN') : 'Chưa xác định'}
Ngành: ${bv.industry || 'Chưa xác định'}
Tone: ${bv.tone || 'friendly'}

Trả về JSON:
{"aiScore":<0-100>,"aiInsights":["..."],"suggestedImprovement":"...","estimatedER":<% dự đoán>,"estimatedReach":<số>}
Chỉ trả về JSON.`;

    const result = await tryCallAI([{ role: 'user', content: prompt }], { max_tokens: 400 });
    if (!result) return { ...local, source: 'heuristic' };

    const raw = result.choices?.message?.content || result.choices?.[0]?.message?.content || '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { ...local, source: 'heuristic' };

    const aiData = JSON.parse(match[0]);

    return {
      ...local,
      aiScore: aiData.aiScore,
      finalScore: Math.round((local.score + aiData.aiScore) / 2),
      aiInsights: aiData.aiInsights,
      suggestedImprovement: aiData.suggestedImprovement,
      estimatedER: aiData.estimatedER,
      estimatedReach: aiData.estimatedReach,
      source: 'ai'
    };
  } catch (err) {
    console.warn('[Predict] AI fallback to heuristic:', err.message);
    return { ...local, source: 'heuristic' };
  }
}

// ── Score Color & Label ───────────────────────────────────────
export function getScoreColor(score) {
  if (score >= 80) return 'var(--color-success)';
  if (score >= 60) return 'var(--color-primary)';
  if (score >= 40) return 'var(--color-warning)';
  return 'var(--color-error)';
}

export function getScoreLabel(score) {
  if (score >= 85) return '🚀 Xuất sắc';
  if (score >= 70) return '✅ Tốt';
  if (score >= 55) return '🟡 Khá';
  if (score >= 40) return '⚠️ Trung bình';
  return '❌ Cần cải thiện';
}
