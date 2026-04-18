// ============================================================
// AI API Wrapper using Backend API via api-client.js
// ============================================================

import { openaiApi } from '../api-client.js';

export async function generateCaption(config) {
  const {
    platforms, tone = 'engaging', keywords = [],
    productInfo = '', targetAudience = '', language = 'vi'
  } = config;

  const systemPrompt = `Bạn là chuyên gia viết content mạng xã hội. Viết bằng ${language === 'vi' ? 'tiếng Việt' : 'English'}.`;

  const userPrompt = `
    Viết caption cho ${platforms.join(', ')}.
    Tone: ${tone}
    Sản phẩm/dịch vụ: ${productInfo}
    Khách hàng mục tiêu: ${targetAudience}
    Từ khóa: ${keywords.join(', ')}

    Trả về JSON: { "caption": "...", "hashtags": ["tag1","tag2"], "callToAction": "..." }
  `.trim();

  // Gọi qua backend proxy — API key an toàn
  const data = await openaiApi.chat([
    { role: 'system',  content: systemPrompt },
    { role: 'user',    content: userPrompt }
  ], { max_tokens: 600, temperature: 0.8 });

  const content = data.choices?.message?.content || '';
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI không trả về JSON hợp lệ');
  return JSON.parse(match[0]);
}
