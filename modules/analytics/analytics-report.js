// ============================================================
// Analytics Report — PDF Export (using browser print)
// ============================================================

import { getKPIs, getTopPosts, getHashtagStats, getContentTypeBreakdown } from './analytics-store.js';

/**
 * Generate a printable HTML report and trigger browser print dialog.
 * In production, this would call a backend endpoint to generate a real PDF.
 */
export function exportReport(options = {}) {
  const { platform = 'all', dateRange = '30 ngày' } = options;
  const kpis = getKPIs(platform);
  const topPosts = getTopPosts(platform, 5);
  const hashtags = getHashtagStats(platform).slice(0, 5);
  const contentTypes = getContentTypeBreakdown(platform);

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    if (window.Toast) window.Toast.show('Popup bị chặn. Cho phép popup để xuất báo cáo.', 'error');
    return;
  }

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Social Analytics Report — ${new Date().toLocaleDateString('vi-VN')}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', -apple-system, sans-serif; color: #1a1a1a; padding: 32px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
    h1 { font-size: 22px; color: #1e3a5f; margin-bottom: 4px; }
    h2 { font-size: 16px; color: #1e3a5f; margin: 24px 0 12px 0; border-bottom: 2px solid #38bdf8; padding-bottom: 4px; }
    .subtitle { font-size: 13px; color: #666; margin-bottom: 24px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
    .kpi-box { border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px; text-align: center; }
    .kpi-box .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
    .kpi-box .value { font-size: 24px; font-weight: 800; color: #1e3a5f; }
    .kpi-box .change { font-size: 12px; }
    .positive { color: #10B981; }
    .negative { color: #EF4444; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
    th { text-align: left; padding: 8px; background: #f5f5f5; font-size: 11px; text-transform: uppercase; color: #666; border-bottom: 1px solid #ddd; }
    td { padding: 8px; border-bottom: 1px solid #eee; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 11px; color: #999; text-align: center; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>📊 Social Analytics Report</h1>
  <div class="subtitle">
    Platform: ${platform === 'all' ? 'Tất cả' : platform} · Khoảng: ${dateRange} · Ngày: ${new Date().toLocaleDateString('vi-VN')}
  </div>

  <h2>KPI Tổng quan</h2>
  <div class="kpi-grid">
    <div class="kpi-box"><div class="label">Followers</div><div class="value">${formatNum(kpis.followers)}</div><div class="${kpis.followersGrowth >= 0 ? 'positive' : 'negative'}">▲ ${kpis.followersGrowth > 0 ? '+' : ''}${kpis.followersGrowth}</div></div>
    <div class="kpi-box"><div class="label">Reach</div><div class="value">${formatNum(kpis.reach)}</div></div>
    <div class="kpi-box"><div class="label">Impressions</div><div class="value">${formatNum(kpis.impressions)}</div></div>
    <div class="kpi-box"><div class="label">Engagement Rate</div><div class="value">${kpis.engagementRate}%</div></div>
    <div class="kpi-box"><div class="label">Bài đăng</div><div class="value">${kpis.postsCount}</div></div>
    <div class="kpi-box"><div class="label">Health Score</div><div class="value">${kpis.pageHealthScore || 74}/100</div></div>
  </div>

  <h2>Top Posts</h2>
  <table>
    <thead><tr><th>Nội dung</th><th>Platform</th><th>Reach</th><th>Likes</th><th>ER%</th></tr></thead>
    <tbody>
      ${topPosts.map(p => `<tr><td>${p.content.slice(0, 50)}...</td><td>${p.platform}</td><td>${formatNum(p.reach)}</td><td>${formatNum(p.likes)}</td><td>${p.engagementRate}%</td></tr>`).join('')}
    </tbody>
  </table>

  <h2>Top Hashtags</h2>
  <table>
    <thead><tr><th>Hashtag</th><th>Reach</th><th>Bài</th><th>Avg ER</th></tr></thead>
    <tbody>
      ${hashtags.map(h => `<tr><td>${h.tag}</td><td>${formatNum(h.reach)}</td><td>${h.posts}</td><td>${h.avgER}%</td></tr>`).join('')}
    </tbody>
  </table>

  <h2>Content Type Performance</h2>
  <table>
    <thead><tr><th>Loại</th><th>Số bài</th><th>Avg ER</th><th>Reach</th></tr></thead>
    <tbody>
      ${contentTypes.sort((a, b) => b.avgER - a.avgER).map(t => `<tr><td>${t.type}</td><td>${t.count}</td><td>${t.avgER}%</td><td>${formatNum(t.reach)}</td></tr>`).join('')}
    </tbody>
  </table>

  <div class="footer">
    Báo cáo tự động tạo bởi Social Tool · ${new Date().toLocaleString('vi-VN')}
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}

function formatNum(n) {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString('vi-VN');
}
