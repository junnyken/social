/**
 * Content Repurposing
 * 1 bài gốc → adapt cho từng platform tự động
 */
import { getBrandVoice, addToHistory } from './ai-store.js';

// Safe AI caller
async function tryCallAI(messages, opts) {
  try {
    const { openaiApi } = await import('../api-client.js');
    return await openaiApi.chat(messages, opts);
  } catch { return null; }
}

const PLATFORM_CONSTRAINTS = {
  facebook:  { maxChars: 63206, hashtagStyle: 'few',  emojiOK: true,  formality: 'medium' },
  instagram: { maxChars: 2200,  hashtagStyle: 'many', emojiOK: true,  formality: 'casual' },
  twitter:   { maxChars: 280,   hashtagStyle: 'few',  emojiOK: true,  formality: 'casual' },
  linkedin:  { maxChars: 3000,  hashtagStyle: 'few',  emojiOK: false, formality: 'professional' },
  tiktok:    { maxChars: 2200,  hashtagStyle: 'many', emojiOK: true,  formality: 'casual' }
};

// ── Local Repurpose (no backend) ─────────────────────────────
export function repurposeLocal(originalText, targetPlatform) {
  const bv    = getBrandVoice();
  const rules = PLATFORM_CONSTRAINTS[targetPlatform];
  let text    = originalText;

  // Trim length
  if (text.length > rules.maxChars) {
    text = text.slice(0, rules.maxChars - 3) + '...';
  }

  // Twitter: condense + keep first hook
  if (targetPlatform === 'twitter') {
    const sentences = text.split(/[.!?。]/);
    text = (sentences[0] || text).trim();
    if (text.length > 240) text = text.slice(0, 237) + '...';
    if (!/#\w/.test(text)) {
      text += ` #${(bv.industry || 'business').replace(/\s+/g, '').toLowerCase()}`;
    }
  }

  // LinkedIn: add line breaks, remove excessive emoji
  if (targetPlatform === 'linkedin') {
    text = text.replace(/\p{Emoji}/gu, '').trim();
    if (!text.includes('\n\n')) {
      text = text.split('. ').join('.\n\n');
    }
    if (!text.includes('#')) {
      text += '\n\n#business #marketing #growth';
    }
  }

  // Instagram: ensure ≥5 hashtags
  if (targetPlatform === 'instagram') {
    const existingTags = (text.match(/#\w+/g) || []);
    if (existingTags.length < 5) {
      text += '\n\n' + generateHashtags(bv.industry, 8);
    }
  }

  return text;
}

// ── AI Repurpose (backend) ────────────────────────────────────
export async function repurposeWithAI(originalText, sourcePlatform, targetPlatforms, options = {}) {
  const bv = getBrandVoice();

  const prompt = `
Bạn là chuyên gia copywriting social media. Chuyển thể bài viết:

=== BÀI GỐC (${sourcePlatform}) ===
${originalText}

=== YÊU CẦU ===
Tone: ${bv.tone || 'friendly'}
Ngành: ${bv.industry || 'general'}
Ngôn ngữ: ${bv.language === 'en' ? 'English' : 'Tiếng Việt'}
Emoji: ${bv.emojiUsage}
${bv.cta ? `CTA mặc định: ${bv.cta}` : ''}

=== OUTPUT ===
Chuyển thể cho: ${targetPlatforms.join(', ')}. Trả về JSON:
{
${targetPlatforms.map(p => `  "${p}": { "text": "...", "charCount": 0, "hashtags": ["..."], "tip": "..." }`).join(',\n')}
}

Quy tắc:
- facebook: storytelling, ≤3 hashtag
- instagram: hook mạnh, 8-15 hashtag cuối, emoji
- twitter: ≤280 ký tự, ≤2 hashtag
- linkedin: professional, nhiều xuống dòng
- tiktok: casual, hook "POV:" hoặc "Đây là lý do...", 5-10 hashtag

Chỉ trả về JSON.`;

  const result = await tryCallAI([{ role: 'user', content: prompt }], { max_tokens: 1500 });

  if (result) {
    const raw = result.choices?.message?.content || result.choices?.[0]?.message?.content || '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const data = JSON.parse(match[0]);
      addToHistory({ type: 'repurpose', input: { originalText, sourcePlatform, targetPlatforms }, output: data });
      return data;
    }
  }

  // Fallback: local repurpose
  const data = {};
  targetPlatforms.forEach(t => { data[t] = { text: repurposeLocal(originalText, t), hashtags: [], tip: 'Local mode' }; });
  addToHistory({ type: 'repurpose', input: { originalText, sourcePlatform, targetPlatforms }, output: data });
  return data;
}

// ── Hashtag Generator ─────────────────────────────────────────
function generateHashtags(industry = '', count = 8) {
  const industryTags = {
    'Thời trang & Lifestyle': ['ootd', 'fashion', 'style', 'outfit', 'lifestyle', 'thoitrang', 'fashion_vn'],
    'Ẩm thực & F&B':         ['foodie', 'food', 'amthuc', 'foodphotography', 'yummy', 'foodlovers'],
    'Sức khỏe & Làm đẹp':   ['beauty', 'skincare', 'wellness', 'lamdep', 'skincareroutine', 'glow'],
    'Công nghệ & SaaS':      ['tech', 'startup', 'saas', 'software', 'innovation', 'digital'],
    'Giáo dục & Đào tạo':    ['education', 'learning', 'hocthuat', 'study', 'knowledge', 'skills']
  };

  const tags = industryTags[industry] || ['business', 'marketing', 'growth', 'brand', 'digital'];
  const general = ['viral', 'trending', 'reels', 'explore', 'share'];

  return [...new Set([...tags, ...general])]
    .slice(0, count)
    .map(t => '#' + t)
    .join(' ');
}
