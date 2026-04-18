/**
 * Sentiment Analysis
 * Classify comments: Positive/Neutral/Negative
 * Crisis Detection when sentiment spikes negative
 */
import { getSentimentCache, setSentimentCache, addToHistory } from './ai-store.js';

// Safe AI caller
async function tryCallAI(messages, opts) {
  try {
    const { openaiApi } = await import('../api-client.js');
    return await openaiApi.chat(messages, opts);
  } catch { return null; }
}

// ── Keyword-based Local Classifier ───────────────────────────
const POSITIVE_KW = [
  'tốt', 'hay', 'đỉnh', 'xuất sắc', 'thích', 'yêu', 'tuyệt', 'ngon', 'ok', 'ổn',
  'chất', 'xịn', 'đẹp', 'nhanh', 'uy tín', 'hài lòng', '❤️', '🔥', '👍', '😍', '🥰',
  'awesome', 'great', 'love', 'perfect', 'amazing'
];

const NEGATIVE_KW = [
  'tệ', 'xấu', 'chậm', 'kém', 'lừa', 'dở', 'nát', 'lỗi', 'hỏng', 'thất vọng',
  'không hài lòng', 'tránh xa', 'cảnh báo', 'report', 'scam', 'fake', '👎', '😡', '🤬', '😤',
  'terrible', 'bad', 'worst', 'horrible'
];

function classifyLocalSentiment(text) {
  const lower = text.toLowerCase();
  let pos = 0, neg = 0;

  POSITIVE_KW.forEach(kw => { if (lower.includes(kw)) pos++; });
  NEGATIVE_KW.forEach(kw => { if (lower.includes(kw)) neg++; });

  if (pos > neg + 1)        return { label: 'positive', confidence: Math.min(0.95, 0.6 + pos * 0.08) };
  if (neg > pos + 1)        return { label: 'negative', confidence: Math.min(0.95, 0.6 + neg * 0.08) };
  if (neg > 0 && pos === 0) return { label: 'negative', confidence: 0.55 };
  return                           { label: 'neutral',  confidence: 0.70 };
}

// ── Analyze Comments Batch ────────────────────────────────────
export async function analyzeComments(postId, comments, useAI = false) {
  const cached = getSentimentCache(postId);
  if (cached) return cached;

  const results = comments.map(comment => ({
    id:     comment.id || crypto.randomUUID(),
    text:   comment.text,
    author: comment.author || 'Anonymous',
    ...classifyLocalSentiment(comment.text)
  }));

  if (useAI && comments.length > 0) {
    try {
      const prompt = `
Phân tích sentiment các comment (tiếng Việt/Anh). Trả về JSON array:

${comments.slice(0, 20).map((c, i) =>
  `${i}: "${c.text.slice(0, 100)}"`
).join('\n')}

Format: [{"index":0,"label":"positive|neutral|negative","confidence":0.0-1.0,"emotion":"happy|angry|sad|surprised|neutral"}]
Chỉ trả về JSON array.`;

      const result = await tryCallAI([{ role: 'user', content: prompt }], { max_tokens: 800 });
      if (result) {
        const raw = result.choices?.message?.content || result.choices?.[0]?.message?.content || '';
        const match = raw.match(/\[[\s\S]*\]/);
        if (match) {
          const aiResults = JSON.parse(match[0]);
          aiResults.forEach(r => {
            if (results[r.index]) {
              results[r.index].label      = r.label;
              results[r.index].confidence = r.confidence;
              results[r.index].emotion    = r.emotion;
              results[r.index].source     = 'ai';
            }
          });
        }
      }
    } catch (err) {
      console.warn('[Sentiment] AI error, using local:', err.message);
    }
  }

  // Aggregate
  const counts = { positive: 0, neutral: 0, negative: 0 };
  results.forEach(r => counts[r.label]++);
  const total = results.length || 1;

  const summary = {
    postId,
    total,
    positive: { count: counts.positive, pct: Math.round(counts.positive / total * 100) },
    neutral:  { count: counts.neutral,  pct: Math.round(counts.neutral  / total * 100) },
    negative: { count: counts.negative, pct: Math.round(counts.negative / total * 100) },
    overallScore: Math.round((counts.positive - counts.negative * 0.5) / total * 100),
    crisisAlert:  counts.negative / total > 0.4,
    comments: results,
    analyzedAt: new Date().toISOString()
  };

  setSentimentCache(postId, summary);
  addToHistory({ type: 'sentiment', input: { postId, count: comments.length }, output: summary });
  return summary;
}

// ── Page-level Sentiment ──────────────────────────────────────
export function analyzePageSentiment(allPostSentiments) {
  if (!allPostSentiments.length) return null;

  const totalPos = allPostSentiments.reduce((s, p) => s + p.positive.pct, 0);
  const totalNeg = allPostSentiments.reduce((s, p) => s + p.negative.pct, 0);
  const count    = allPostSentiments.length;

  const avgPos = Math.round(totalPos / count);
  const avgNeg = Math.round(totalNeg / count);
  const avgNeu = Math.max(0, 100 - avgPos - avgNeg);

  const recent     = allPostSentiments.slice(0, 7);
  const previous   = allPostSentiments.slice(7, 14);
  const recentNeg  = recent.reduce((s, p) => s + p.negative.pct, 0) / (recent.length || 1);
  const previousNeg = previous.reduce((s, p) => s + p.negative.pct, 0) / (previous.length || 1);
  const negTrend   = recentNeg - previousNeg;

  return {
    avgPositive: avgPos,
    avgNeutral:  avgNeu,
    avgNegative: avgNeg,
    overallHealth: avgPos >= 70 ? 'excellent' : avgPos >= 50 ? 'good' : avgPos >= 30 ? 'fair' : 'poor',
    crisisRisk: avgNeg > 35 || negTrend > 15,
    negTrend,
    recommendation: avgNeg > 30
      ? '🚨 Negative sentiment cao — review feedback và respond nhanh chóng'
      : avgPos < 50
      ? '📊 Cần cải thiện content để tăng positive engagement'
      : '✅ Sentiment ổn định — tiếp tục duy trì!'
  };
}

// ── Mock Comments (demo) ──────────────────────────────────────
export function getMockComments(count = 20) {
  const SAMPLES = [
    { text: 'Sản phẩm rất tốt, mình rất hài lòng! ❤️',       author: 'Nguyễn Lan'  },
    { text: 'Giao hàng nhanh, đóng gói cẩn thận 👍',           author: 'Trần Minh'   },
    { text: 'Chất lượng ok nhưng màu hơi khác ảnh',           author: 'Lê Hoa'      },
    { text: 'Dịch vụ tệ, chờ cả tuần không thấy hàng 😡',    author: 'Phạm Tuấn'   },
    { text: 'Tuyệt vời luôn! Mua lần 3 rồi vẫn thích 🔥',    author: 'Hoàng Mai'   },
    { text: 'Không như mô tả, thất vọng quá',                  author: 'Đinh Hùng'   },
    { text: 'Ổn áp, đang xem xét mua thêm',                   author: 'Vũ Trang'    },
    { text: 'Shop response nhanh, nhiệt tình ❤️',              author: 'Bùi Linh'    },
    { text: 'Hàng bị lỗi, đã nhắn tin nhưng chưa được xử lý', author: 'Cao Đức'     },
    { text: 'Xịn xò lắm, recommend cho mọi người 💯',         author: 'Đỗ Thu'      },
    { text: 'Giá hợp lý với chất lượng',                       author: 'Ngọc Ánh'    },
    { text: 'Bao bì đẹp, sản phẩm xịn quá 😍',                author: 'Thanh Hương' },
    { text: 'Lần 2 bị giao nhầm hàng rồi, buồn ghê',         author: 'Minh Châu'   },
    { text: 'Chất lượng ổn, sẽ quay lại',                     author: 'Khánh Vy'    },
    { text: 'Không đáng tiền, hàng fake 100%',                 author: 'Hải Yến'     }
  ];

  const result = [];
  for (let i = 0; i < count; i++) {
    const s = SAMPLES[i % SAMPLES.length];
    result.push({ id: `c-${i}`, text: s.text, author: s.author });
  }
  return result;
}
