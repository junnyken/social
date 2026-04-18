/**
 * Bulk Content Generation
 * Generate 30 posts/month with content calendar
 * Supports themes, series, pillar content
 */
import { getBrandVoice, addToHistory } from './ai-store.js';

// Safe AI caller
async function tryCallAI(messages, opts) {
  try {
    const { openaiApi } = await import('../api-client.js');
    return await openaiApi.chat(messages, opts);
  } catch { return null; }
}

// Content Pillars framework
export const CONTENT_PILLARS = [
  { id: 'educational',   label: '📚 Giáo dục',    pct: 30, desc: 'Tips, how-to, kiến thức ngành' },
  { id: 'promotional',   label: '🛍️ Quảng cáo',   pct: 20, desc: 'Sản phẩm, dịch vụ, ưu đãi' },
  { id: 'engagement',    label: '💬 Tương tác',    pct: 25, desc: 'Câu hỏi, poll, challenge' },
  { id: 'inspirational', label: '✨ Cảm hứng',     pct: 15, desc: 'Quote, story, behind-the-scenes' },
  { id: 'ugc',           label: '👥 UGC/Review',   pct: 10, desc: 'Review khách hàng, reshare' }
];

// ── Build Calendar Plan ───────────────────────────────────────
export function buildMonthlyPlan(postsPerWeek = 5, platforms = ['facebook', 'instagram']) {
  const plan = [];
  const today = new Date();
  const daysInMonth = 30;
  const postDays = [1, 2, 3, 4, 5]; // Mon-Fri

  // Best hours per platform
  const BEST_HOURS = {
    facebook:  [8, 12, 18],
    instagram: [7, 12, 19],
    twitter:   [8, 12, 17],
    linkedin:  [8, 10, 12]
  };

  let dayIndex = 0;
  for (let d = 0; d < daysInMonth; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);
    const dow = date.getDay();

    if (!postDays.includes(dow)) continue;

    // Determine pillar (weighted rotation)
    const pillarRoll = dayIndex % 20;
    let pillar;
    if      (pillarRoll < 6)  pillar = CONTENT_PILLARS[0]; // educational 30%
    else if (pillarRoll < 11) pillar = CONTENT_PILLARS[2]; // engagement 25%
    else if (pillarRoll < 15) pillar = CONTENT_PILLARS[1]; // promotional 20%
    else if (pillarRoll < 18) pillar = CONTENT_PILLARS[3]; // inspirational 15%
    else                      pillar = CONTENT_PILLARS[4]; // ugc 10%

    // Assign platform & time
    const platform = platforms[dayIndex % platforms.length];
    const hours    = BEST_HOURS[platform] || [8, 12, 18];
    const hour     = hours[dayIndex % hours.length];

    date.setHours(hour, 0, 0, 0);

    plan.push({
      id:       `plan-${d}-${dayIndex}`,
      date:     date.toISOString(),
      platform,
      pillar,
      status:   'empty',   // empty | generated | scheduled | posted
      postData: null
    });

    dayIndex++;
    if (plan.length >= postsPerWeek * 4) break;
  }

  return plan;
}

// ── Generate Bulk Posts ───────────────────────────────────────
export async function generateBulkPosts(plan, topic, onProgress) {
  const bv      = getBrandVoice();
  const results = [];
  const total   = plan.length;

  for (let i = 0; i < total; i++) {
    const slot = plan[i];
    onProgress?.({ current: i + 1, total, slot });

    const prompt = `
Bạn là copywriter social media expert.
Tạo 1 bài đăng:

Ngành: ${bv.industry || 'general'}
Tone: ${bv.tone || 'friendly'}
Platform: ${slot.platform}
Loại: ${slot.pillar.label} — ${slot.pillar.desc}
Chủ đề tháng: ${topic}
Ngày: ${new Date(slot.date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
Ngôn ngữ: ${bv.language === 'en' ? 'English' : 'Tiếng Việt'}
Emoji: ${bv.emojiUsage}
${bv.cta ? `CTA: ${bv.cta}` : ''}
${bv.keyMessages.length ? `Key messages: ${bv.keyMessages.join(', ')}` : ''}

Yêu cầu: Phù hợp ${slot.platform}, hook mạnh, không lặp.

Trả về JSON:
{"text":"...","hashtags":["..."],"mediaPrompt":"mô tả ảnh/video","contentType":"image|video|carousel|text","estimatedER":0.0}`;

    try {
      const result = await tryCallAI([{ role: 'user', content: prompt }], { max_tokens: 600 });

      if (result) {
        const raw = result.choices?.message?.content || result.choices?.[0]?.message?.content || '';
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          const data = JSON.parse(match[0]);
          results.push({ ...slot, postData: data, status: 'generated' });
          if (i < total - 1) await new Promise(r => setTimeout(r, 500));
          continue;
        }
      }
      throw new Error('no result');
    } catch {
      // Fallback local
      results.push({
        ...slot,
        postData: {
          text:        generateFallbackPost(slot.pillar.id, topic, slot.platform, bv),
          hashtags:    ['#' + (bv.industry || 'business').replace(/\s+/g, '').toLowerCase()],
          mediaPrompt: `Ảnh minh họa cho chủ đề ${topic}`,
          contentType: 'image',
          estimatedER: 3.5
        },
        status: 'generated',
        isFallback: true
      });
    }

    if (i < total - 1) await new Promise(r => setTimeout(r, 300));
  }

  addToHistory({
    type:  'bulk',
    input: { topic, postsCount: total },
    output: { generated: results.length, plan: results }
  });

  return results;
}

// ── Fallback Generator (no API) ───────────────────────────────
function generateFallbackPost(pillarId, topic, platform, bv) {
  const templates = {
    educational: [
      `💡 Bạn có biết về ${topic} không?\n\nHôm nay chúng tôi muốn chia sẻ với bạn những điều thú vị...\n\n📌 Lưu lại để đọc sau nhé!`,
      `📚 Tips ${topic} cho người mới bắt đầu:\n\n1️⃣ ...\n2️⃣ ...\n3️⃣ ...\n\nBạn đã áp dụng chưa? Comment bên dưới! 👇`
    ],
    promotional: [
      `🔥 ƯU ĐÃI ĐẶC BIỆT liên quan đến ${topic}!\n\n✅ ...\n✅ ...\n\n${bv.cta || 'Liên hệ ngay!'} 🎯`,
      `⚡ FLASH SALE ${topic} hôm nay!\nThời gian có hạn — đừng bỏ lỡ!\n\n${bv.cta || 'Đặt ngay!'} 👆`
    ],
    engagement: [
      `❓ Câu hỏi của ngày: Bạn nghĩ gì về ${topic}?\n\nA) Rất thích\nB) Bình thường\nC) Chưa thử\n\nComment A/B/C bên dưới! 👇`,
      `🤔 Poll: Khi nhắc đến ${topic}, điều đầu tiên bạn nghĩ đến là gì?\n\nTag bạn bè cùng thảo luận! 👫`
    ],
    inspirational: [
      `✨ "${topic} không phải là đích đến, mà là hành trình."\n\nHôm nay bạn đã tiến được bao xa rồi? 💪`,
      `🌟 Mỗi ngày là cơ hội mới để khám phá ${topic}.\n\nĐừng dừng lại — bạn làm được! 🚀`
    ],
    ugc: [
      `💬 Khách hàng nói về ${topic}:\n\n"[Review thật từ khách hàng]"\n\n❤️ Cảm ơn sự tin tưởng!`,
      `⭐⭐⭐⭐⭐ Feedback tuyệt vời về ${topic}!\n\nBạn đã trải nghiệm chưa? Chia sẻ nhé!`
    ]
  };

  const list = templates[pillarId] || templates.educational;
  return list[Math.floor(Math.random() * list.length)];
}

// ── Export Calendar CSV ───────────────────────────────────────
export function exportCalendarCSV(generatedPlan) {
  const headers = ['Ngày', 'Giờ', 'Platform', 'Loại', 'Nội dung', 'Hashtags', 'Media'];
  const rows = generatedPlan.map(slot => {
    const dt = new Date(slot.date);
    return [
      dt.toLocaleDateString('vi-VN'),
      `${dt.getHours()}:00`,
      slot.platform,
      slot.pillar?.label || '',
      (slot.postData?.text || '').replace(/,/g, '，').replace(/\n/g, ' '),
      (slot.postData?.hashtags || []).join(' '),
      slot.postData?.mediaPrompt || ''
    ].map(v => `"${v}"`).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
