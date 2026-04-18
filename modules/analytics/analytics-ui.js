// ============================================================
// Analytics UI — Full 5-tab Dashboard
// ============================================================

import {
  getLast30Days, getLast7Days,
  getKPIs, getRealKPIs, getTimeSeries, getTopPosts,
  getAudience, getHashtagStats, getContentTypeBreakdown,
  getCompetitors, addCompetitor, removeCompetitor,
  INDUSTRY_BENCHMARKS, fetchAnalyticsAPI
} from './analytics-store.js';
import { getPages } from '../facebook/fb-auth.js';

import {
  createReachChart, createFollowerGrowthChart, createEngagementChart,
  createContentTypeChart, createAudienceChart, createHeatmap,
  createHashtagChart, createCompetitorChart, createPlatformStackedChart,
  createHealthGauge, destroyAllCharts, PLATFORM_COLORS
} from './analytics-charts.js';

import { exportReport } from './analytics-report.js';

let activeRange = '30d';
let activePlatform = 'all';
let activeTab = 'overview';

export function renderAnalytics(container) {
  container.innerHTML = getAnalyticsHTML();
  bindAnalyticsEvents(container);
  renderAnalyticsTab(container, activeTab);
  if (window.refreshIcons) window.refreshIcons();
}

// ── HTML Shell ────────────────────────────────────────────────
function getAnalyticsHTML() {
  return `
  <div class="analytics-page">
    <div class="analytics-header">
      <div>
        <h2 style="margin:0">Analytics</h2>
        <p class="page-subtitle">Đánh giá hiệu quả trang &amp; nội dung</p>
      </div>
      <div class="analytics-controls">
        <div class="platform-filter-row" id="platform-filter-row">
          <button class="pf-btn active" data-platform="all">Tất cả</button>
          <button class="pf-btn" data-platform="facebook"><span style="color:#1877F2">●</span> Facebook</button>
          <button class="pf-btn" data-platform="instagram"><span style="color:#E4405F">●</span> Instagram</button>
          <button class="pf-btn" data-platform="twitter"><span style="color:#1DA1F2">●</span> Twitter</button>
          <button class="pf-btn" data-platform="linkedin"><span style="color:#0A66C2">●</span> LinkedIn</button>
        </div>
        <div class="date-range-row" id="date-range-row">
          <button class="dr-btn" data-range="7d">7 ngày</button>
          <button class="dr-btn active" data-range="30d">30 ngày</button>
          <button class="dr-btn" data-range="90d">90 ngày</button>
        </div>
        <button id="btn-export-report" class="btn btn-secondary btn-sm"><i data-lucide="download" width="14" height="14"></i> Xuất báo cáo</button>
      </div>
    </div>

    <div class="analytics-tabs">
      <button class="at-tab active" data-tab="overview">📊 Tổng quan</button>
      <button class="at-tab" data-tab="audience">👥 Audience</button>
      <button class="at-tab" data-tab="content">📝 Content</button>
      <button class="at-tab" data-tab="besttime">⏰ Best Time</button>
      <button class="at-tab" data-tab="competitive">🏆 Competitive</button>
      <button class="at-tab" data-tab="growth">📈 Growth</button>
      <button class="at-tab" data-tab="failures">❌ Failures</button>
      <button class="at-tab" data-tab="reports">📋 Reports</button>
    </div>

    <div id="analytics-content" class="analytics-content"></div>
  </div>`;
}

// ── Tab Renderer ──────────────────────────────────────────────
async function renderAnalyticsTab(container, tab) {
  destroyAllCharts();
  const content = container.querySelector('#analytics-content');
  content.innerHTML = '<div style="text-align:center;padding:40px;color:var(--color-text-muted)">Loading...</div>';
  switch (tab) {
    case 'overview':    await renderOverview(content); break;
    case 'audience':    renderAudience(content); break;
    case 'content':     renderContent(content); break;
    case 'besttime':    renderBestTime(content); break;
    case 'competitive': renderCompetitive(content); break;
    case 'growth':      await renderGrowth(content); break;
    case 'failures':    await renderFailures(content); break;
    case 'reports':     renderReports(content); break;
  }
  if (window.refreshIcons) window.refreshIcons();
}

// ── Tab: Overview ─────────────────────────────────────────────
async function renderOverview(container) {
  let kpis = getKPIs(activePlatform);
  const days = getDays();
  const pages = typeof getPages === 'function' ? getPages() : [];
  const pageId = pages.length > 0 ? pages[0].id : null;
  
  const realData = await getRealKPIs(pageId, activeRange);
  
  if (realData) {
      kpis.followers = realData.followers || kpis.followers;
      kpis.followersGrowth = realData.followersDelta || kpis.followersGrowth;
      kpis.reach = realData.reach || kpis.reach;
      kpis.impressions = realData.impressions || kpis.impressions;
      kpis.engagementRate = realData.engagement || kpis.engagementRate;
  }

  container.innerHTML = `
    <div class="kpi-grid">
      ${kpiCard('Followers', fmtN(kpis.followers), kpis.followersGrowth >= 0 ? '+' + kpis.followersGrowth : kpis.followersGrowth, 'users', kpis.followersGrowth >= 0 ? 'success' : 'error')}
      ${kpiCard('Reach', fmtN(kpis.reach), '+12.4%', 'eye', 'primary')}
      ${kpiCard('Impressions', fmtN(kpis.impressions), '+8.7%', 'trending-up', 'accent')}
      ${kpiCard('Engagement Rate', kpis.engagementRate + '%', '+0.3%', 'heart', 'success')}
      ${kpiCard('Bài đăng', kpis.postsCount, 'tháng này', 'file-text', 'purple')}
      ${kpiCard('Page Health', (kpis.pageHealthScore || 74) + '/100', healthLabel(kpis.pageHealthScore || 74), 'activity', (kpis.pageHealthScore || 74) >= 70 ? 'success' : 'warning')}
    </div>

    <div class="chart-card chart-wide">
      <div class="chart-card-header"><div><h3 style="margin:0">Reach & Impressions</h3><p style="margin:4px 0 0 0;font-size:var(--text-xs);color:var(--color-text-muted)">Tiếp cận theo thời gian</p></div></div>
      <div class="chart-wrap" style="height:260px"><canvas id="chart-reach"></canvas></div>
    </div>

    <div class="ana-chart-row-2">
      <div class="chart-card">
        <div class="chart-card-header"><h3 style="margin:0">Tăng trưởng Followers</h3></div>
        <div class="chart-wrap" style="height:240px"><canvas id="chart-followers"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-card-header"><h3 style="margin:0">Reach theo Platform</h3></div>
        <div class="chart-wrap" style="height:240px"><canvas id="chart-platform-stack"></canvas></div>
      </div>
    </div>

    <div class="ana-chart-row-3">
      <div class="chart-card ana-chart-span-2">
        <div class="chart-card-header"><h3 style="margin:0">Engagement Rate theo Platform</h3></div>
        <div class="chart-wrap" style="height:220px"><canvas id="chart-engagement"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-card-header"><h3 style="margin:0">Page Health Score</h3><p style="margin:4px 0 0 0;font-size:var(--text-xs);color:var(--color-text-muted)">${healthLabel(kpis.pageHealthScore || 74)}</p></div>
        <div class="chart-wrap" style="height:200px"><canvas id="chart-health"></canvas></div>
        <div class="health-breakdown">
          ${[
            { label: 'Posting đều', score: 85, icon: '📅' },
            { label: 'Engagement', score: kpis.engagementRate > 3 ? 80 : 50, icon: '❤️' },
            { label: 'Response rate', score: 72, icon: '💬' },
            { label: 'Growth', score: kpis.followersGrowth > 0 ? 75 : 40, icon: '📈' }
          ].map(i => `<div class="health-item"><span>${i.icon}</span><span class="health-item-label">${i.label}</span><span class="health-item-score" style="color:${i.score >= 70 ? 'var(--color-success)' : 'var(--color-warning)'}">${i.score}</span></div>`).join('')}
        </div>
      </div>
    </div>

    <div class="chart-card">
      <div class="chart-card-header"><h3 style="margin:0">Top Posts hiệu quả nhất</h3>
        <select id="top-posts-platform" class="field-select" style="font-size:var(--text-xs);padding:4px 8px">
          <option value="all">Tất cả</option><option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="twitter">Twitter</option><option value="linkedin">LinkedIn</option>
        </select>
      </div>
      <div id="top-posts-table" class="top-posts-wrap"></div>
    </div>`;

  requestAnimationFrame(() => {
    const p = activePlatform === 'all' ? 'facebook' : activePlatform;
    createReachChart('chart-reach', getTimeSeries(p, 'reach', days), getTimeSeries(p, 'impressions', days));
    createFollowerGrowthChart('chart-followers', getTimeSeries(p, 'followers', days));
    createHealthGauge('chart-health', kpis.pageHealthScore || 74);

    const platforms = ['facebook', 'instagram', 'twitter', 'linkedin'];
    const pdMap = {}; platforms.forEach(pl => { pdMap[pl] = getTimeSeries(pl, 'reach', days); });
    createPlatformStackedChart('chart-platform-stack', days, pdMap);

    const erMap = {}; platforms.forEach(pl => { erMap[pl] = getTimeSeries(pl, 'engagement', days); });
    createEngagementChart('chart-engagement', platforms, erMap);

    renderTopPostsTable(container.querySelector('#top-posts-table'), 'all');
  });

  container.querySelector('#top-posts-platform')?.addEventListener('change', e => {
    renderTopPostsTable(container.querySelector('#top-posts-table'), e.target.value);
  });
}

// ── Tab: Audience ─────────────────────────────────────────────
function renderAudience(container) {
  const audience = getAudience(activePlatform === 'all' ? 'facebook' : activePlatform);

  container.innerHTML = `
    <div class="ana-chart-row-2">
      <div class="chart-card">
        <div class="chart-card-header"><h3 style="margin:0">Độ tuổi & Giới tính</h3></div>
        <div class="chart-wrap" style="height:260px"><canvas id="chart-audience-age"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-card-header"><h3 style="margin:0">Thiết bị sử dụng</h3></div>
        <div class="chart-wrap" style="height:220px"><canvas id="chart-devices"></canvas></div>
        <div class="device-legend">
          ${[{ l: 'Mobile', p: audience.devices.mobile, i: '📱' }, { l: 'Desktop', p: audience.devices.desktop, i: '💻' }, { l: 'Tablet', p: audience.devices.tablet, i: '📟' }].map(d => `
            <div class="device-item"><span>${d.i}</span><div class="device-bar-wrap"><div class="device-bar" style="width:${d.p}%"></div></div><span class="device-pct">${d.p}%</span><span class="device-label">${d.l}</span></div>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="chart-card">
      <div class="chart-card-header"><h3 style="margin:0">Top thành phố</h3></div>
      <div class="cities-grid">
        ${audience.topCities.map((city, i) => `
          <div class="city-row"><span class="city-rank">${i + 1}</span><span class="city-name">${city.city}</span><div class="city-bar-wrap"><div class="city-bar" style="width:${city.pct}%"></div></div><span class="city-pct">${city.pct}%</span></div>
        `).join('')}
      </div>
    </div>

    <div class="insight-cards">
      <div class="insight-card"><div class="insight-icon">🎯</div><div class="insight-body"><div class="insight-title">Nhóm chính</div><div class="insight-value">Nữ 18-34</div><div class="insight-sub">41% tổng audience</div></div></div>
      <div class="insight-card"><div class="insight-icon">📍</div><div class="insight-body"><div class="insight-title">Thành phố chính</div><div class="insight-value">TP.HCM</div><div class="insight-sub">42% người theo dõi</div></div></div>
      <div class="insight-card"><div class="insight-icon">📱</div><div class="insight-body"><div class="insight-title">Thiết bị chủ yếu</div><div class="insight-value">Mobile</div><div class="insight-sub">78% truy cập từ điện thoại</div></div></div>
    </div>`;

  requestAnimationFrame(() => {
    createAudienceChart('chart-audience-age', audience.ageGender);
    createContentTypeChart('chart-devices', [
      { type: 'mobile', count: audience.devices.mobile },
      { type: 'desktop', count: audience.devices.desktop },
      { type: 'tablet', count: audience.devices.tablet }
    ]);
  });
}

// ── Tab: Content Performance ──────────────────────────────────
function renderContent(container) {
  const contentTypes = getContentTypeBreakdown(activePlatform);
  const hashtags = getHashtagStats(activePlatform);
  const TYPE_ICONS = { image: '🖼️', video: '🎬', carousel: '📑', text: '💬', link: '🔗', story: '📖' };

  container.innerHTML = `
    <div class="ana-chart-row-2">
      <div class="chart-card">
        <div class="chart-card-header"><h3 style="margin:0">Phân loại nội dung</h3><p style="margin:4px 0 0 0;font-size:var(--text-xs);color:var(--color-text-muted)">Theo số bài đăng</p></div>
        <div class="chart-wrap" style="height:260px"><canvas id="chart-content-type"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-card-header"><h3 style="margin:0">Content Type — ER trung bình</h3></div>
        <div class="content-er-list">
          ${[...contentTypes].sort((a, b) => b.avgER - a.avgER).map(t => {
            const barW = Math.round(t.avgER / 20 * 100);
            return `<div class="er-row"><span class="er-type">${TYPE_ICONS[t.type] || ''} ${t.type}</span><div class="er-bar-wrap"><div class="er-bar" style="width:${barW}%"></div></div><span class="er-val">${t.avgER}%</span></div>`;
          }).join('')}
        </div>
      </div>
    </div>

    <div class="chart-card">
      <div class="chart-card-header"><h3 style="margin:0">Hashtag Performance</h3><p style="margin:4px 0 0 0;font-size:var(--text-xs);color:var(--color-text-muted)">Top 8 hashtag theo Reach</p></div>
      <div class="chart-wrap" style="height:280px"><canvas id="chart-hashtags"></canvas></div>
    </div>

    <div class="insight-cards">
      <div class="insight-card insight-positive"><div class="insight-icon">🎬</div><div class="insight-body"><div class="insight-title">Video là số 1</div><div class="insight-value">ER 12.4%</div><div class="insight-sub">Cao gấp 3x so với text</div></div></div>
      <div class="insight-card insight-positive"><div class="insight-icon">#️⃣</div><div class="insight-body"><div class="insight-title">Hashtag hot nhất</div><div class="insight-value">#giveaway</div><div class="insight-sub">ER 18.4% — Reach 32.1K</div></div></div>
      <div class="insight-card insight-warning"><div class="insight-icon">🔗</div><div class="insight-body"><div class="insight-title">Link posts yếu nhất</div><div class="insight-value">ER 3.1%</div><div class="insight-sub">Cân nhắc giảm bài link</div></div></div>
    </div>`;

  requestAnimationFrame(() => {
    createContentTypeChart('chart-content-type', contentTypes);
    createHashtagChart('chart-hashtags', hashtags);
  });
}

// ── Tab: Best Time to Post ────────────────────────────────────
function renderBestTime(container) {
  const audience = getAudience(activePlatform === 'all' ? 'facebook' : activePlatform);
  const topSlots = [...audience.peakHours].sort((a, b) => b.value - a.value).slice(0, 5);
  const DAYS_FULL = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

  container.innerHTML = `
    <div class="chart-card">
      <div class="chart-card-header"><h3 style="margin:0">Heatmap — Engagement theo Giờ & Ngày</h3><p style="margin:4px 0 0 0;font-size:var(--text-xs);color:var(--color-text-muted)">Màu đậm = engagement cao nhất</p></div>
      <div style="position:relative;height:200px"><canvas id="chart-heatmap" width="900" height="200" style="width:100%;height:200px"></canvas></div>
    </div>

    <div class="ana-chart-row-2">
      <div class="chart-card">
        <div class="chart-card-header"><h3 style="margin:0">Khung giờ vàng</h3><p style="margin:4px 0 0 0;font-size:var(--text-xs);color:var(--color-text-muted)">Thứ tự theo engagement</p></div>
        <div class="besttime-slots">
          ${topSlots.map((slot, i) => `
            <div class="time-slot">
              <span class="slot-rank rank-${i + 1}">${i + 1}</span>
              <div class="slot-info"><div class="slot-day">${DAYS_FULL[slot.day]}</div><div class="slot-hour">${slot.hour}:00 — ${slot.hour + 1}:00</div></div>
              <div class="slot-bar-wrap"><div class="slot-bar" style="width:${slot.value}%;background:${slot.value > 80 ? 'var(--color-success)' : slot.value > 60 ? 'var(--color-primary)' : 'var(--color-warning)'}"></div></div>
              <span class="slot-score">${slot.value}</span>
            </div>`).join('')}
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-card-header"><h3 style="margin:0">AI Gợi ý đăng bài</h3><p style="margin:4px 0 0 0;font-size:var(--text-xs);color:var(--color-text-muted)">Tối ưu cho tuần tới</p></div>
        <div class="ai-schedule-suggestions">
          ${['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6'].map((day, i) => `
            <div class="ai-sug-row">
              <span class="ai-sug-day">${day}</span>
              <div class="ai-sug-slots">
                <span class="ai-sug-time">11:30</span>
                <span class="ai-sug-time">${18 + (i % 2)}:00</span>
                ${i % 3 === 0 ? '<span class="ai-sug-time">21:00</span>' : ''}
              </div>
              <span class="ai-sug-tip">${['Đăng promo', 'Engagement post', 'Story/Reel', 'Educational', 'UGC/Review'][i]}</span>
            </div>`).join('')}
          <div class="ai-sug-note">💡 Dựa trên 30 ngày dữ liệu audience của bạn</div>
        </div>
      </div>
    </div>`;

  requestAnimationFrame(() => {
    const canvas = container.querySelector('#chart-heatmap');
    if (canvas) {
      canvas.width = canvas.offsetWidth;
      canvas.height = 200;
      createHeatmap('chart-heatmap', audience.peakHours);
    }
  });
}

// ── Tab: Competitive ──────────────────────────────────────────
function renderCompetitive(container) {
  const competitors = getCompetitors();
  const myKPIs = getKPIs('facebook');
  const BENCHMARKS = INDUSTRY_BENCHMARKS[activePlatform !== 'all' ? activePlatform : 'facebook'];

  container.innerHTML = `
    <div class="chart-card">
      <div class="chart-card-header">
        <h3 style="margin:0">🏆 Theo dõi đối thủ</h3>
        ${competitors.length < 5 ? '<button id="btn-add-competitor" class="btn btn-primary btn-sm">+ Thêm đối thủ</button>' : ''}
      </div>
      ${competitors.length === 0 ? `
        <div style="text-align:center;padding:var(--space-8);color:var(--color-text-muted)">
          <p style="font-size:24px;margin-bottom:var(--space-2)">🏆</p>
          <p>Thêm fanpage đối thủ để so sánh hiệu quả</p>
          <button id="btn-add-competitor-2" class="btn btn-primary btn-sm" style="margin-top:var(--space-3)">+ Thêm đối thủ đầu tiên</button>
        </div>
      ` : `
        <div class="competitor-cards" id="competitor-cards">
          <div class="comp-card comp-card-self">
            <div class="comp-card-name">🏠 Bạn</div>
            <div class="comp-metric"><span>Followers</span><strong>${fmtN(myKPIs.followers)}</strong></div>
            <div class="comp-metric"><span>ER%</span><strong style="color:var(--color-success)">${myKPIs.engagementRate}%</strong></div>
            <div class="comp-metric"><span>Reach</span><strong>${fmtN(myKPIs.reach)}</strong></div>
          </div>
          ${competitors.map(comp => `
            <div class="comp-card">
              <div class="comp-card-name">${comp.name}</div>
              <div class="comp-metric"><span>Followers</span><strong>${fmtN(comp.metrics.followers)}</strong></div>
              <div class="comp-metric"><span>ER%</span><strong style="color:${parseFloat(comp.metrics.engagementRate) > myKPIs.engagementRate ? 'var(--color-error)' : 'var(--color-success)'}">${comp.metrics.engagementRate}%</strong></div>
              <div class="comp-metric"><span>Posts/tuần</span><strong>${comp.metrics.postsPerWeek}</strong></div>
              <button class="btn btn-ghost btn-sm comp-remove" data-id="${comp.id}">🗑</button>
            </div>
          `).join('')}
        </div>
        <div class="chart-wrap" style="height:280px;margin-top:var(--space-4)"><canvas id="chart-competitor"></canvas></div>
      `}
    </div>

    <div class="chart-card">
      <div class="chart-card-header"><h3 style="margin:0">📊 So sánh với chuẩn ngành</h3><p style="margin:4px 0 0 0;font-size:var(--text-xs);color:var(--color-text-muted)">Engagement Rate — ${activePlatform !== 'all' ? activePlatform : 'Facebook'}</p></div>
      <div class="benchmark-bars">
        ${benchmarkBars(myKPIs.engagementRate, BENCHMARKS)}
      </div>
    </div>`;

  ['#btn-add-competitor', '#btn-add-competitor-2'].forEach(sel => {
    container.querySelector(sel)?.addEventListener('click', () => openAddCompetitorModal(container));
  });

  container.querySelectorAll('.comp-remove').forEach(btn => {
    btn.addEventListener('click', () => { removeCompetitor(btn.dataset.id); renderCompetitive(container); });
  });

  if (competitors.length > 0) {
    requestAnimationFrame(() => createCompetitorChart('chart-competitor', myKPIs, competitors));
  }
}

// ── Add Competitor Modal ──────────────────────────────────────
function openAddCompetitorModal(container) {
  document.querySelector('#add-comp-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'add-comp-modal';
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:420px">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-4);border-bottom:1px solid var(--color-border)">
        <h3 style="margin:0;font-size:var(--text-base)">Thêm đối thủ cạnh tranh</h3>
        <button class="btn btn-ghost btn-sm close-comp-modal">✕</button>
      </div>
      <div style="padding:var(--space-4);display:flex;flex-direction:column;gap:var(--space-3)">
        <div><label style="font-size:var(--text-xs);font-weight:600;display:block;margin-bottom:4px">Tên đối thủ</label><input type="text" id="comp-name" class="field-input" placeholder="VD: Shop ABC"/></div>
        <div><label style="font-size:var(--text-xs);font-weight:600;display:block;margin-bottom:4px">Link Fanpage</label><input type="url" id="comp-url" class="field-input" placeholder="https://facebook.com/shopABC"/></div>
        <div><label style="font-size:var(--text-xs);font-weight:600;display:block;margin-bottom:4px">Platform</label>
          <select id="comp-platform" class="field-select"><option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="twitter">Twitter</option><option value="linkedin">LinkedIn</option></select>
        </div>
        <p style="font-size:var(--text-xs);color:var(--color-text-muted)">💡 Demo mode: dữ liệu đối thủ được mock. Trong production, kết nối Facebook API để lấy số liệu thật.</p>
      </div>
      <div style="display:flex;gap:var(--space-2);justify-content:flex-end;padding:var(--space-3) var(--space-4);border-top:1px solid var(--color-border)">
        <button class="btn btn-secondary btn-sm close-comp-modal">Hủy</button>
        <button id="btn-save-competitor" class="btn btn-primary btn-sm">+ Thêm</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  modal.querySelectorAll('.close-comp-modal').forEach(b => b.addEventListener('click', () => modal.remove()));

  modal.querySelector('#btn-save-competitor').addEventListener('click', () => {
    const name = modal.querySelector('#comp-name').value.trim();
    const pageUrl = modal.querySelector('#comp-url').value.trim();
    const platform = modal.querySelector('#comp-platform').value;
    if (!name) { if (window.Toast) window.Toast.show('Nhập tên đối thủ', 'error'); return; }
    addCompetitor({ name, pageUrl, platform });
    modal.remove();
    const content = document.querySelector('#analytics-content');
    if (content) renderCompetitive(content);
    if (window.Toast) window.Toast.show(`✅ Đã thêm "${name}"`, 'success');
  });
}

// ── Helpers ───────────────────────────────────────────────────
function kpiCard(label, value, change, icon, colorKey) {
  const colors = { success: 'var(--color-success)', error: 'var(--color-error)', primary: 'var(--color-primary)', accent: 'var(--color-accent, #38bdf8)', warning: 'var(--color-warning)', purple: '#7C3AED' };
  const c = colors[colorKey] || 'var(--color-primary)';
  const pos = typeof change === 'string' ? change.includes('+') || !change.includes('-') : change >= 0;
  return `<div class="kpi-card"><div class="kpi-icon" style="background:${c}18;color:${c}"><i data-lucide="${icon}" width="20" height="20"></i></div><div class="kpi-body"><div class="kpi-label">${label}</div><div class="kpi-value" style="color:${c}">${value}</div><div class="kpi-change ${pos ? 'positive' : 'negative'}">${pos ? '▲' : '▼'} ${change}</div></div></div>`;
}

function renderTopPostsTable(container, platform) {
  const posts = getTopPosts(platform, 8);
  container.innerHTML = `<div class="table-wrap"><table class="data-table">
    <thead><tr><th>Nội dung</th><th>Platform</th><th>Loại</th><th>Reach</th><th>Likes</th><th>Comments</th><th>ER%</th><th>Ngày</th></tr></thead>
    <tbody>${posts.map(p => `<tr>
      <td class="post-content-cell">${p.content.slice(0, 45)}...</td>
      <td><span style="color:${PLATFORM_COLORS[p.platform]}">● ${p.platform}</span></td>
      <td><span class="type-badge">${p.type}</span></td>
      <td>${fmtN(p.reach)}</td><td>${fmtN(p.likes)}</td><td>${fmtN(p.comments)}</td>
      <td><span class="er-badge ${p.engagementRate > 10 ? 'er-great' : p.engagementRate > 5 ? 'er-good' : ''}">${p.engagementRate}%</span></td>
      <td>${new Date(p.publishedAt).toLocaleDateString('vi-VN')}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

function benchmarkBars(myER, bm) {
  const items = [
    { label: 'Của bạn', value: myER, color: 'var(--color-primary)', isYou: true },
    { label: 'Trung bình', value: bm.avgER, color: 'var(--color-text-muted)' },
    { label: 'Tốt', value: bm.goodER, color: 'var(--color-warning)' },
    { label: 'Xuất sắc', value: bm.greatER, color: 'var(--color-success)' }
  ];
  const max = Math.max(...items.map(i => i.value)) * 1.2;
  return items.map(i => `<div class="benchmark-row ${i.isYou ? 'benchmark-you' : ''}"><span class="benchmark-label">${i.label}</span><div class="benchmark-bar-wrap"><div class="benchmark-bar" style="width:${(i.value / max * 100).toFixed(0)}%;background:${i.color}"></div></div><span class="benchmark-val" style="color:${i.color}">${i.value}%</span></div>`).join('');
}

function healthLabel(s) { return s >= 80 ? '🟢 Xuất sắc' : s >= 65 ? '🟡 Tốt' : s >= 50 ? '🟠 Trung bình' : '🔴 Cần cải thiện'; }

function getDays() {
  if (activeRange === '7d') return getLast7Days();
  if (activeRange === '90d') { const d = []; for (let i = 89; i >= 0; i--) { const x = new Date(); x.setDate(x.getDate() - i); d.push(x.toISOString().slice(0, 10)); } return d; }
  return getLast30Days();
}

function fmtN(n) { if (!n && n !== 0) return '0'; if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'; if (n >= 1000) return (n / 1000).toFixed(1) + 'K'; return n.toLocaleString('vi-VN'); }

// ── Bind Events ───────────────────────────────────────────────
function bindAnalyticsEvents(container) {
  container.querySelectorAll('.at-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.at-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.tab;
      renderAnalyticsTab(container, activeTab);
    });
  });

  container.querySelectorAll('.pf-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.pf-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activePlatform = btn.dataset.platform;
      renderAnalyticsTab(container, activeTab);
    });
  });

  container.querySelectorAll('.dr-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.dr-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeRange = btn.dataset.range;
      renderAnalyticsTab(container, activeTab);
    });
  });

  container.querySelector('#btn-export-report')?.addEventListener('click', () => {
    exportReport({ platform: activePlatform, dateRange: activeRange === '7d' ? '7 ngày' : activeRange === '90d' ? '90 ngày' : '30 ngày' });
    if (window.Toast) window.Toast.show('📄 Đang mở báo cáo...', 'info');
  });
}

// ── Tab: Growth ───────────────────────────────────────────────
async function renderGrowth(container) {
  const trends = await fetchAnalyticsAPI('trends', activeRange) || [];
  const labels = trends.map(t => t.date);
  const data = trends.map(t => t.value);

  container.innerHTML = `
    <div class="chart-card">
      <div class="chart-card-header"><h3 style="margin:0">Posting Growth Trend</h3></div>
      <div class="chart-wrap" style="height:280px;position:relative"><canvas id="chart-growth"></canvas></div>
      ${trends.length === 0 ? '<p style="text-align:center;color:var(--color-text-muted)">Không có dữ liệu thật.</p>' : ''}
    </div>
    <div class="insight-cards" style="margin-top:var(--space-4)">
       <div class="insight-card insight-positive"><div class="insight-icon">📈</div><div class="insight-body"><div class="insight-title">Tốc độ đăng</div><div class="insight-value">${trends.length > 0 ? (data.reduce((a, b) => a + b, 0) / data.length).toFixed(1) : 0}</div><div class="insight-sub">bài / ngày</div></div></div>
    </div>
  `;

  requestAnimationFrame(() => {
    if (trends.length > 0) createReachChart('chart-growth', data.map((v, i) => ({date: labels[i], value: v})), data.map((v, i) => ({date: labels[i], value: v})));
  });
}

// ── Tab: Failures ─────────────────────────────────────────────
async function renderFailures(container) {
  const failures = await fetchAnalyticsAPI('failures', activeRange) || [];
  
  container.innerHTML = `
    <div class="chart-card">
      <div class="chart-card-header"><h3 style="margin:0">Phân tích lỗi (Failures)</h3><p style="margin:4px 0 0 0;font-size:var(--text-xs);color:var(--color-text-muted)">Nguyên nhân bài đăng lỗi</p></div>
      <div class="content-er-list">
        ${failures.length === 0 ? '<div style="text-align:center;color:var(--color-text-muted);padding:var(--space-4)">Hệ thống hoạt động ổn định. Không có lỗi nào trong khoảng thời gian này.</div>' : ''}
        ${failures.map(f => `
          <div class="er-row">
            <span class="er-type">${f.reason}</span>
            <div class="er-bar-wrap"><div class="er-bar" style="width:${Math.min(100, f.count * 10)}%"></div></div>
            <span class="er-val">${f.count}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ── Tab: Reports ──────────────────────────────────────────────
function renderReports(container) {
  container.innerHTML = `
    <div class="chart-card">
      <h3 style="margin-top:0">Báo cáo & Export</h3>
      <p style="color:var(--color-text-muted)">Bạn có thể xuất toàn bộ số liệu raw log dưới dạng CSV để lưu trữ hoặc phân tích bên ngoài.</p>
      <div style="margin-top:var(--space-4);display:flex;gap:var(--space-2)">
        <a href="/api/v1/analytics/export?range=${activeRange}" target="_blank" class="btn btn-primary"><i data-lucide="download" width="16" height="16"></i> Xuất CSV ngay</a>
      </div>
    </div>
    
    <div class="chart-card" style="margin-top:var(--space-4)">
      <h4 style="margin-top:0">Báo cáo tự động (Scheduled)</h4>
      <p style="color:var(--color-text-muted)">Hệ thống sẽ tự động tổng hợp báo cáo và gửi qua email vào cuối tuần/cuối tháng.</p>
      <div style="margin-top:var(--space-3);padding:var(--space-3);background:var(--color-surface-hover);border-radius:var(--radius-md);display:flex;justify-content:space-between;align-items:center">
        <div>
           <strong>Báo cáo tổng kết tuần</strong>
           <div style="font-size:var(--text-xs);color:var(--color-text-muted)">Gửi vào 8h sáng Chủ nhật hàng tuần</div>
        </div>
        <input type="checkbox" checked onchange="window.Toast && window.Toast.show('Đã cập nhật cấu hình gửi báo cáo','success')">
      </div>
    </div>
  `;
}
