const dataService = require('./data.service');

// ── Vietnamese Sentiment Dictionary (Server-side) ──────────────
const POSITIVE_WORDS = new Set([
    'tốt','hay','đẹp','ngon','tuyệt','xuất sắc','thích','yêu','tuyệt vời',
    'chất lượng','hài lòng','ưng','ok','ổn','được','hoàn hảo','cảm ơn',
    'recommend','giỏi','nhanh','uy tín','chuyên nghiệp','đáng','worth',
    'hợp lý','rẻ','tiết kiệm','pro','xịn','đỉnh','chill','smooth',
    'dễ thương','cute','xinh','sáng tạo','bền','mới','hot','trending',
    'amazing','great','love','best','excellent','perfect','awesome',
    'fantastic','wonderful','brilliant','superb','outstanding',
    'đáng giá','phục vụ tốt','giao nhanh','đóng gói đẹp','nhiệt tình',
    'chu đáo','tận tâm','thân thiện','hỗ trợ tốt','giá tốt'
]);

const NEGATIVE_WORDS = new Set([
    'tệ','xấu','dở','kém','thất vọng','tức','bực','chán','ghét',
    'lừa','scam','giả','fake','không tốt','phí','waste',
    'chậm','trễ','sai','lỗi','hỏng','bể','vỡ','mất','thiếu',
    'phàn nàn','complaint','refund','hoàn tiền','đắt','mắc',
    'cũ','fail','thua','hư','gãy','rách','tồi','bẩn','kém chất lượng',
    'bad','terrible','worst','awful','horrible','poor','disappointed',
    'giao chậm','đóng gói tệ','thái độ kém','không nhiệt tình','hàng lỗi'
]);

function serverAnalyzeSentiment(text) {
    if (!text) return { label: 'neutral', score: 0 };
    const normalized = text.toLowerCase();
    const words = normalized.split(/\s+/);
    let pos = 0, neg = 0;

    words.forEach(word => {
        if (POSITIVE_WORDS.has(word)) pos++;
        if (NEGATIVE_WORDS.has(word)) neg++;
    });

    // Check 2-gram
    for (let i = 0; i < words.length - 1; i++) {
        const bigram = words[i] + ' ' + words[i + 1];
        if (POSITIVE_WORDS.has(bigram)) pos += 1.5;
        if (NEGATIVE_WORDS.has(bigram)) neg += 1.5;
    }

    // Negation patterns
    const negations = normalized.match(/(không|chẳng|chưa|ko|k)\s+\w+/g) || [];
    negations.forEach(phrase => {
        const afterWord = phrase.split(/\s+/)[1];
        if (POSITIVE_WORDS.has(afterWord)) { pos -= 1; neg += 0.5; }
        if (NEGATIVE_WORDS.has(afterWord)) { neg -= 0.5; pos += 0.5; }
    });

    const total = pos + neg || 1;
    const score = parseFloat(((pos - neg) / total).toFixed(2)); // -1.0 to +1.0

    let label = 'neutral';
    if (score > 0.2) label = 'positive';
    else if (score < -0.2) label = 'negative';

    return { label, score };
}

class ListeningService {
    // ── Keywords CRUD ───────────────────────────────────────────
    async getKeywords() {
        return await dataService.read('listening_keywords');
    }

    async addKeyword(term) {
        const keywords = await this.getKeywords();
        const colors = ['#1877F2','#E1306C','#10B981','#F59E0B','#8B5CF6','#EC4899','#14B8A6','#F97316'];
        const kw = {
            id: require('crypto').randomUUID(),
            term: term.toLowerCase().trim(),
            color: colors[keywords.length % colors.length],
            createdAt: new Date().toISOString(),
            mentionCount: 0
        };
        keywords.push(kw);
        await dataService.write('listening_keywords', keywords);
        return kw;
    }

    async removeKeyword(id) {
        let keywords = await this.getKeywords();
        keywords = keywords.filter(k => k.id !== id);
        await dataService.write('listening_keywords', keywords);
        return true;
    }

    // ── Mentions ────────────────────────────────────────────────
    async getMentions(filters = {}) {
        let mentions = await dataService.read('listening_mentions');
        if (filters.keyword) mentions = mentions.filter(m => m.keyword === filters.keyword);
        if (filters.platform) mentions = mentions.filter(m => m.platform === filters.platform);
        if (filters.sentiment) mentions = mentions.filter(m => m.sentiment === filters.sentiment);
        if (filters.range) {
            const days = parseInt(filters.range) || 30;
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);
            mentions = mentions.filter(m => new Date(m.timestamp) >= cutoff);
        }
        // Sort newest first, limit 200
        return mentions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 200);
    }

    async saveMention(mention) {
        const mentions = await dataService.read('listening_mentions');
        // Analyze sentiment server-side
        const sentimentResult = serverAnalyzeSentiment(mention.text);
        mention.sentiment = sentimentResult.label;
        mention.sentimentScore = sentimentResult.score;
        mention.id = mention.id || require('crypto').randomUUID();
        mention.timestamp = mention.timestamp || new Date().toISOString();
        mentions.unshift(mention);
        // Keep max 2000 mentions
        if (mentions.length > 2000) mentions.length = 2000;
        await dataService.write('listening_mentions', mentions);

        // Update keyword mention count
        if (mention.keyword) {
            const keywords = await this.getKeywords();
            const kw = keywords.find(k => k.term === mention.keyword);
            if (kw) {
                kw.mentionCount = (kw.mentionCount || 0) + 1;
                await dataService.write('listening_keywords', keywords);
            }
        }
        return mention;
    }

    // ── Sentiment Analytics ─────────────────────────────────────
    async getSentimentSummary() {
        const mentions = await dataService.read('listening_mentions');
        const counts = { positive: 0, neutral: 0, negative: 0, total: mentions.length };
        let scoreSum = 0;
        mentions.forEach(m => {
            if (counts[m.sentiment] !== undefined) counts[m.sentiment]++;
            scoreSum += (m.sentimentScore || 0);
        });
        counts.avgScore = mentions.length > 0 ? parseFloat((scoreSum / mentions.length).toFixed(2)) : 0;
        // Brand health: normalize avg score from [-1,1] to [0,100]
        counts.brandHealth = Math.round(((counts.avgScore + 1) / 2) * 100);
        return counts;
    }

    async getSentimentTrends(range = 30) {
        const mentions = await dataService.read('listening_mentions');
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - range);

        const byDay = {};
        mentions.forEach(m => {
            const d = new Date(m.timestamp);
            if (d < cutoff) return;
            const dateKey = d.toISOString().slice(0, 10);
            if (!byDay[dateKey]) byDay[dateKey] = { date: dateKey, positive: 0, neutral: 0, negative: 0, total: 0, scoreSum: 0 };
            byDay[dateKey][m.sentiment || 'neutral']++;
            byDay[dateKey].total++;
            byDay[dateKey].scoreSum += (m.sentimentScore || 0);
        });

        return Object.values(byDay)
            .map(d => ({ ...d, avgScore: d.total > 0 ? parseFloat((d.scoreSum / d.total).toFixed(2)) : 0 }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    // ── Alerts ──────────────────────────────────────────────────
    async getAlerts() {
        const mentions = await dataService.read('listening_mentions');
        const alerts = [];
        const now = new Date();

        // Check last 24 hours
        const recent = mentions.filter(m => (now - new Date(m.timestamp)) < 86400000);
        if (recent.length > 0) {
            const negCount = recent.filter(m => m.sentiment === 'negative').length;
            const negRatio = negCount / recent.length;
            if (negRatio > 0.5) {
                alerts.push({
                    type: 'crisis',
                    level: 'critical',
                    title: '🚨 Crisis Alert: Sentiment tiêu cực vượt 50%',
                    message: `${negCount}/${recent.length} mentions trong 24h qua là tiêu cực (${(negRatio * 100).toFixed(0)}%)`,
                    timestamp: now.toISOString()
                });
            } else if (negRatio > 0.3) {
                alerts.push({
                    type: 'warning',
                    level: 'warning',
                    title: '⚠️ Cảnh báo: Sentiment tiêu cực tăng',
                    message: `${(negRatio * 100).toFixed(0)}% mentions tiêu cực trong 24h qua`,
                    timestamp: now.toISOString()
                });
            }
        }

        // Spike detection: compare last 24h with previous 24h
        const prev24 = mentions.filter(m => {
            const diff = now - new Date(m.timestamp);
            return diff >= 86400000 && diff < 172800000;
        });
        if (prev24.length > 0 && recent.length > prev24.length * 2) {
            alerts.push({
                type: 'spike',
                level: 'info',
                title: '📈 Mention Spike detected',
                message: `${recent.length} mentions trong 24h (tăng ${Math.round((recent.length / prev24.length - 1) * 100)}% so với hôm qua)`,
                timestamp: now.toISOString()
            });
        }

        return alerts;
    }

    // ── Bulk Analyze ────────────────────────────────────────────
    analyzeSentiment(text) {
        return serverAnalyzeSentiment(text);
    }
}

module.exports = new ListeningService();
