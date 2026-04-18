/**
 * Predictive Analytics — Forecast post performance, audience growth
 */

export function predictPostPerformance(post, historicalData) {
  const similarPosts = (historicalData || []).filter(p =>
    p.platform === post.platform && p.type === post.type
  );

  // If no similar data, return estimated defaults
  const avgImpressions = similarPosts.length > 0
    ? similarPosts.reduce((sum, p) => sum + (p.impressions || 0), 0) / similarPosts.length
    : 5000 + Math.random() * 15000;
  const avgER = similarPosts.length > 0
    ? similarPosts.reduce((sum, p) => sum + (p.engagementRate || 0), 0) / similarPosts.length
    : 0.03 + Math.random() * 0.04;
  const avgLikes = similarPosts.length > 0
    ? similarPosts.reduce((sum, p) => sum + (p.likes || 0), 0) / similarPosts.length
    : 200 + Math.random() * 500;

  const contentScore = calculateContentScore(post);
  const timeQuality = getTimeQuality(post.scheduledAt || new Date().toISOString());

  return {
    postId: post.id,
    predictedImpressions: Math.floor(avgImpressions * (0.8 + contentScore * 0.4)),
    predictedEngagementRate: avgER * (0.7 + contentScore * 0.3 + timeQuality * 0.2),
    predictedLikes: Math.floor(avgLikes * (0.8 + contentScore * 0.4)),
    predictedComments: Math.floor((avgLikes * 0.15) * (1 + contentScore * 0.3)),
    predictedShares: Math.floor((avgLikes * 0.05) * (1 + contentScore * 0.2)),
    confidence: 0.65 + (Math.min(1, Math.max(1, similarPosts.length) / 100) * 0.35),
    factors: {
      contentQuality: contentScore,
      timingQuality: timeQuality,
      seasonalFactor: getSeasonalFactor(),
      trendBoost: getTrendBoost(post)
    }
  };
}

export function predictFollowerGrowth(currentFollowers, historicalGrowthData, days = 30) {
  if (!historicalGrowthData || historicalGrowthData.length < 7) {
    // Generate mock data
    historicalGrowthData = Array.from({ length: 30 }, (_, i) =>
      currentFollowers - (30 - i) * (Math.random() * 20 + 10)
    );
  }

  const growthRates = [];
  for (let i = 1; i < historicalGrowthData.length; i++) {
    const rate = (historicalGrowthData[i] - historicalGrowthData[i - 1]) / Math.max(1, historicalGrowthData[i - 1]);
    growthRates.push(rate);
  }

  const avgGrowthRate = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
  const growthTrend = growthRates[growthRates.length - 1];
  const projectedRate = (avgGrowthRate * 0.7) + (growthTrend * 0.3);

  let projectedFollowers = currentFollowers;
  const dailyProjection = [];
  for (let i = 1; i <= days; i++) {
    projectedFollowers = projectedFollowers * (1 + projectedRate);
    dailyProjection.push(Math.floor(projectedFollowers));
  }

  return {
    currentFollowers,
    projectedFollowers: Math.floor(projectedFollowers),
    projectedGrowth: Math.floor(projectedFollowers - currentFollowers),
    growthRate: (projectedRate * 100).toFixed(2) + '%',
    dailyProjection,
    confidence: 0.6 + (Math.min(1, historicalGrowthData.length / 365) * 0.4)
  };
}

export function predictBestPostTime(audience, platform) {
  const timeScores = {};
  for (let hour = 0; hour < 24; hour++) {
    let score = 50;
    if (audience.demographics?.ageGroups?.['18-24'] > 40) {
      if (hour >= 19 && hour <= 23) score += 30;
    } else if (audience.demographics?.ageGroups?.['35-44'] > 40) {
      if ((hour >= 7 && hour <= 9) || (hour >= 12 && hour <= 13)) score += 30;
    }
    if (platform === 'instagram') {
      if (hour === 19 || hour === 20) score += 20;
    } else if (platform === 'linkedin') {
      if ((hour >= 7 && hour <= 9) || (hour === 12)) score += 20;
    }
    timeScores[`${hour}:00`] = score;
  }

  const bestHours = Object.entries(timeScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return {
    recommendedTimes: bestHours.map(([time, score]) => ({
      time, confidence: (score / 100 * 0.7 + 0.3)
    })),
    timeZone: audience.demographics?.timeZone || 'UTC'
  };
}

function calculateContentScore(post) {
  let score = 0.5;
  const textLength = post.text?.length || 0;
  const hasHashtags = (post.text?.match(/#\w+/g) || []).length > 0;
  const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(post.text || '');
  const hasCTA = post.text?.toLowerCase().includes('click') || post.text?.toLowerCase().includes('learn');
  const hasMedia = !!post.mediaUrl;
  if (textLength >= 80 && textLength <= 280) score += 0.1;
  if (hasHashtags) score += 0.1;
  if (hasEmoji) score += 0.05;
  if (hasCTA) score += 0.1;
  if (hasMedia) score += 0.15;
  return Math.min(1, score);
}

function getTimeQuality(scheduledAt) {
  const hour = new Date(scheduledAt).getHours();
  if ((hour >= 7 && hour <= 9) || hour === 12 || (hour >= 18 && hour <= 21)) return 1.0;
  if (hour >= 6 && hour <= 22) return 0.7;
  return 0.3;
}

function getSeasonalFactor() {
  const month = new Date().getMonth();
  const m = { 0: 1.1, 6: 1.15, 11: 1.25 };
  return m[month] || 1.0;
}

function getTrendBoost(post) {
  return 0.9 + Math.random() * 0.2;
}
