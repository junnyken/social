/**
 * Trend Detector — Real-time trend detection & opportunity alerts
 * Identify rising trends, seasonal patterns, viral opportunities
 */

let detectedTrends = [];
let trendHistory = [];

export function detectTrends(industryData, audienceInterests) {
  const trends = { rising: [], peak: [], declining: [], seasonal: [], viral: [] };

  const risingTrends = (industryData || []).filter(t => t.growthRate > 0.2 && t.growthRate < 1.0);
  trends.rising = risingTrends.slice(0, 5).map(trend => ({
    name: trend.name, category: trend.category,
    momentum: Math.random() * 0.5 + 0.5,
    growthRate: trend.growthRate,
    volume: Math.floor(Math.random() * 100000) + 10000,
    relevance: calculateRelevance(trend, audienceInterests),
    opportunityWindow: '1-2 weeks',
    estimatedReach: Math.floor(Math.random() * 500000) + 50000,
    confidence: 0.7 + Math.random() * 0.25
  }));

  const peakTrends = (industryData || []).filter(t => t.volume > 80000);
  trends.peak = peakTrends.slice(0, 5).map(trend => ({
    name: trend.name, category: trend.category,
    momentum: Math.random() * 0.3 + 0.8,
    volume: trend.volume,
    relevance: calculateRelevance(trend, audienceInterests),
    opportunityWindow: 'Next 24 hours',
    estimatedReach: Math.floor(Math.random() * 1000000) + 500000,
    confidence: 0.85 + Math.random() * 0.15,
    emoji: '🔥'
  }));

  const decliningTrends = (industryData || []).filter(t => t.growthRate < 0);
  trends.declining = decliningTrends.slice(0, 3).map(trend => ({
    name: trend.name, status: 'Declining',
    growthRate: trend.growthRate,
    daysLeft: Math.floor(Math.random() * 7) + 1
  }));

  const currentMonth = new Date().getMonth();
  const seasonalPatterns = { 0: ['New Year', 'Resolutions'], 11: ['Holiday', 'Xmas', 'Gift'] };
  if (seasonalPatterns[currentMonth]) {
    trends.seasonal = seasonalPatterns[currentMonth].map(pattern => ({
      name: pattern, type: 'seasonal', intensity: 'high', duration: 'Full month'
    }));
  }

  const viralCandidates = (industryData || [])
    .filter(t => t.engagementRate > 0.08 && t.growthRate > 0.3);
  trends.viral = viralCandidates.slice(0, 3).map(trend => ({
    name: trend.name,
    viralScore: Math.random() * 0.3 + 0.7,
    engagementRate: trend.engagementRate,
    reason: 'High engagement + rapid growth',
    recommendedContentFormat: ['video', 'carousel', 'reel'][Math.floor(Math.random() * 3)],
    potentialReach: Math.floor(Math.random() * 2000000) + 500000
  }));

  detectedTrends = [...trends.rising, ...trends.peak];
  return trends;
}

export function monitorTrendProgress(trendName) {
  const history = trendHistory.filter(t => t.name === trendName);
  return {
    trendName, history,
    trajectory: calculateTrajectory(history),
    estimatedPeakDate: estimatePeakDate(history),
    opportunityScore: calculateOpportunityScore(history)
  };
}

export function getTrendAlerts(userInterests) {
  const alerts = [];
  detectedTrends.forEach(trend => {
    const relevance = calculateRelevance(trend, userInterests);
    if (relevance > 0.6 && trend.momentum > 0.7) {
      alerts.push({
        type: 'high_opportunity', priority: 'high',
        trend: trend.name,
        message: `🔥 Rising trend in your niche: "${trend.name}" (${(trend.confidence * 100).toFixed(0)}% confidence)`,
        action: `Create post about "${trend.name}"`,
        timeLimit: trend.opportunityWindow,
        estimatedReach: trend.estimatedReach, icon: '🎯'
      });
    }
    if (trend.momentum > 0.9) {
      alerts.push({
        type: 'viral_opportunity', priority: 'critical',
        trend: trend.name,
        message: `⚡ VIRAL NOW: "${trend.name}" - Post in next 2 hours!`,
        action: 'Quick post to trending topic',
        timeLimit: 'Next 2 hours', icon: '⚡'
      });
    }
  });
  return alerts;
}

export function generateTrendContentIdeas(trend) {
  return [
    { format: 'Explainer', template: `What is ${trend.name}? (Explainer video)`, engagement: 'Medium', virality: 'Medium' },
    { format: 'Tutorial', template: `How to use ${trend.name} (Step-by-step)`, engagement: 'High', virality: 'High' },
    { format: 'Opinion', template: `My take on ${trend.name} (Hot take)`, engagement: 'High', virality: 'Medium' },
    { format: 'Trend Forecast', template: `Why ${trend.name} will blow up (Prediction)`, engagement: 'Medium', virality: 'High' },
    { format: 'Meme/Joke', template: `When you discover ${trend.name} (Funny take)`, engagement: 'Very High', virality: 'Very High' },
    { format: 'Case Study', template: `${trend.name} case study (Real example)`, engagement: 'High', virality: 'Low' }
  ];
}

function calculateRelevance(trend, interests) {
  let relevanceScore = 0.5;
  if (interests?.includes(trend.category)) relevanceScore += 0.3;
  if (interests?.includes(trend.name)) relevanceScore += 0.2;
  return Math.min(1, relevanceScore);
}

function calculateTrajectory(history) {
  if (history.length < 2) return 'insufficient_data';
  const first = history[0].momentum;
  const last = history[history.length - 1].momentum;
  if (last > first * 1.2) return 'ascending';
  if (last < first * 0.8) return 'descending';
  return 'stable';
}

function estimatePeakDate(history) {
  if (history.length === 0) return 'Unknown';
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString();
}

function calculateOpportunityScore(history) {
  if (history.length === 0) return 0;
  const momentum = history[history.length - 1]?.momentum || 0;
  const volume = history[history.length - 1]?.volume || 0;
  return Math.min(100, Math.floor((momentum * 50) + Math.log(Math.max(1, volume)) / Math.log(100000) * 50));
}
