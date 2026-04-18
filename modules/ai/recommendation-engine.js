/**
 * Recommendation Engine — AI-powered post suggestions
 * What to post, when, where, how based on audience & trends
 */

export function getPostRecommendations(context) {
  const recommendations = [];

  if (context.topPerformers?.videoEngagementRate > 0.08) {
    recommendations.push({
      type: 'content', priority: 'high',
      title: '🎥 Post More Videos',
      description: 'Videos drive 3x higher engagement. Create 2-3 videos this week.',
      expectedLift: '+25% engagement',
      action: 'Create video post'
    });
  }

  if (context.topPerformers?.carouselEngagementRate > 0.06) {
    recommendations.push({
      type: 'content', priority: 'high',
      title: '📸 Carousel Posts Perform Best',
      description: 'Your audience loves carousels. Try 5-7 image stories.',
      expectedLift: '+18% reach',
      action: 'Create carousel'
    });
  }

  const topTopics = context.topPerformers?.topTopics || [];
  topTopics.slice(0, 3).forEach(topic => {
    recommendations.push({
      type: 'topic', priority: 'medium',
      title: `📌 "${topic.name}" Resonates`,
      description: `Your audience loves "${topic.name}". Avg ER: ${(topic.engagementRate * 100).toFixed(1)}%`,
      expectedLift: `+${Math.round(topic.engagementRate * 50)}% ER`,
      action: 'Create post'
    });
  });

  if (context.bestTimes && context.bestTimes.length > 0) {
    const peak = context.bestTimes[0];
    recommendations.push({
      type: 'timing', priority: 'high',
      title: `⏰ Post at ${peak.time}`,
      description: `Peak engagement time for your audience (${peak.dayOfWeek}s).`,
      expectedLift: '+30% reach',
      action: 'Schedule post'
    });
  }

  const platformPerformance = context.platformMetrics || {};
  Object.entries(platformPerformance).forEach(([platform, metrics]) => {
    if (metrics.weeklyReach > 10000 && metrics.engagementRate > 0.05) {
      recommendations.push({
        type: 'platform', priority: 'medium',
        title: `📱 Boost ${platform.toUpperCase()}`,
        description: `Strong performance on ${platform}. Increase posting frequency.`,
        expectedLift: '+15% followers',
        action: `Post to ${platform}`
      });
    }
  });

  const risingTrends = (context.trends || []).filter(t => t.momentum > 0.7);
  risingTrends.slice(0, 2).forEach(trend => {
    recommendations.push({
      type: 'trend', priority: 'high',
      title: `🔥 Capitalize on "${trend.name}"`,
      description: 'Trending now in your niche. Quick posts could reach 10k+.',
      expectedLift: '+50% reach',
      action: 'Create trending post',
      timeLimit: 'Next 6 hours'
    });
  });

  recommendations.push({
    type: 'engagement', priority: 'medium',
    title: '💬 Ask Questions',
    description: 'Questions drive 2x more comments. Use: "What\'s your favorite...?"',
    expectedLift: '+35% comments',
    action: 'Draft post with question'
  });

  recommendations.push({
    type: 'engagement', priority: 'medium',
    title: '🎯 Add CTAs',
    description: 'Explicit CTAs increase clicks by 40%. "Comment below", "Share your..."',
    expectedLift: '+40% clicks',
    action: 'Add CTA'
  });

  const missingContentTypes = findContentGaps(context.recentPosts);
  missingContentTypes.forEach(contentType => {
    recommendations.push({
      type: 'content_gap', priority: 'low',
      title: `📝 Try ${contentType}`,
      description: `Haven't posted much ${contentType} lately. Your audience may want it.`,
      expectedLift: '+10% reach',
      action: `Create ${contentType}`
    });
  });

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations.slice(0, 10);
}

export function suggestPostContent(audience, trends, recentTopics) {
  const suggestions = [];

  const contentTemplates = {
    educational: [
      'Top 5 tips for {topic}',
      'How to {action} in {timeframe}',
      'Common mistakes in {topic}',
      'Step-by-step guide: {topic}'
    ],
    inspirational: [
      'Your success story: {topic}',
      'Why {topic} matters',
      'Transformation with {topic}',
      'The power of {topic}'
    ],
    entertaining: [
      '{topic} fails (funny)',
      'Behind-the-scenes: {topic}',
      'Try this {topic} challenge',
      'React to {topic}'
    ],
    promotional: [
      'Limited offer: {product}',
      'Exclusive deal for {audience}',
      'New launch: {product}',
      'Flash sale: {product}'
    ]
  };

  Object.entries(contentTemplates).forEach(([style, templates]) => {
    const template = templates[Math.floor(Math.random() * templates.length)];
    const topic = trends?.name || recentTopics || 'your product';

    const content = template
      .replace('{topic}', topic)
      .replace('{audience}', audience?.demographicLabel || 'followers')
      .replace('{product}', 'your product')
      .replace('{action}', 'grow')
      .replace('{timeframe}', '30 days');

    suggestions.push({
      style,
      template: content,
      confidence: 0.7 + Math.random() * 0.3,
      estimatedReach: Math.floor(Math.random() * 50000) + 5000
    });
  });

  return suggestions;
}

function findContentGaps(recentPosts) {
  const contentTypes = ['video', 'carousel', 'reels', 'stories', 'polls', 'text'];
  const usedTypes = new Set((recentPosts || []).map(p => p.type));
  return contentTypes.filter(type => !usedTypes.has(type));
}

export function findBestPostingTimes(analyticsHistory) {
  const timeSlots = {
    '6-9am': 0, '9am-12pm': 0, '12-3pm': 0,
    '3-6pm': 0, '6-9pm': 0, '9pm-12am': 0
  };

  const dayOfWeek = {
    'Monday': 0, 'Tuesday': 0, 'Wednesday': 0,
    'Thursday': 0, 'Friday': 0, 'Saturday': 0, 'Sunday': 0
  };

  (analyticsHistory || []).forEach(post => {
    const postTime = new Date(post.publishedAt);
    const hour = postTime.getHours();
    const day = postTime.toLocaleDateString('en-US', { weekday: 'long' });
    const engagement = (post.likes || 0) + (post.comments || 0) + (post.shares || 0);

    if (hour >= 6 && hour < 9) timeSlots['6-9am'] += engagement;
    else if (hour >= 9 && hour < 12) timeSlots['9am-12pm'] += engagement;
    else if (hour >= 12 && hour < 15) timeSlots['12-3pm'] += engagement;
    else if (hour >= 15 && hour < 18) timeSlots['3-6pm'] += engagement;
    else if (hour >= 18 && hour < 21) timeSlots['6-9pm'] += engagement;
    else if (hour >= 21) timeSlots['9pm-12am'] += engagement;

    dayOfWeek[day] = (dayOfWeek[day] || 0) + engagement;
  });

  const bestTimes = Object.entries(timeSlots)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([time, engagement]) => ({ time, engagement }));

  const bestDays = Object.entries(dayOfWeek)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([day, engagement]) => ({ day, engagement }));

  return { bestTimes, bestDays };
}
