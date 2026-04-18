/**
 * Trend Detection + Content Suggestions
 * Detect viral topics → suggest brand-relevant content
 */
import {
  getBrandVoice, getTrendsCache, setTrendsCache,
  isTrendsCacheStale, addToHistory
} from './ai-store.js';

// Safe AI caller
async function tryCallAI(messages, opts) {
  try {
    const { openaiApi } = await import('../api-client.js');
    return await openaiApi.chat(messages, opts);
  } catch { return null; }
}

// ── Mock Trending Topics (always have demo data) ──────────────
export function getMockTrends(industry = '') {
  const UNIVERSAL = [
    { topic: 'AI trong cuộc sống hàng ngày',  volume: 98400, growth: '+234%', category: 'Technology',  emoji: '🤖', whyTrending: 'AI tools phổ biến mạnh mẽ', contentIdeas: ['Top 5 AI tools miễn phí', 'AI có thể thay thế bạn không?', 'Demo AI tạo content'] },
    { topic: 'Sustainable living',            volume: 67200, growth: '+89%',  category: 'Lifestyle',   emoji: '🌱', whyTrending: 'Xu hướng xanh toàn cầu',    contentIdeas: ['Tips sống xanh đơn giản', 'Sản phẩm eco-friendly', 'Challenge 7 ngày xanh'] },
    { topic: 'Work-life balance 2026',        volume: 54100, growth: '+67%',  category: 'Career',      emoji: '⚖️', whyTrending: 'Gen Z ưu tiên sức khỏe',    contentIdeas: ['Routine buổi sáng hiệu quả', '4-day work week trend', 'Remote work tips'] },
    { topic: 'Side hustle & freelance',       volume: 48900, growth: '+145%', category: 'Business',    emoji: '💼', whyTrending: 'Thu nhập phụ tăng mạnh',     contentIdeas: ['5 side hustle dễ bắt đầu', 'Kiếm tiền từ social media', 'Từ 0 đến 10 triệu/tháng'] },
    { topic: 'Mental health awareness',       volume: 43200, growth: '+78%',  category: 'Health',      emoji: '🧠', whyTrending: 'Tháng sức khỏe tâm lý',     contentIdeas: ['Self-care routine', 'Dấu hiệu burnout', 'Mindfulness cho người bận rộn'] },
    { topic: 'Street food tour',              volume: 38700, growth: '+56%',  category: 'Food',        emoji: '🍜', whyTrending: 'Food vlog đang hot',         contentIdeas: ['Top 10 món ăn đường phố', 'Hidden gems TP.HCM', 'Food tour challenge'] },
    { topic: 'Budget travel tips',            volume: 35600, growth: '+112%', category: 'Travel',      emoji: '✈️', whyTrending: 'Mùa du lịch hè bắt đầu',   contentIdeas: ['Du lịch tiết kiệm hè 2026', 'Đặt vé máy bay giá rẻ', 'Checklist du lịch'] },
    { topic: 'Skincare routine mùa hè',       volume: 32100, growth: '+43%',  category: 'Beauty',      emoji: '☀️', whyTrending: 'Thời tiết nóng = skincare', contentIdeas: ['Sunscreen review', 'Routine chống nắng', 'Sản phẩm dưới 200k'] }
  ];

  const INDUSTRY_SPECIFIC = {
    'Thời trang & Lifestyle': [
      { topic: 'Y2K fashion comeback',  volume: 89000, growth: '+178%', category: 'Fashion', emoji: '👗', whyTrending: 'Trend thời trang 2000s quay lại', contentIdeas: ['Y2K outfit ideas', 'Phối đồ Y2K giá rẻ', 'Thời trang tuần hoàn'] },
      { topic: 'Capsule wardrobe 2026', volume: 56000, growth: '+92%',  category: 'Fashion', emoji: '👔', whyTrending: 'Minimalism trong thời trang',     contentIdeas: ['30 bộ từ 10 món đồ', 'Tủ quần áo tối giản', 'Đầu tư basic items'] }
    ],
    'Ẩm thực & F&B': [
      { topic: 'Ăn sạch - sống khỏe',  volume: 74000, growth: '+134%', category: 'Food',    emoji: '🥗', whyTrending: 'Healthy food trend mạnh',    contentIdeas: ['Meal prep 7 ngày', 'Thực đơn eat clean', 'Smoothie bowl recipes'] },
      { topic: 'Viral drinks TikTok',   volume: 61000, growth: '+289%', category: 'Food',    emoji: '🧋', whyTrending: 'Đồ uống viral trên TikTok', contentIdeas: ['Recreate viral drinks', 'Review đồ uống mới', 'Công thức tại nhà'] }
    ],
    'Công nghệ & SaaS': [
      { topic: 'No-code tools 2026',    volume: 82000, growth: '+201%', category: 'Tech',    emoji: '⚙️', whyTrending: 'Dân không-code tăng mạnh',     contentIdeas: ['Top 10 no-code tools', 'Xây app không cần code', 'So sánh Bubble vs Webflow'] },
      { topic: 'AI automation workflow', volume: 71000, growth: '+312%', category: 'Tech',    emoji: '🔄', whyTrending: 'Tự động hóa bằng AI',          contentIdeas: ['Automate workflow với AI', 'Zapier + ChatGPT', 'AI cho doanh nghiệp nhỏ'] }
    ],
    'Sức khỏe & Làm đẹp': [
      { topic: 'Glass skin trend',      volume: 68000, growth: '+156%', category: 'Beauty',  emoji: '✨', whyTrending: 'K-beauty glass skin trend',    contentIdeas: ['Glass skin routine', 'Sản phẩm Hàn Quốc top', 'Before/After glass skin'] },
      { topic: 'Gut health awareness',  volume: 52000, growth: '+98%',  category: 'Health',  emoji: '🦠', whyTrending: 'Sức khỏe đường ruột = da đẹp', contentIdeas: ['Probiotics review', 'Thực phẩm tốt cho ruột', 'Gut-skin connection'] }
    ],
    'Giáo dục & Đào tạo': [
      { topic: 'Micro-learning trend',  volume: 59000, growth: '+167%', category: 'Education', emoji: '📱', whyTrending: 'Học ngắn, nhớ lâu',          contentIdeas: ['5-minute learning tips', 'App học tập miễn phí', 'Pomodoro technique'] },
      { topic: 'AI trong giáo dục',     volume: 47000, growth: '+245%', category: 'Education', emoji: '🎓', whyTrending: 'ChatGPT thay đổi giáo dục',  contentIdeas: ['AI hỗ trợ học tập', 'Prompt hay cho học sinh', 'Giáo viên vs AI'] }
    ]
  };

  const specific = INDUSTRY_SPECIFIC[industry] || [];
  return [...specific, ...UNIVERSAL].slice(0, 8);
}

// ── Fetch Trends (AI-powered) ─────────────────────────────────
export async function fetchTrends(industry = '', platforms = ['facebook', 'instagram']) {
  if (!isTrendsCacheStale()) return getTrendsCache();

  try {
    const bv = getBrandVoice();

    const prompt = `
Bạn là social media trend analyst. Ngày: ${new Date().toLocaleDateString('vi-VN')}.
Ngành: ${industry || bv.industry || 'general'}
Platform: ${platforms.join(', ')}

Đưa ra 6 trending topics HOT NHẤT tại Việt Nam phù hợp ngành.

Trả về JSON array:
[{"topic":"...","volume":<số>,"growth":"+XX%","category":"...","emoji":"...","whyTrending":"lý do ngắn","contentIdeas":["idea1","idea2","idea3"]}]
Chỉ JSON array.`;

    const result = await tryCallAI([{ role: 'user', content: prompt }], { max_tokens: 1000 });
    if (result) {
      const raw = result.choices?.message?.content || result.choices?.[0]?.message?.content || '';
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        const trends = JSON.parse(match[0]);
        setTrendsCache(trends);
        return trends;
      }
    }
    throw new Error('no result');
  } catch (err) {
    console.warn('[Trends] Fallback to mock:', err.message);
    const mockTrends = getMockTrends(industry || getBrandVoice().industry);
    setTrendsCache(mockTrends);
    return mockTrends;
  }
}

// ── Generate Content from Trend ───────────────────────────────
export async function generateTrendContent(trend, platform) {
  const bv = getBrandVoice();

  const prompt = `
Tạo 1 bài đăng ${platform} về trending topic: "${trend.topic}"

Ngành: ${bv.industry || 'general'}
Tone: ${bv.tone || 'friendly'}
Ngôn ngữ: ${bv.language === 'en' ? 'English' : 'Tiếng Việt'}

Yêu cầu:
- Kết nối trend với brand tự nhiên
- Hook mạnh
- Phù hợp ${platform}

Trả về JSON:
{"text":"...","hashtags":["..."],"contentType":"image|video|carousel","mediaPrompt":"mô tả media","trendAngle":"góc khai thác"}`;

  try {
    const result = await tryCallAI([{ role: 'user', content: prompt }], { max_tokens: 600 });
    if (result) {
      const raw = result.choices?.message?.content || result.choices?.[0]?.message?.content || '';
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const data = JSON.parse(match[0]);
        addToHistory({ type: 'trend', input: { trend: trend.topic, platform }, output: data });
        return data;
      }
    }
    throw new Error('no result');
  } catch {
    const fallback = {
      text:        `${trend.emoji} ${trend.topic} đang là chủ đề hot!\n\nBạn đã biết về trend này chưa? Hãy cùng khám phá!\n\n${bv.cta || '👉 Xem ngay!'}`,
      hashtags:    ['#trending', '#' + trend.category.toLowerCase(), '#viral'],
      contentType: 'image',
      mediaPrompt: `Ảnh liên quan đến ${trend.topic}`,
      trendAngle:  'Khai thác độ viral của trend',
      isFallback:  true
    };
    addToHistory({ type: 'trend', input: { trend: trend.topic, platform }, output: fallback });
    return fallback;
  }
}
