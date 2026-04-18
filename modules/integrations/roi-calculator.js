/**
 * ROI Calculator — Calculate post ROI, ROAS, CPC, CAC
 * Track spend per post, revenue per post
 */

// Post ROI Data
let postROI = [];

// ── Log Post Cost ─────────────────────────────────────────────
export function logPostCost(postData) {
  const cost = {
    id: crypto.randomUUID(),
    postId: postData.id,
    platform: postData.platform,
    amount: postData.amount || 0,  // Ad spend
    currency: postData.currency || 'VND',
    costType: postData.type || 'ad_spend',  // ad_spend, content_creation, tools
    description: postData.description,
    createdAt: new Date().toISOString()
  };

  postROI.push(cost);
  return cost;
}

// ── Log Post Revenue ──────────────────────────────────────────
export function logPostRevenue(revenueData) {
  const revenue = {
    id: crypto.randomUUID(),
    postId: revenueData.postId,
    platform: revenueData.platform,
    amount: revenueData.amount || 0,
    currency: revenueData.currency || 'VND',
    revenueType: revenueData.type || 'sale',  // sale, lead, signup
    details: revenueData.details,
    createdAt: new Date().toISOString()
  };

  postROI.push(revenue);
  return revenue;
}

// ── Calculate Post ROI ────────────────────────────────────────
export function calculatePostROI(postId) {
  const records = postROI.filter(r => r.postId === postId);

  const costs = records.filter(r => !r.revenueType).reduce((sum, r) => sum + r.amount, 0);
  const revenue = records.filter(r => r.revenueType).reduce((sum, r) => sum + r.amount, 0);

  const roi = costs > 0 ? ((revenue - costs) / costs * 100).toFixed(2) : 0;
  const roas = costs > 0 ? (revenue / costs).toFixed(2) : 0;
  const profit = revenue - costs;

  return {
    postId,
    spend: costs,
    revenue,
    profit,
    roi: `${roi}%`,
    roas: `${roas}x`,
    breakEven: costs > 0,
    profitMargin: costs > 0 ? (profit / revenue * 100).toFixed(2) + '%' : 'N/A'
  };
}

// ── Calculate Platform ROI ────────────────────────────────────
export function calculatePlatformROI(platform, dateRange = null) {
  let records = postROI;

  if (platform) {
    records = records.filter(r => r.platform === platform);
  }

  if (dateRange) {
    records = records.filter(r => {
      const d = new Date(r.createdAt);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }

  const costs = records.filter(r => !r.revenueType).reduce((sum, r) => sum + r.amount, 0);
  const revenue = records.filter(r => r.revenueType).reduce((sum, r) => sum + r.amount, 0);

  const roi = costs > 0 ? ((revenue - costs) / costs * 100).toFixed(2) : 0;
  const roas = costs > 0 ? (revenue / costs).toFixed(2) : 0;

  return {
    platform,
    spend: costs,
    revenue,
    roi: `${roi}%`,
    roas: `${roas}x`,
    postCount: new Set(records.map(r => r.postId)).size,
    costPerPost: records.length > 0 ? (costs / new Set(records.map(r => r.postId)).size).toFixed(2) : 0
  };
}

// ── Calculate Cost Per Conversion ─────────────────────────────
export function calculateCPC(conversions, spend) {
  return conversions > 0 ? (spend / conversions).toFixed(2) : 0;
}

export function calculateCAC(newCustomers, spend) {
  return newCustomers > 0 ? (spend / newCustomers).toFixed(2) : 0;
}

export function calculateCOGS(revenue, margin) {
  // margin = (revenue - cogs) / revenue
  return revenue * (1 - margin);
}

// ── ROI by Campaign ───────────────────────────────────────────
export function getRoiByCampaign(campaign) {
  const posts = postROI.filter(r => r.campaign === campaign);

  const totalCosts = posts
    .filter(p => !p.revenueType)
    .reduce((sum, p) => sum + p.amount, 0);

  const totalRevenue = posts
    .filter(p => p.revenueType)
    .reduce((sum, p) => sum + p.amount, 0);

  const roi = totalCosts > 0 ? ((totalRevenue - totalCosts) / totalCosts * 100).toFixed(2) : 0;

  return {
    campaign,
    spend: totalCosts,
    revenue: totalRevenue,
    roi: `${roi}%`,
    postCount: new Set(posts.map(p => p.postId)).size
  };
}

// ── ROI History ───────────────────────────────────────────────
export function getROIHistory(limit = 100) {
  return [...postROI].slice(0, limit);
}

export function getROIStats() {
  const records = postROI;
  const costs = records.filter(r => !r.revenueType).reduce((sum, r) => sum + r.amount, 0);
  const revenue = records.filter(r => r.revenueType).reduce((sum, r) => sum + r.amount, 0);

  const roi = costs > 0 ? ((revenue - costs) / costs * 100).toFixed(2) : 0;

  return {
    totalSpend: costs,
    totalRevenue: revenue,
    totalProfit: revenue - costs,
    overallROI: `${roi}%`,
    recordCount: records.length
  };
}

// ── Projection ────────────────────────────────────────────────
export function projectROI(currentSpend, currentRevenue, projectedSpend) {
  // Simple linear projection
  const roas = currentSpend > 0 ? currentRevenue / currentSpend : 0;
  const projectedRevenue = projectedSpend * roas;
  const projectedProfit = projectedRevenue - projectedSpend;

  return {
    projectedSpend,
    projectedRevenue: projectedRevenue.toFixed(2),
    projectedProfit: projectedProfit.toFixed(2),
    projectedRoi: currentSpend > 0 ? (projectedProfit / projectedSpend * 100).toFixed(2) + '%' : 'N/A'
  };
}
