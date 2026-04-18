// ============================================================
// AI System Prompts — Vietnamese social media focus
// ============================================================

const SYSTEM_PROMPT = `Bạn là một copywriter chuyên nghiệp về Social Media Marketing tại Việt Nam.
Bạn hiểu tâm lý người dùng mạng xã hội Việt, biết cách viết content hấp dẫn,
gần gũi và thúc đẩy tương tác. Bạn luôn viết ngắn gọn, đúng platform.`;

const TONES = {
  professional: 'chuyên nghiệp, lịch sự, tin cậy',
  friendly:     'thân thiện, gần gũi, vui vẻ',
  urgent:       'gấp gáp, tạo cảm giác khan hiếm, thúc đẩy mua ngay',
  funny:        'hài hước, dí dỏm, dễ viral',
  inspiring:    'truyền cảm hứng, motivational, ý nghĩa'
};

const PLATFORM_HINTS = {
  facebook:  'Facebook (tối đa 400 từ, dùng emoji vừa phải, có thể dùng gạch đầu dòng)',
  instagram: 'Instagram (ngắn gọn <150 từ, nhiều emoji, kết thúc bằng call-to-action)',
  twitter:   'X/Twitter (tối đa 240 ký tự, súc tích, có thể dùng thread hint)',
  linkedin:  'LinkedIn (chuyên nghiệp, insight-driven, tối đa 200 từ)'
};

export function generateCaptionPrompt(topic, tone, platform) {
  return `${SYSTEM_PROMPT}

Viết 1 caption cho ${PLATFORM_HINTS[platform] || platform}.
Topic: ${topic}
Tone: ${TONES[tone] || tone}

Yêu cầu:
- Mở đầu hấp dẫn, kéo người đọc tiếp tục
- Có call-to-action ở cuối
- Phù hợp văn hóa Việt Nam
- Dùng emoji phù hợp (không quá nhiều)
- Chỉ trả về caption, không giải thích`;
}

export function rewritePrompt(originalText, tone) {
  return `${SYSTEM_PROMPT}

Rewrite bài social media sau đây theo tone "${TONES[tone] || tone}".
Giữ nguyên ý nghĩa chính, nhưng làm cho:
- Hấp dẫn và engaging hơn
- Tự nhiên, không AI-sounding
- Phù hợp với người dùng Việt Nam

Bài gốc:
"${originalText}"

Chỉ trả về bài đã rewrite, không giải thích.`;
}

export function hashtagPrompt(text, platform, count) {
  const platformTips = {
    instagram: 'Instagram: mix hashtags phổ biến (>1M) + trung bình (10K-1M) + niche (<10K)',
    facebook:  'Facebook: chỉ dùng 3-5 hashtags relevant nhất',
    linkedin:  'LinkedIn: 3-5 hashtags chuyên ngành',
    twitter:   'X/Twitter: 1-2 hashtags trending'
  };

  return `Gợi ý ${count} hashtag tiếng Việt và tiếng Anh cho bài social media sau.
Platform: ${platformTips[platform] || platform}

Bài: "${text}"

Trả về dạng: #hashtag1 #hashtag2 #hashtag3 ...
Sắp xếp từ phổ biến đến niche. Không giải thích.`;
}
