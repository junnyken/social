// ============================================================
// Analytics Competitive — Competitor tracking helpers
// ============================================================

import { getCompetitors, getKPIs, INDUSTRY_BENCHMARKS } from './analytics-store.js';

/**
 * Generate a competitive analysis report
 */
export function getCompetitiveReport(platform = 'facebook') {
  const myKPIs = getKPIs(platform);
  const competitors = getCompetitors();
  const benchmarks = INDUSTRY_BENCHMARKS[platform] || INDUSTRY_BENCHMARKS.facebook;

  const report = {
    platform,
    yourMetrics: {
      followers: myKPIs.followers,
      engagementRate: myKPIs.engagementRate,
      reach: myKPIs.reach,
      postsPerWeek: Math.round(myKPIs.postsCount / 4),
      healthScore: myKPIs.pageHealthScore || 0
    },
    competitors: competitors.map(comp => ({
      name: comp.name,
      ...comp.metrics
    })),
    benchmarks,
    insights: []
  };

  // Generate insights
  if (competitors.length > 0) {
    const avgCompER = competitors.reduce((sum, c) => sum + parseFloat(c.metrics.engagementRate), 0) / competitors.length;
    const avgCompFollowers = competitors.reduce((sum, c) => sum + c.metrics.followers, 0) / competitors.length;

    if (myKPIs.engagementRate > avgCompER) {
      report.insights.push({
        type: 'positive',
        icon: '🎉',
        text: `ER của bạn (${myKPIs.engagementRate}%) cao hơn trung bình đối thủ (${avgCompER.toFixed(1)}%)`,
        recommendation: 'Tiếp tục chiến lược content hiện tại, tập trung scale reach.'
      });
    } else {
      report.insights.push({
        type: 'warning',
        icon: '⚠️',
        text: `ER của bạn (${myKPIs.engagementRate}%) thấp hơn trung bình đối thủ (${avgCompER.toFixed(1)}%)`,
        recommendation: 'Phân tích content đối thủ có ER cao, thử format video/carousel nhiều hơn.'
      });
    }

    if (myKPIs.followers > avgCompFollowers) {
      report.insights.push({
        type: 'positive',
        icon: '👑',
        text: `Bạn dẫn đầu về followers (${formatNum(myKPIs.followers)} vs TB ${formatNum(Math.round(avgCompFollowers))})`,
        recommendation: 'Tập trung chuyển followers thành khách hàng, tối ưu conversion.'
      });
    }

    // Benchmark comparison
    if (myKPIs.engagementRate >= benchmarks.greatER) {
      report.insights.push({
        type: 'positive', icon: '🏆',
        text: `ER xuất sắc! Vượt chuẩn ngành (${benchmarks.greatER}%)`,
        recommendation: 'Bạn đang làm rất tốt. Cân nhắc mở rộng sang platform khác.'
      });
    } else if (myKPIs.engagementRate >= benchmarks.goodER) {
      report.insights.push({
        type: 'info', icon: '👍',
        text: `ER tốt, đạt mức "Good" cho ${platform}`,
        recommendation: 'Thử A/B test content types để push lên mức "Great".'
      });
    } else {
      report.insights.push({
        type: 'warning', icon: '📉',
        text: `ER dưới mức trung bình ngành (${benchmarks.avgER}%)`,
        recommendation: 'Review quy trình content: tăng video, giảm link posts, đăng đúng giờ vàng.'
      });
    }
  }

  return report;
}

/**
 * Rank your page vs competitors for a specific metric
 */
export function getRankings(metric = 'engagementRate') {
  const myKPIs = getKPIs('facebook');
  const competitors = getCompetitors();

  const entries = [
    { name: 'Bạn', value: _getMetricValue(myKPIs, metric), isYou: true },
    ...competitors.map(c => ({
      name: c.name,
      value: _getMetricValue(c.metrics, metric),
      isYou: false
    }))
  ];

  entries.sort((a, b) => b.value - a.value);
  return entries.map((e, i) => ({ ...e, rank: i + 1 }));
}

function _getMetricValue(metrics, metric) {
  const val = metrics[metric];
  return typeof val === 'string' ? parseFloat(val) : (val || 0);
}

function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}
