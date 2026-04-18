const express = require('express');
const router = express.Router();
const Analytics = require('../models/Analytics');
const Post = require('../models/Post');
const { verifyToken } = require('../middleware');

/**
 * GET /api/analytics/workspace
 * Get workspace analytics
 */
router.get('/workspace', verifyToken, async (req, res) => {
  try {
    const { workspaceId, period = 'week' } = req.query;

    const dates = getDateRange(period);

    const analytics = await Analytics.find({
      workspaceId,
      date: { $gte: dates.start, $lte: dates.end }
    }).sort({ date: -1 });

    const totalMetrics = aggregateMetrics(analytics);
    const trends = calculateTrends(analytics);
    const topPosts = await getTopPosts(workspaceId, dates);

    res.json({
      metrics: totalMetrics,
      trends,
      topPosts,
      period
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/analytics/posts/:id
 * Get post analytics
 */
router.get('/posts/:id', verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const analytics = await Analytics.find({ postId: req.params.id });

    res.json({
      post,
      analytics,
      totalMetrics: aggregateMetrics(analytics)
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/analytics/export
 * Export analytics as CSV/JSON
 */
router.get('/export', verifyToken, async (req, res) => {
  try {
    const { workspaceId, format = 'csv', period = 'month' } = req.query;

    const dates = getDateRange(period);

    const analytics = await Analytics.find({
      workspaceId,
      date: { $gte: dates.start, $lte: dates.end }
    });

    if (format === 'csv') {
      const csv = convertToCSV(analytics);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="analytics.csv"');
      res.send(csv);
    } else {
      res.json(analytics);
    }

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

function getDateRange(period) {
  const end = new Date();
  let start = new Date();

  switch(period) {
    case 'week':
      start.setDate(end.getDate() - 7);
      break;
    case 'month':
      start.setMonth(end.getMonth() - 1);
      break;
    case 'quarter':
      start.setMonth(end.getMonth() - 3);
      break;
    case 'year':
      start.setFullYear(end.getFullYear() - 1);
      break;
  }

  return { start, end };
}

function aggregateMetrics(analytics) {
  return analytics.reduce((acc, a) => ({
    impressions: (acc.impressions || 0) + (a.metrics.impressions || 0),
    reach: (acc.reach || 0) + (a.metrics.reach || 0),
    clicks: (acc.clicks || 0) + (a.metrics.clicks || 0),
    likes: (acc.likes || 0) + (a.metrics.likes || 0),
    comments: (acc.comments || 0) + (a.metrics.comments || 0),
    shares: (acc.shares || 0) + (a.metrics.shares || 0)
  }), {});
}

function calculateTrends(analytics) {
  // Calculate growth trends
  return {
    impressionsTrend: calculateGrowth(analytics, 'impressions'),
    engagementTrend: calculateGrowth(analytics, 'engagement'),
    reachTrend: calculateGrowth(analytics, 'reach')
  };
}

function calculateGrowth(analytics, metric) {
  if (analytics.length < 2) return 0;
  const first = analytics[analytics.length - 1].metrics[metric] || 0;
  const last = analytics[0].metrics[metric] || 0;
  return ((last - first) / first) * 100;
}

function convertToCSV(data) {
  // Convert analytics to CSV format
  const headers = ['Date', 'Platform', 'Impressions', 'Reach', 'Clicks', 'Likes', 'Comments', 'Shares'];
  const rows = data.map(d => [
    d.date,
    d.platform,
    d.metrics.impressions,
    d.metrics.reach,
    d.metrics.clicks,
    d.metrics.likes,
    d.metrics.comments,
    d.metrics.shares
  ]);

  return [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');
}

module.exports = router;
