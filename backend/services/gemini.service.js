const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');
const dataService = require('./data.service');

class GeminiService {
    constructor() {
        const apiKey = process.env.GEMINI_API_KEY || config.gemini?.apiKey;
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        } else {
            console.warn('[Gemini] No API Key found, AI features will be disabled/mocked.');
        }
    }

    // ════════════════════════════════════════════════════════════
    // EXISTING: Suggest Replies (Inbox)
    // ════════════════════════════════════════════════════════════
    async suggestReplies(customerMessage, conversationHistory = [], contactInfo = {}) {
        if (!this.model) return this._mockSuggestReplies(customerMessage);

        const prompt = `
            Bạn là nhân viên chăm sóc khách hàng chuyên nghiệp, thân thiện.
            Thông tin khách: Tên ${contactInfo.displayName || 'Khách'}, Tags: ${(contactInfo.tags || []).join(',')}
            Lịch sử chat gần đây:
            ${conversationHistory.map(m => `${m.from}: ${m.text}`).join('\n')}
            
            Tin nhắn mới nhất của khách: "${customerMessage}"
            
            Dựa trên thông tin trên, hãy đề xuất 3 câu trả lời tiếp theo để shop dùng. Mỗi câu ngắn gọn, tự nhiên.
            Đồng thời phân tích cảm xúc (sentiment) của tin nhắn mới nhất thành một trong ba giá trị: "positive", "neutral", "negative".

            Trả về ĐÚNG chuẩn JSON format sau (không có markdown code block):
            {
                "replies": ["câu 1", "câu 2", "câu 3"],
                "sentiment": "positive"
            }
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const text = result.response.text().trim();
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanText);
        } catch (e) {
            console.error('[Gemini] Suggest Reply Error:', e);
            return this._mockSuggestReplies(customerMessage);
        }
    }

    _mockSuggestReplies(msg) {
        return {
            replies: [
                'Cảm ơn bạn đã quan tâm. Shop xin phép kiểm tra ạ.',
                'Chào bạn, shop sẽ liên hệ ngay!',
                'Bạn vui lòng cung cấp thêm thông tin giúp shop nhé.'
            ],
            sentiment: 'neutral'
        };
    }

    // ════════════════════════════════════════════════════════════
    // EXISTING: Compose Post
    // ════════════════════════════════════════════════════════════
    async compose(brandVoice, topic, platform, tone) {
        if (!this.model) return { text: "Mocked composed post using Gemini." };

        const prompt = `Viết 1 bài đăng cho mạng xã hội ${platform} với chủ đề: "${topic}".
Thương hiệu: "${brandVoice.name}". Ngành: ${brandVoice.industry}.
Văn phong (Tone): ${tone}.
Mục tiêu khách hàng: ${brandVoice.targetAudience || 'Mọi người'}.
Nội dung chính: ${(brandVoice.keyMessages || []).join(', ')}.
Từ cần tránh: ${(brandVoice.avoidWords || []).join(', ')}.

Trả về ĐÚNG chuẩn JSON format sau (không có markdown code block, không giải thích thêm):
{ "text": "nội dung bài post", "hashtags": ["#tag1", "#tag2"] }`;

        try {
            const result = await this.model.generateContent(prompt);
            const text = result.response.text().trim();
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanText);
        } catch (e) {
            console.error('[Gemini] Compose Error:', e);
            throw new Error('AI Content Generation failed');
        }
    }

    // ════════════════════════════════════════════════════════════
    // EXISTING: Repurpose Content
    // ════════════════════════════════════════════════════════════
    async repurpose(originalText, sourcePlatform, targetPlatforms) {
        if (!this.model) return targetPlatforms.reduce((acc, p) => ({ ...acc, [p]: { text: `Mock repurposed for ${p}: ` + originalText.substring(0,20) } }), {});

        const prompt = `Bạn là chuyên gia chuyển đổi nội dung. Hãy chuyển đoạn nội dung viết cho ${sourcePlatform} này sang các platform sau: ${targetPlatforms.join(', ')}.
Giữ nguyên ý chính nhưng thay đổi định dạng, văn phong cho phù hợp từng nền tảng (ví dụ: Instagram nhiều ảnh/hashtag, Twitter ngắn gọn, LinkedIn chuyên nghiệp/phân tích).

Nội dung gốc:
${originalText}

Trả về ĐÚNG chuẩn JSON format sau (không có markdown code block):
{
  "${targetPlatforms[0] || 'facebook'}": { "text": "nội dung...", "hashtags": ["#tag1"], "tip": "gợi ý thêm hình" }
}`;

        try {
            const result = await this.model.generateContent(prompt);
            const text = result.response.text().trim();
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanText);
        } catch (e) {
            console.error('[Gemini] Repurpose Error:', e);
            throw new Error('AI Repurpose failed');
        }
    }

    // ════════════════════════════════════════════════════════════
    // EXISTING: Chat
    // ════════════════════════════════════════════════════════════
    async chat(messages) {
        if (!this.model) return { choices: [{ message: { content: "Mock Chat Context" } }] };

        const prompt = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n') + '\n\nASSISTANT:';
        try {
            const result = await this.model.generateContent(prompt);
            return {
                choices: [{ message: { content: result.response.text() } }]
            };
        } catch (e) {
            console.error('[Gemini] Chat Error:', e);
            throw new Error('AI Chat failed');
        }
    }

    // ════════════════════════════════════════════════════════════
    // W1: AI BEST TIME TO POST
    // ════════════════════════════════════════════════════════════
    async analyzeOptimalTimes(engagementData = [], platform = 'facebook') {
        if (!this.model) return this._mockOptimalTimes();

        const prompt = `Bạn là chuyên gia Social Media Analytics. Dựa trên dữ liệu engagement sau đây, hãy phân tích và đề xuất thời điểm đăng bài tối ưu.

Platform: ${platform}
Dữ liệu engagement (mỗi entry: giờ đăng, engagement rate, reach):
${JSON.stringify(engagementData.slice(0, 50))}

Hãy phân tích và trả về ĐÚNG chuẩn JSON format (không markdown block):
{
  "bestTimes": [
    { "day": "monday", "hours": [9, 12, 18], "score": 95, "reason": "lý do" },
    { "day": "tuesday", "hours": [10, 14, 20], "score": 88, "reason": "lý do" }
  ],
  "heatmap": {
    "monday": [0,0,0,0,0,5,10,20,45,80,70,55,85,60,50,40,35,50,75,60,40,20,10,5],
    "tuesday": [0,0,0,0,0,5,15,25,50,75,65,60,80,55,45,35,30,55,70,55,35,15,8,3]
  },
  "insights": ["insight 1", "insight 2", "insight 3"],
  "summary": "Tóm tắt ngắn gọn về pattern engagement"
}

Lưu ý: Arrays heatmap có 24 giá trị (0-100) tương ứng 24 giờ trong ngày.
Nếu không có dữ liệu thực, hãy dùng best practices chung cho ${platform} tại Việt Nam.`;

        try {
            const result = await this.model.generateContent(prompt);
            return this._parseJSON(result.response.text());
        } catch (e) {
            console.error('[Gemini] Best Time Error:', e);
            return this._mockOptimalTimes();
        }
    }

    _mockOptimalTimes() {
        return {
            bestTimes: [
                { day: 'monday', hours: [9, 12, 19], score: 92, reason: 'Đầu tuần, mọi người check MXH sau giờ làm' },
                { day: 'wednesday', hours: [11, 14, 20], score: 88, reason: 'Giữa tuần, engagement cao vào buổi trưa' },
                { day: 'friday', hours: [10, 15, 21], score: 85, reason: 'Cuối tuần, người dùng thư giãn nhiều hơn' },
                { day: 'saturday', hours: [9, 14, 20], score: 90, reason: 'Cuối tuần là peak time cho MXH' },
            ],
            heatmap: {
                monday:    [0,0,0,0,0,5,10,20,45,80,70,55,85,60,50,40,35,50,75,90,60,40,20,5],
                tuesday:   [0,0,0,0,0,5,15,25,50,75,65,60,80,55,45,35,30,55,70,55,35,15,8,3],
                wednesday: [0,0,0,0,0,8,12,30,55,70,60,75,90,65,80,45,35,50,65,55,40,20,10,5],
                thursday:  [0,0,0,0,0,5,10,25,50,72,62,58,78,52,42,32,28,48,68,52,32,14,7,3],
                friday:    [0,0,0,0,0,8,15,28,48,68,75,65,72,58,50,85,40,55,70,60,45,25,12,5],
                saturday:  [0,0,0,0,5,10,15,25,40,85,78,70,65,55,80,70,60,55,65,75,90,50,25,10],
                sunday:    [0,0,0,0,5,8,12,20,35,70,65,60,55,50,72,65,55,50,60,70,80,45,20,8]
            },
            insights: [
                '📊 Peak engagement trên Facebook Việt Nam thường rơi vào 9-10h sáng và 19-21h tối',
                '📅 Thứ 7 và Chủ nhật có engagement cao hơn 20-30% so với ngày thường',
                '⏰ Tránh đăng từ 0-6h sáng vì lượng user online rất thấp'
            ],
            summary: 'Thời gian đăng bài tối ưu tập trung vào 2 khung: 9-12h sáng (commute & break) và 19-21h tối (after work). Cuối tuần engagement cao hơn ngày thường khoảng 25%.'
        };
    }

    // ════════════════════════════════════════════════════════════
    // W2: AI HASHTAG & KEYWORD SUGGESTER
    // ════════════════════════════════════════════════════════════
    async suggestHashtags(content, platform = 'facebook', language = 'vi') {
        if (!this.model) return this._mockHashtags(content);

        const prompt = `Bạn là chuyên gia SEO và Social Media Marketing tại Việt Nam.
Phân tích nội dung bài đăng sau và đề xuất hashtag phù hợp:

Nội dung: "${content}"
Platform: ${platform}
Ngôn ngữ: ${language}

Trả về ĐÚNG chuẩn JSON format (không markdown block):
{
  "primary": ["#hashtag1", "#hashtag2", "#hashtag3"],
  "secondary": ["#tag4", "#tag5", "#tag6", "#tag7"],
  "trending": ["#trending1", "#trending2"],
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "tips": "Gợi ý ngắn về cách dùng hashtag hiệu quả",
  "estimatedReach": "medium"
}

primary = hashtag trực tiếp liên quan đến nội dung (3-5 tag)
secondary = hashtag mở rộng phạm vi (4-7 tag)
trending = hashtag đang hot trên ${platform} liên quan chủ đề (1-3 tag)
keywords = từ khóa SEO chính (3-5 từ)
estimatedReach = "low" | "medium" | "high" | "viral"`;

        try {
            const result = await this.model.generateContent(prompt);
            return this._parseJSON(result.response.text());
        } catch (e) {
            console.error('[Gemini] Hashtag Error:', e);
            return this._mockHashtags(content);
        }
    }

    _mockHashtags(content) {
        return {
            primary: ['#socialmedia', '#marketing', '#digitalmarketing'],
            secondary: ['#business', '#growth', '#branding', '#success', '#strategy'],
            trending: ['#AI2026', '#ContentCreator'],
            keywords: ['social media', 'digital marketing', 'content strategy'],
            tips: 'Nên dùng 5-10 hashtag trên Facebook, pha trộn giữa popular tags và niche tags để tối ưu reach.',
            estimatedReach: 'medium'
        };
    }

    // ════════════════════════════════════════════════════════════
    // W3: AI AUTO-REPLY & MESSAGE CLASSIFIER
    // ════════════════════════════════════════════════════════════
    async classifyMessage(message, categories = null) {
        if (!this.model) return this._mockClassify(message);

        const defaultCategories = ['hoi_gia', 'khieu_nai', 'feedback_tot', 'hoi_san_pham', 'dat_hang', 'spam', 'khac'];
        const cats = categories || defaultCategories;

        const prompt = `Phân loại tin nhắn khách hàng sau vào 1 trong các danh mục: ${cats.join(', ')}.

Tin nhắn: "${message}"

Trả về ĐÚNG chuẩn JSON (không markdown block):
{
  "category": "danh_muc",
  "confidence": 0.95,
  "sentiment": "positive",
  "urgency": "medium",
  "intent": "mô tả ý định ngắn gọn"
}

urgency: "low" | "medium" | "high" | "critical"
sentiment: "positive" | "neutral" | "negative"`;

        try {
            const result = await this.model.generateContent(prompt);
            return this._parseJSON(result.response.text());
        } catch (e) {
            console.error('[Gemini] Classify Error:', e);
            return this._mockClassify(message);
        }
    }

    _mockClassify(msg) {
        return {
            category: 'hoi_san_pham',
            confidence: 0.85,
            sentiment: 'neutral',
            urgency: 'medium',
            intent: 'Khách hỏi về sản phẩm/dịch vụ'
        };
    }

    async autoReply(message, conversationHistory = [], brandVoice = {}) {
        if (!this.model) return this._mockAutoReply(message);

        const voice = brandVoice.name
            ? `Thương hiệu: ${brandVoice.name}. Ngành: ${brandVoice.industry}. Phong cách: ${brandVoice.tone || 'thân thiện, chuyên nghiệp'}. Các giá trị: ${(brandVoice.keyMessages || []).join(', ')}.`
            : 'Phong cách: thân thiện, chuyên nghiệp, giúp đỡ khách hàng.';

        const prompt = `Bạn là AI trợ lý trả lời tin nhắn khách hàng tự động.
${voice}

Lịch sử chat gần đây:
${conversationHistory.slice(-5).map(m => `${m.from}: ${m.text}`).join('\n')}

Tin nhắn mới: "${message}"

Hãy viết 1 câu trả lời tự động phù hợp. Giọng điệu tự nhiên, ngắn gọn, đúng brand voice.
Nếu tin nhắn là spam hoặc không liên quan, vẫn trả lời lịch sự.

Trả về ĐÚNG chuẩn JSON (không markdown block):
{
  "reply": "câu trả lời tự động",
  "confidence": 0.90,
  "needsHumanReview": false,
  "tags": ["tag1"],
  "action": "none"
}

confidence: 0-1 (dưới 0.7 thì nên chuyển cho người thật)
needsHumanReview: true nếu câu hỏi phức tạp hoặc nhạy cảm
action: "none" | "escalate" | "create_ticket" | "add_to_cart"`;

        try {
            const result = await this.model.generateContent(prompt);
            return this._parseJSON(result.response.text());
        } catch (e) {
            console.error('[Gemini] Auto Reply Error:', e);
            return this._mockAutoReply(message);
        }
    }

    _mockAutoReply(msg) {
        return {
            reply: 'Cảm ơn bạn đã nhắn tin! Shop sẽ phản hồi chi tiết trong vòng 5 phút ạ 😊',
            confidence: 0.75,
            needsHumanReview: true,
            tags: ['general'],
            action: 'none'
        };
    }

    // ════════════════════════════════════════════════════════════
    // W4: AI CONTENT PERFORMANCE PREDICTOR
    // ════════════════════════════════════════════════════════════
    async predictPerformance(content, platform = 'facebook', historicalData = []) {
        if (!this.model) return this._mockPredict(content);

        const prompt = `Bạn là chuyên gia phân tích Content Marketing với 10 năm kinh nghiệm.
Hãy đánh giá và dự đoán hiệu quả của bài đăng social media sau:

Nội dung: "${content}"
Platform: ${platform}
${historicalData.length > 0 ? `Dữ liệu posts trước đó (để so sánh): ${JSON.stringify(historicalData.slice(0, 10))}` : ''}

Trả về ĐÚNG chuẩn JSON (không markdown block):
{
  "overallScore": 78,
  "scores": {
    "hook": { "score": 85, "label": "Tốt", "feedback": "Phần mở đầu hấp dẫn" },
    "clarity": { "score": 70, "label": "Khá", "feedback": "Nên ngắn gọn hơn" },
    "emotion": { "score": 80, "label": "Tốt", "feedback": "Có cảm xúc rõ ràng" },
    "cta": { "score": 60, "label": "TB", "feedback": "Thiếu call-to-action rõ ràng" },
    "hashtags": { "score": 75, "label": "Khá", "feedback": "Hashtag phù hợp" },
    "length": { "score": 90, "label": "Xuất sắc", "feedback": "Độ dài phù hợp" }
  },
  "predictedEngagement": {
    "likes": "150-300",
    "comments": "20-50",
    "shares": "10-25",
    "reach": "2000-5000"
  },
  "improvements": [
    { "priority": "high", "suggestion": "Thêm CTA cuối bài", "impact": "+25% engagement" },
    { "priority": "medium", "suggestion": "Thêm emoji để tăng cảm xúc", "impact": "+15% clicks" }
  ],
  "viralPotential": "medium",
  "bestTimeToPost": "19:00-21:00",
  "summary": "Nhận xét tổng quan ngắn gọn"
}

overallScore: 0-100
viralPotential: "low" | "medium" | "high" | "viral"`;

        try {
            const result = await this.model.generateContent(prompt);
            return this._parseJSON(result.response.text());
        } catch (e) {
            console.error('[Gemini] Predict Error:', e);
            return this._mockPredict(content);
        }
    }

    _mockPredict(content) {
        const len = (content || '').length;
        const base = Math.min(95, Math.max(40, 50 + Math.floor(len / 10)));
        return {
            overallScore: base,
            scores: {
                hook: { score: base + 5, label: 'Tốt', feedback: 'Phần hook khá hấp dẫn' },
                clarity: { score: base - 5, label: 'Khá', feedback: 'Rõ ràng, dễ hiểu' },
                emotion: { score: base, label: 'Khá', feedback: 'Có cảm xúc' },
                cta: { score: base - 10, label: 'TB', feedback: 'Nên thêm CTA mạnh hơn' },
                hashtags: { score: base - 5, label: 'Khá', feedback: 'Hashtags cơ bản' },
                length: { score: base + 8, label: 'Tốt', feedback: 'Độ dài phù hợp' }
            },
            predictedEngagement: { likes: '100-250', comments: '15-40', shares: '5-15', reach: '1500-4000' },
            improvements: [
                { priority: 'high', suggestion: 'Thêm câu CTA cuối bài để tăng tương tác', impact: '+25% engagement' },
                { priority: 'medium', suggestion: 'Thêm 2-3 emoji phù hợp', impact: '+15% clicks' },
                { priority: 'low', suggestion: 'Xem xét thêm câu hỏi để kích thích comment', impact: '+10% comments' }
            ],
            viralPotential: 'medium',
            bestTimeToPost: '19:00-21:00',
            summary: `Bài viết có nội dung khá, cần bổ sung CTA và emoji để tăng engagement.`
        };
    }

    // ════════════════════════════════════════════════════════════
    // W5: AI ANALYTICS REPORT GENERATOR
    // ════════════════════════════════════════════════════════════
    async generateReport(analyticsData, period = '7 ngày', brandName = 'SocialHub') {
        if (!this.model) return this._mockReport(analyticsData, period, brandName);

        const prompt = `Bạn là chuyên gia báo cáo Social Media Analytics cấp Director.
Hãy tạo một báo cáo executive summary dựa trên dữ liệu sau:

Thương hiệu: ${brandName}
Giai đoạn: ${period}
Dữ liệu:
${JSON.stringify(analyticsData, null, 2)}

Trả về ĐÚNG chuẩn JSON (không markdown block):
{
  "title": "Báo cáo Social Media - ${brandName}",
  "period": "${period}",
  "executiveSummary": "Tóm tắt cho cấp quản lý (3-4 câu)",
  "highlights": [
    { "icon": "📈", "metric": "Followers", "value": "+X%", "trend": "up", "insight": "giải thích" },
    { "icon": "💬", "metric": "Engagement", "value": "X%", "trend": "up", "insight": "giải thích" }
  ],
  "topPerformingContent": [
    { "content": "preview nội dung...", "engagement": 500, "reason": "vì sao nổi bật" }
  ],
  "recommendations": [
    { "priority": "high", "action": "Hành động cụ thể", "expectedImpact": "+X% metric" }
  ],
  "weekOverWeek": {
    "followers": { "current": 1000, "previous": 950, "change": "+5.3%" },
    "engagement": { "current": 4.2, "previous": 3.8, "change": "+10.5%" },
    "reach": { "current": 15000, "previous": 12000, "change": "+25%" }
  },
  "nextSteps": "Gợi ý chiến lược cho giai đoạn tiếp theo"
}`;

        try {
            const result = await this.model.generateContent(prompt);
            return this._parseJSON(result.response.text());
        } catch (e) {
            console.error('[Gemini] Report Error:', e);
            return this._mockReport(analyticsData, period, brandName);
        }
    }

    _mockReport(data, period, brandName) {
        return {
            title: `Báo cáo Social Media — ${brandName}`,
            period,
            executiveSummary: `Trong ${period} qua, ${brandName} đã đạt tăng trưởng tích cực trên các chỉ số chính. Followers tăng 5.3%, engagement rate đạt 4.2% (vượt trung bình ngành 3.5%). Chiến lược content hiện tại đang phát huy hiệu quả tốt.`,
            highlights: [
                { icon: '📈', metric: 'Followers', value: '+5.3%', trend: 'up', insight: 'Tăng đều nhờ chiến lược content đa dạng' },
                { icon: '💬', metric: 'Engagement Rate', value: '4.2%', trend: 'up', insight: 'Vượt benchmark ngành (3.5%)' },
                { icon: '👁️', metric: 'Reach', value: '+25%', trend: 'up', insight: 'Tăng mạnh nhờ bài viral cuối tuần' },
                { icon: '📩', metric: 'Messages', value: '+12%', trend: 'up', insight: 'Tỷ lệ phản hồi dưới 1 giờ đạt 85%' }
            ],
            topPerformingContent: [
                { content: 'Bài giới thiệu sản phẩm mới...', engagement: 520, reason: 'Hình ảnh bắt mắt + CTA rõ ràng' },
                { content: 'Behind the scenes team...', engagement: 380, reason: 'Content authentic, tạo kết nối cảm xúc' }
            ],
            recommendations: [
                { priority: 'high', action: 'Tăng tần suất video Reels lên 3 bài/tuần', expectedImpact: '+30% reach' },
                { priority: 'medium', action: 'Triển khai chiến dịch UGC với hashtag branded', expectedImpact: '+20% engagement' },
                { priority: 'low', action: 'Test A/B giờ đăng bài giữa 19h vs 21h', expectedImpact: '+10% impressions' }
            ],
            weekOverWeek: {
                followers: { current: 1050, previous: 998, change: '+5.3%' },
                engagement: { current: 4.2, previous: 3.8, change: '+10.5%' },
                reach: { current: 15200, previous: 12100, change: '+25.6%' }
            },
            nextSteps: 'Tuần tới nên tập trung vào video ngắn và tận dụng trend đang hot để duy trì momentum tăng trưởng. Cân nhắc collab với micro-influencer trong ngành.'
        };
    }

    // ════════════════════════════════════════════════════════════
    // BRAND VOICE PROFILE (CRUD)
    // ════════════════════════════════════════════════════════════
    async getBrandVoice() {
        return await dataService.read('brand_voice') || {
            name: '',
            industry: '',
            tone: 'thân thiện, chuyên nghiệp',
            targetAudience: '',
            keyMessages: [],
            avoidWords: [],
            samplePosts: [],
            autoReplyEnabled: false,
            autoReplyConfidenceThreshold: 0.8
        };
    }

    async saveBrandVoice(data) {
        await dataService.write('brand_voice', {
            ...data,
            updatedAt: new Date().toISOString()
        });
        return data;
    }

    // ── Helper: Parse JSON safely ───────────────────────────────
    _parseJSON(text) {
        const clean = text.trim().replace(/```json/g, '').replace(/```/g, '').trim();
        try {
            return JSON.parse(clean);
        } catch (e) {
            // Try to extract JSON from response
            const match = clean.match(/\{[\s\S]*\}/);
            if (match) return JSON.parse(match[0]);
            throw new Error('Failed to parse AI response as JSON');
        }
    }
}

module.exports = new GeminiService();
