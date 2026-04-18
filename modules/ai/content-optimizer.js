/**
 * Content Optimizer — AI-powered content enhancement
 * Analyze & optimize text, hashtags, calls-to-action, timing
 */

export function optimizePostContent(post) {
  const analysis = {
    original: post.text,
    score: 0,
    suggestions: [],
    optimized: post.text,
    metrics: {}
  };

  const textLength = post.text.length;
  const platform = post.platform;

  const idealLengths = {
    facebook: { min: 80, ideal: 150, max: 500 },
    instagram: { min: 50, ideal: 125, max: 2200 },
    twitter: { min: 50, ideal: 100, max: 280 },
    linkedin: { min: 100, ideal: 200, max: 3000 },
    tiktok: { min: 20, ideal: 50, max: 150 }
  };

  const ideal = idealLengths[platform] || { min: 50, ideal: 100, max: 280 };

  if (textLength < ideal.min) {
    analysis.suggestions.push({
      type: 'length', severity: 'high',
      message: `Post too short for ${platform}. Ideal: ${ideal.ideal} chars.`,
      impact: -15
    });
  } else if (textLength > ideal.max) {
    analysis.suggestions.push({
      type: 'length', severity: 'medium',
      message: `Post exceeds ${platform} limit (${textLength}/${ideal.max}).`,
      impact: -10
    });
  } else {
    analysis.suggestions.push({
      type: 'length', severity: 'info',
      message: `Perfect length for ${platform}!`,
      impact: +10
    });
  }

  // ── Hashtag Analysis ────────────────────────────────────
  const hashtags = (post.text.match(/#\w+/g) || []);
  const hashtagCount = hashtags.length;

  const idealHashtagCounts = {
    facebook: { min: 0, ideal: 1, max: 2 },
    instagram: { min: 3, ideal: 15, max: 30 },
    twitter: { min: 1, ideal: 2, max: 3 },
    linkedin: { min: 1, ideal: 3, max: 5 },
    tiktok: { min: 1, ideal: 3, max: 5 }
  };

  const hashtagIdeal = idealHashtagCounts[platform] || { min: 1, ideal: 3, max: 5 };

  if (hashtagCount < hashtagIdeal.min) {
    analysis.suggestions.push({
      type: 'hashtags', severity: 'medium',
      message: `Add ${hashtagIdeal.ideal - hashtagCount} hashtags for better reach.`,
      impact: +8
    });
  } else if (hashtagCount > hashtagIdeal.max) {
    analysis.suggestions.push({
      type: 'hashtags', severity: 'medium',
      message: `Too many hashtags (${hashtagCount}). Max: ${hashtagIdeal.max}.`,
      impact: -8
    });
  } else {
    analysis.suggestions.push({
      type: 'hashtags', severity: 'info',
      message: `Hashtag count optimal (${hashtagCount}).`,
      impact: +5
    });
  }

  // ── Call-to-Action (CTA) Detection ──────────────────────
  const ctaKeywords = ['click', 'learn', 'discover', 'share', 'like', 'comment',
                       'subscribe', 'follow', 'sign up', 'download', 'shop', 'buy',
                       'register', 'try', 'join', 'get', 'see', 'read'];

  const hasCTA = ctaKeywords.some(cta => post.text.toLowerCase().includes(cta));

  if (!hasCTA) {
    analysis.suggestions.push({
      type: 'cta', severity: 'high',
      message: 'Missing call-to-action. Add "Learn more", "Click here", etc.',
      impact: -12
    });
  } else {
    analysis.suggestions.push({
      type: 'cta', severity: 'info',
      message: 'Strong call-to-action detected!',
      impact: +10
    });
  }

  // ── Emoji Usage ─────────────────────────────────────────
  const emojis = (post.text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []);
  const emojiCount = emojis.length;

  const idealEmojiCounts = {
    facebook: { min: 0, ideal: 1, max: 3 },
    instagram: { min: 1, ideal: 3, max: 5 },
    twitter: { min: 0, ideal: 1, max: 2 },
    linkedin: { min: 0, ideal: 1, max: 2 },
    tiktok: { min: 1, ideal: 2, max: 4 }
  };

  const emojiIdeal = idealEmojiCounts[platform] || { min: 0, ideal: 1, max: 3 };

  if (emojiCount < emojiIdeal.min && emojiIdeal.min > 0) {
    analysis.suggestions.push({
      type: 'emoji', severity: 'low',
      message: `Add emoji to increase engagement (ideal: ${emojiIdeal.ideal}).`,
      impact: +5
    });
  } else if (emojiCount > emojiIdeal.max) {
    analysis.suggestions.push({
      type: 'emoji', severity: 'low',
      message: `Too many emojis (${emojiCount}). Reduce to ${emojiIdeal.max}.`,
      impact: -3
    });
  } else {
    analysis.suggestions.push({
      type: 'emoji', severity: 'info',
      message: 'Emoji usage perfect!',
      impact: +3
    });
  }

  // ── Sentiment Analysis ──────────────────────────────────
  const sentiment = analyzeSentiment(post.text);

  if (sentiment.score < 0.3) {
    analysis.suggestions.push({
      type: 'sentiment', severity: 'medium',
      message: 'Negative tone detected. Consider more positive language.',
      impact: -8
    });
  } else if (sentiment.score > 0.7) {
    analysis.suggestions.push({
      type: 'sentiment', severity: 'info',
      message: 'Great positive sentiment! Highly engaging.',
      impact: +8
    });
  }

  // ── Mention & Tag Analysis ──────────────────────────────
  const mentions = (post.text.match(/@\w+/g) || []);

  if (mentions.length > 0 && mentions.length <= 3) {
    analysis.suggestions.push({
      type: 'mentions', severity: 'info',
      message: `${mentions.length} mention(s) detected. Increases engagement!`,
      impact: +7
    });
  } else if (mentions.length > 3) {
    analysis.suggestions.push({
      type: 'mentions', severity: 'low',
      message: `Too many mentions (${mentions.length}). Max: 3.`,
      impact: -3
    });
  }

  // ── URL Analysis ────────────────────────────────────────
  const urls = (post.text.match(/https?:\/\/\S+/g) || []);

  if (urls.length > 1) {
    analysis.suggestions.push({
      type: 'url', severity: 'low',
      message: 'Multiple URLs detected. Keep to 1 for best CTR.',
      impact: -3
    });
  } else if (urls.length === 1) {
    analysis.suggestions.push({
      type: 'url', severity: 'info',
      message: 'URL included. Perfect for driving traffic!',
      impact: +8
    });
  }

  // ── Calculate Overall Score ─────────────────────────────
  const baseScore = 50;
  const scoreAdjustment = analysis.suggestions
    .reduce((sum, s) => sum + (s.impact || 0), 0);

  analysis.score = Math.max(0, Math.min(100, baseScore + scoreAdjustment));

  analysis.metrics = {
    textLength,
    hashtagCount,
    emojiCount,
    mentionCount: mentions.length,
    urlCount: urls.length,
    sentiment: sentiment.score,
    sentimentLabel: sentiment.label
  };

  return analysis;
}

// ── Sentiment Analysis (Mock) ───────────────────────────────
function analyzeSentiment(text) {
  const positiveWords = ['love', 'great', 'awesome', 'amazing', 'fantastic',
                         'excellent', 'wonderful', 'beautiful', 'perfect', 'happy'];
  const negativeWords = ['hate', 'bad', 'terrible', 'awful', 'horrible', 'poor',
                         'disappointing', 'sad', 'angry', 'frustrated'];

  const lower = text.toLowerCase();
  const posCount = positiveWords.filter(w => lower.includes(w)).length;
  const negCount = negativeWords.filter(w => lower.includes(w)).length;

  const score = (posCount - negCount) / Math.max(1, posCount + negCount);
  const normalizedScore = (score + 1) / 2;

  let label = 'neutral';
  if (normalizedScore > 0.6) label = 'positive';
  if (normalizedScore < 0.4) label = 'negative';

  return { score: normalizedScore, label };
}

// ── Generate Optimized Version ──────────────────────────────
export function generateOptimizedContent(post) {
  let optimized = post.text;
  const platform = post.platform;

  if (!optimized.toLowerCase().includes('learn more') &&
      !optimized.toLowerCase().includes('click')) {
    const ctas = {
      facebook: '\n\n👉 Learn more →',
      instagram: '\n\n✨ Tap link in bio!',
      twitter: '\n\nRead more →',
      linkedin: '\n\n💼 Connect with us!',
      tiktok: '\n\n👆 Subscribe for more!'
    };
    optimized += ctas[platform] || '\n\n👉 Learn more!';
  }

  if (platform === 'instagram') {
    const hashtags = (optimized.match(/#\w+/g) || []);
    if (hashtags.length < 10) {
      optimized += ' #socialmedia #marketing #content #business #digital';
    }
  }

  return optimized;
}

// ── Best Practices Score Card ───────────────────────────────
export function getContentScorecard(post) {
  const analysis = optimizePostContent(post);

  return {
    postId: post.id,
    overallScore: analysis.score,
    scoreLabel: analysis.score >= 80 ? '🟢 Excellent' :
                analysis.score >= 60 ? '🟡 Good' :
                analysis.score >= 40 ? '🟠 Fair' : '🔴 Needs Work',
    suggestions: analysis.suggestions,
    metrics: analysis.metrics,
    recommendations: analysis.suggestions
      .filter(s => s.severity !== 'info')
      .map(s => s.message)
  };
}
