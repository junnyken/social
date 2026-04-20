import { Logs, Queue, api, onEvent, offEvent } from '../api-client.js';
import { renderPageSelector, getSelectedPageId } from '../components/page-selector.js';

let _activeRange = '30d';
let _compareMode = false;
let _customRange = null;   // { from: '2026-04-01', to: '2026-04-15' }
let _customCompare = null; // { from: '2026-03-15', to: '2026-03-31' }

export async function renderDashboard(container) {
  // Skeleton - 3-zone layout
  container.innerHTML = `
    <div style="font-family:'Satoshi',sans-serif; max-width: 1400px; margin: 0 auto;">
        
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <div>
                <h1 style="font-size:24px; font-weight:700; color:var(--text); margin:0;">Dashboard</h1>
                <p style="color:var(--text-muted); font-size:14px; margin-top:4px;">Command Center - Tổng quan hiệu suất đa nền tảng</p>
            </div>
            <div style="display:flex; gap:10px; align-items:center;">
                 <a href="#/create" class="btn btn-primary" style="border-radius:20px; padding:8px 16px;">
                    <i data-lucide="plus" width="16" height="16"></i> Tạo bài gốc
                </a>
            </div>
        </div>

        <!-- Date Range & Compare Controls -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
            <div id="dash-range-btns" style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                ${['today|Hôm nay','7d|7 ngày','30d|30 ngày','month|Tháng này','90d|90 ngày'].map(r => {
                    const [val,lbl] = r.split('|');
                    const active = val === _activeRange && !_customRange;
                    return `<button data-range="${val}" style="padding:6px 14px; border-radius:8px; border:1px solid ${active ? 'var(--color-primary)' : 'var(--border)'}; background:${active ? 'var(--color-primary)' : 'transparent'}; color:${active ? '#fff' : 'var(--text-muted)'}; font-size:12px; font-weight:600; cursor:pointer; transition:all 0.15s;">${lbl}</button>`;
                }).join('')}
                <button id="dash-custom-range-btn" style="padding:6px 14px; border-radius:8px; border:1px solid ${_customRange ? 'var(--color-primary)' : 'var(--border)'}; background:${_customRange ? 'var(--color-primary)' : 'transparent'}; color:${_customRange ? '#fff' : 'var(--text-muted)'}; font-size:12px; font-weight:600; cursor:pointer;">📅 Tùy chọn</button>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                <div id="dash-page-selector-container"></div>
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:12px; color:var(--text-muted); padding:6px 12px; border-radius:8px; border:1px solid var(--border); background:var(--surface-hover);">
                    <input type="checkbox" id="dash-compare-toggle" style="accent-color:var(--color-primary); cursor:pointer;" ${_compareMode ? 'checked' : ''}>
                    <i data-lucide="git-compare" width="14" height="14"></i>
                    So sánh kỳ trước
                </label>
            </div>
        </div>

        <!-- Custom Date Picker Panel (hidden by default) -->
        <div id="dash-custom-panel" style="display:${_customRange ? 'flex' : 'none'}; gap:16px; margin-bottom:16px; padding:16px; border-radius:12px; border:1px solid var(--border); background:var(--surface-hover); align-items:flex-end; flex-wrap:wrap;">
            <div style="flex:1; min-width:200px;">
                <div style="font-size:12px; font-weight:600; color:var(--text); margin-bottom:6px;">📊 Kỳ A (Xem chính)</div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <input type="date" id="custom-from" value="${_customRange?.from || ''}" style="flex:1; padding:6px 10px; border-radius:8px; border:1px solid var(--border); background:var(--surface); color:var(--text); font-size:12px;">
                    <span style="color:var(--text-muted); font-size:12px;">→</span>
                    <input type="date" id="custom-to" value="${_customRange?.to || ''}" style="flex:1; padding:6px 10px; border-radius:8px; border:1px solid var(--border); background:var(--surface); color:var(--text); font-size:12px;">
                </div>
            </div>
            <div style="flex:1; min-width:200px;">
                <div style="font-size:12px; font-weight:600; color:var(--text-muted); margin-bottom:6px;">🔄 Kỳ B (So sánh với)</div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <input type="date" id="compare-from" value="${_customCompare?.from || ''}" style="flex:1; padding:6px 10px; border-radius:8px; border:1px solid var(--border); background:var(--surface); color:var(--text); font-size:12px;">
                    <span style="color:var(--text-muted); font-size:12px;">→</span>
                    <input type="date" id="compare-to" value="${_customCompare?.to || ''}" style="flex:1; padding:6px 10px; border-radius:8px; border:1px solid var(--border); background:var(--surface); color:var(--text); font-size:12px;">
                </div>
            </div>
            <div style="display:flex; gap:8px;">
                <button id="custom-apply-btn" style="padding:8px 16px; border-radius:8px; border:none; background:var(--color-primary); color:#fff; font-size:12px; font-weight:600; cursor:pointer;">Áp dụng</button>
                <button id="custom-clear-btn" style="padding:8px 16px; border-radius:8px; border:1px solid var(--border); background:transparent; color:var(--text-muted); font-size:12px; cursor:pointer;">Xóa</button>
            </div>
        </div>

        <!-- ZONE 1: TOP BAR KPIs -->
        <div id="dash-kpis" style="display:grid; grid-template-columns:repeat(4, 1fr); gap:16px; margin-bottom:20px;">
            ${Array(4).fill('<div class="card" style="height:100px; display:flex; align-items:center; justify-content:center; color:var(--text-muted);">Loading...</div>').join('')}
        </div>

        <div style="display:grid; grid-template-columns: 2fr 1fr; gap:20px; margin-bottom:20px;">
            <!-- ZONE 2: MAIN CHARTS -->
            <div style="display:flex; flex-direction:column; gap:20px;">
                <div class="card" style="padding:20px; border-radius:12px; border:1px solid var(--border);">
                    <div style="margin-bottom:16px;">
                        <h3 style="margin:0; font-size:16px;">📈 Tăng trưởng Audience & Reach</h3>
                        <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">So sánh lượng tiếp cận và người theo dõi trong 30 ngày qua</p>
                    </div>
                    <div style="height:280px;"><canvas id="chart-growth-reach"></canvas></div>
                </div>
                
                <div class="card" style="padding:20px; border-radius:12px; border:1px solid var(--border);">
                    <div style="margin-bottom:16px;">
                        <h3 style="margin:0; font-size:16px;">📊 Chi tiết Tương tác (Engagement)</h3>
                        <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">Phân bổ lượt Thích, Bình luận, và Chia sẻ</p>
                    </div>
                    <div style="height: 220px;"><canvas id="chart-engagement-breakdown"></canvas></div>
                </div>
                
                <div class="card" style="padding:20px; border-radius:12px; border:1px solid var(--border);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                        <h3 style="margin:0; font-size:16px;">🗂 Nền tảng (Platform Breakdown)</h3>
                    </div>
                    <div id="dash-platforms" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px;"></div>
                </div>
            </div>

            <!-- ZONE 3: SIDE PANEL -->
            <div style="display:flex; flex-direction:column; gap:20px;">
                <div class="card" style="padding:20px; border-radius:12px; border:1px solid var(--border); background:var(--surface);">
                     <div style="margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                           <h3 style="margin:0; font-size:16px;">⭐ Top Performing Posts</h3>
                           <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">Xếp hạng theo Engagement Rate</p>
                        </div>
                     </div>
                     <div id="dash-top-posts" style="display:flex; flex-direction:column; gap:12px;"></div>
                </div>

                <div class="card" style="padding:20px; border-radius:12px; border:1px solid var(--border);">
                    <div style="margin-bottom:16px;">
                        <h3 style="margin:0; font-size:16px;">😊 Cảm xúc Audience (Sentiment)</h3>
                        <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">Phân tích từ bình luận và tin nhắn</p>
                    </div>
                    <div style="height:180px; position:relative;">
                        <canvas id="chart-sentiment"></canvas>
                        <div id="sentiment-score" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center;">
                            <div style="font-size:24px; font-weight:800; color:var(--color-success);">--</div>
                            <div style="font-size:10px; color:var(--text-muted);">Positive</div>
                        </div>
                    </div>
                </div>
                
                 <div class="card" style="padding:20px; border-radius:12px; border:1px solid var(--border);">
                     <div style="margin-bottom:12px;">
                        <h3 style="margin:0; font-size:16px;">⚡ Hoạt động gần đây</h3>
                    </div>
                    <div class="tbl-wrap" style="max-height: 200px; overflow-y: auto;">
                        <table class="tbl" style="font-size:12px;">
                            <tbody id="dash-activity"><tr><td>Loading...</td></tr></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
  `;

  try {
      // Refresh lucide icons
      setTimeout(() => { if (window.lucide) window.lucide.createIcons(); }, 0);
      
      const pageSelectorContainer = container.querySelector('#dash-page-selector-container');
      renderPageSelector(pageSelectorContainer, () => renderDashboard(container));
      
      // Fetch data with range param
      const rangeParam = `range=${_activeRange}&compare=${_compareMode}&pageId=${getSelectedPageId()}`;
      const [summaryRes, topPostsRes, sentimentRes, breakdownRes, logsData] = await Promise.all([
         api.get(`/analytics-enhanced/dashboard-summary?${rangeParam}`).catch(() => ({data: null})),
         api.get(`/analytics-enhanced/post-performance?limit=5&${rangeParam}`).catch(() => ({data: null})),
         api.get(`/analytics-enhanced/sentiment?${rangeParam}`).catch(() => ({data: null})),
         api.get(`/analytics-enhanced/engagement-breakdown?${rangeParam}`).catch(() => ({data: null})),
         Logs.list().catch(() => ({data: []}))
      ]);
      
      const summary = summaryRes?.data || getFallbackSummary(_activeRange, _compareMode);
      const topPosts = topPostsRes?.data || getFallbackPosts();
      const sentiment = sentimentRes?.data || { positive: 68, neutral: 24, negative: 8, index: 86 };
      const breakdown = breakdownRes?.data || getFallbackBreakdown(_activeRange, _compareMode);
      const logs = logsData?.data || [];

      // Show data source indicator
      const isDemo = summary._source === 'demo';
      const isLiveEmpty = summary._source === 'live_empty';
      const isLive = summary._source === 'live';
      const headerEl = container.querySelector('h1');
      if (headerEl) {
          let badge = '';
          if (isLive) {
              badge = '<span style="font-size:10px; padding:3px 8px; border-radius:12px; background:#10b981; color:white; margin-left:10px; vertical-align:middle;">🔴 LIVE DATA</span>';
          } else if (isLiveEmpty) {
              badge = '<span style="font-size:10px; padding:3px 8px; border-radius:12px; background:#3b82f6; color:white; margin-left:10px; vertical-align:middle;">🔗 CONNECTED</span>';
          } else {
              badge = '<span style="font-size:10px; padding:3px 8px; border-radius:12px; background:#f59e0b; color:white; margin-left:10px; vertical-align:middle;">📊 DEMO DATA</span>';
          }
          headerEl.innerHTML = 'Dashboard ' + badge;
      }
      
      // Show connect banner when demo data
      if (isDemo) {
          const kpiGrid = document.getElementById('dash-kpis');
          if (kpiGrid) {
              kpiGrid.insertAdjacentHTML('beforebegin', `
                  <div style="padding:12px 16px; border-radius:10px; background:linear-gradient(135deg, #f59e0b22, #f59e0b08); border:1px solid #f59e0b44; margin-bottom:12px; display:flex; align-items:center; gap:10px; font-size:13px;">
                      <span style="font-size:18px;">💡</span>
                      <span style="color:var(--text);">Bạn đang xem <strong>dữ liệu demo</strong>. <a href="#/accounts" style="color:#f59e0b; font-weight:600; text-decoration:underline;">Kết nối Facebook Page</a> để hiện số liệu thật từ Graph API.</span>
                  </div>
              `);
          }
      } else if (isLiveEmpty) {
          const kpiGrid = document.getElementById('dash-kpis');
          if (kpiGrid) {
              kpiGrid.insertAdjacentHTML('beforebegin', `
                  <div style="padding:12px 16px; border-radius:10px; background:linear-gradient(135deg, #3b82f622, #3b82f608); border:1px solid #3b82f644; margin-bottom:12px; display:flex; align-items:center; gap:10px; font-size:13px;">
                      <span style="font-size:18px;">📊</span>
                      <span style="color:var(--text);">Facebook Pages đã kết nối! Dữ liệu insights đang được thu thập. Số liệu sẽ cập nhật khi có hoạt động trên Page.</span>
                  </div>
              `);
          }
      }

      // Render KPIs
      renderKPIs(document.getElementById('dash-kpis'), summary.kpis, _activeRange, _compareMode);
      
      // Render Platform Breakdown
      renderPlatformBreakdown(document.getElementById('dash-platforms'), summary.platforms);
      
      // Render Top Posts
      renderTopPostsPanel(document.getElementById('dash-top-posts'), topPosts);
      
      // Render Recent Activity
      renderActivityTable(document.getElementById('dash-activity'), logs);
      
      // Render Charts
      renderGrowthReachChart('chart-growth-reach', breakdown.growth, _compareMode);
      renderEngagementBarChart('chart-engagement-breakdown', breakdown.engagement);
      renderSentimentDoughnut('chart-sentiment', sentiment);

  } catch (error) {
     console.error("Dashboard render error:", error);
  }

  // Bind range buttons (preset)
  container.querySelectorAll('#dash-range-btns button[data-range]').forEach(btn => {
      btn.addEventListener('click', () => {
          _activeRange = btn.dataset.range;
          _customRange = null;
          _customCompare = null;
          renderDashboard(container);
      });
  });
  
  // Bind compare toggle
  container.querySelector('#dash-compare-toggle')?.addEventListener('change', (e) => {
      _compareMode = e.target.checked;
      renderDashboard(container);
  });

  // Bind custom date picker toggle
  container.querySelector('#dash-custom-range-btn')?.addEventListener('click', () => {
      const panel = container.querySelector('#dash-custom-panel');
      if (panel) panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
  });

  // Bind custom date apply
  container.querySelector('#custom-apply-btn')?.addEventListener('click', () => {
      const from = container.querySelector('#custom-from')?.value;
      const to = container.querySelector('#custom-to')?.value;
      const cFrom = container.querySelector('#compare-from')?.value;
      const cTo = container.querySelector('#compare-to')?.value;
      
      if (!from || !to) { if(window.Toast) window.Toast.show('Chọn ngày Kỳ A trước', 'error'); return; }
      
      _customRange = { from, to };
      _customCompare = (cFrom && cTo) ? { from: cFrom, to: cTo } : null;
      _compareMode = !!_customCompare;
      _activeRange = 'custom';
      renderDashboard(container);
  });

  // Bind custom date clear
  container.querySelector('#custom-clear-btn')?.addEventListener('click', () => {
      _customRange = null;
      _customCompare = null;
      _activeRange = '30d';
      _compareMode = false;
      renderDashboard(container);
  });

  const reloadDash = () => { if(location.hash === '#/dashboard' || location.hash === '' || location.hash === '#/') renderDashboard(container); };
  onEvent('post_done', reloadDash);
  
  return () => {
    offEvent('post_done', reloadDash);
    if(window._chartGrowth) window._chartGrowth.destroy();
    if(window._chartEngage) window._chartEngage.destroy();
    if(window._chartSentiment) window._chartSentiment.destroy();
  };
}

// ==============================================================================
// RENDER HELPERS
// ==============================================================================

function getCompareLabel(range) {
    if (range === 'custom' && _customCompare) return `${_customCompare.from} → ${_customCompare.to}`;
    if (range === 'custom' && _customRange) return `${_customRange.from} → ${_customRange.to}`;
    const map = { 'today': 'hôm qua', '7d': '7 ngày trước', '30d': '30 ngày trước', 'month': 'tháng trước', '90d': '90 ngày trước' };
    return map[range] || 'kỳ trước';
}

function renderKPIs(container, kpis, range = '30d', compareOn = false) {
    if(!container) return;
    const vsLabel = compareOn ? `vs ${getCompareLabel(range)}` : `vs ${getCompareLabel(range)}`;
    const items = [
        { label: 'Total Followers', value: fmt(kpis.followers), change: kpis.followersChange, pct: kpis.followersPct, icon: 'users', color: 'var(--color-primary)' },
        { label: 'Total Reach', value: fmt(kpis.reach), change: kpis.reachChange, pct: kpis.reachPct, icon: 'eye', color: 'var(--color-accent, #8b5cf6)' },
        { label: 'Avg Engagement Rate', value: kpis.engagementRate + '%', change: kpis.erChange, pct: kpis.erPct, icon: 'mouse-pointer-click', color: 'var(--color-success)' },
        { label: 'New Inbox / Leads', value: kpis.inbox, change: kpis.inboxChange, pct: kpis.inboxPct, icon: 'message-square', color: 'var(--color-warning)' }
    ];
    
    container.innerHTML = items.map(k => {
        const changeVal = parseFloat(k.change);
        const pctVal = k.pct ? ` (${k.pct > 0 ? '+' : ''}${k.pct}%)` : '';
        const isPositive = changeVal >= 0;
        return `
        <div class="card" style="padding:20px; border-radius:12px; border:1px solid var(--border); display:flex; flex-direction:column; justify-content:space-between; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                   <div style="color:var(--text-muted); font-size:13px; font-weight:500; margin-bottom:8px;">${k.label}</div>
                   <div style="font-size:28px; font-weight:800; color:var(--text);">${k.value}</div>
                </div>
                <div style="background:${k.color}15; color:${k.color}; padding:8px; border-radius:8px;">
                    <i data-lucide="${k.icon}" width="20" height="20"></i>
                </div>
            </div>
            <div style="margin-top:16px; font-size:12px; display:flex; align-items:center; gap:6px;">
                 <span style="color:${isPositive ? 'var(--color-success)' : 'var(--color-error)'}; font-weight:600; background:${isPositive ? 'var(--color-success)' : 'var(--color-error)'}15; padding:2px 6px; border-radius:4px;">
                    ${isPositive ? '▲ +'+k.change : '▼ '+k.change}${pctVal}
                 </span>
                 <span style="color:var(--text-muted);">${vsLabel}</span>
            </div>
        </div>`;
    }).join('');
    setTimeout(() => { if (window.lucide) window.lucide.createIcons(); }, 0);
}

function renderTopPostsPanel(container, posts) {
    if(!container) return;
    container.innerHTML = posts.map((p, i) => `
        <div style="display:flex; gap:12px; align-items:center; padding:10px; border-radius:8px; background:var(--surface-hover); border:1px solid var(--border); transition:0.2s;">
            <div style="font-size:16px; font-weight:800; color:var(--text-muted); min-width:20px;">#${i+1}</div>
            ${p.thumbnail ? `<img src="${p.thumbnail}" style="width:40px; height:40px; border-radius:6px; object-fit:cover;">` : `<div style="width:40px; height:40px; border-radius:6px; background:var(--border); display:flex; align-items:center; justify-content:center; font-size:16px;">${p.type === 'video' ? '🎬' : '📝'}</div>`}
            <div style="flex:1; min-width:0;">
                <div style="font-size:13px; font-weight:500; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.title}</div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">
                     ${p.platform === 'facebook' ? '<span style="color:#1877F2;">● FB</span>' : '<span style="color:#E4405F;">● IG</span>'}
                     &nbsp;👁️ ${fmt(p.reach)} &nbsp;👍 ${fmt(p.likes)}
                </div>
            </div>
            <div style="text-align:right;">
                 <div style="font-size:14px; font-weight:700; color:var(--color-success);">${p.er}%</div>
                 <div style="font-size:10px; color:var(--text-muted);">ER</div>
            </div>
        </div>
    `).join('');
}

function renderPlatformBreakdown(container, platforms) {
     if(!container) return;
     container.innerHTML = platforms.map(p => `
        <div style="padding:16px; border-radius:10px; border:1px solid var(--border); background:var(--surface-hover); display:flex; flex-direction:column;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px; font-size:13px; font-weight:600; color:var(--text);">
                 ${p.id === 'facebook' ? '<span style="color:#1877F2">●</span> Facebook' : 
                   p.id === 'instagram' ? '<span style="color:#E4405F">●</span> Instagram' : 
                   '<span style="color:#1DA1F2">●</span> Twitter'}
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                 <span style="font-size:12px; color:var(--text-muted);">Followers</span>
                 <span style="font-size:13px; font-weight:600;">${fmt(p.followers)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                 <span style="font-size:12px; color:var(--text-muted);">Reach</span>
                 <span style="font-size:13px; font-weight:600;">${fmt(p.reach)}</span>
            </div>
             <div style="display:flex; justify-content:space-between;">
                 <span style="font-size:12px; color:var(--text-muted);">Avg. ER</span>
                 <span style="font-size:13px; font-weight:600; color:var(--color-success);">${p.er}%</span>
            </div>
        </div>
     `).join('');
}

function renderActivityTable(container, logs) {
    if(!container) return;
    if(!logs || logs.length === 0) {
        container.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:10px;">Chưa có hoạt động.</td></tr>';
        return;
    }
    container.innerHTML = logs.slice(0,5).map(l => `
        <tr style="border-bottom:1px solid var(--border);">
            <td style="color:var(--text-muted); padding:8px 4px; white-space:nowrap;">${timeAgo(new Date(l.timestamp).getTime())}</td>
            <td style="padding:8px 4px;"><div style="max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${l.content}">${l.content}</div></td>
            <td style="padding:8px 4px;">${statusBadge(l.status)}</td>
        </tr>`).join('');
}

// ==============================================================================
// CHARTJS RENDERING
// ==============================================================================

function renderGrowthReachChart(canvasId, data, compareOn = false) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || typeof Chart === 'undefined') return;
    if (window._chartGrowth) window._chartGrowth.destroy();

    const datasets = [
        {
            label: 'Reach',
            data: data.reach,
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            yAxisID: 'y'
        },
        {
            label: 'Followers Growth',
            data: data.followers,
            borderColor: '#10b981',
            borderWidth: 2,
            tension: 0.4,
            yAxisID: 'y1'
        }
    ];

    // Add comparison dashed lines when compare mode is on
    if (compareOn && data.prevReach && data.prevFollowers) {
        datasets.push({
            label: 'Reach (Kỳ trước)',
            data: data.prevReach,
            borderColor: 'rgba(139, 92, 246, 0.35)',
            borderWidth: 1.5,
            borderDash: [6, 4],
            tension: 0.4,
            fill: false,
            pointRadius: 0,
            yAxisID: 'y'
        });
        datasets.push({
            label: 'Followers (Kỳ trước)',
            data: data.prevFollowers,
            borderColor: 'rgba(16, 185, 129, 0.35)',
            borderWidth: 1.5,
            borderDash: [6, 4],
            tension: 0.4,
            fill: false,
            pointRadius: 0,
            yAxisID: 'y1'
        });
    }

    window._chartGrowth = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { position: 'top', labels: { color: '#94a3b8', font: {family: 'Satoshi'} } } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
                y: { type: 'linear', display: true, position: 'left', grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b5cf6' } },
                y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#10b981' } },
            }
        }
    });
}

function renderEngagementBarChart(canvasId, data) {
     const ctx = document.getElementById(canvasId);
    if (!ctx || typeof Chart === 'undefined') return;
    if (window._chartEngage) window._chartEngage.destroy();

    window._chartEngage = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [
                { label: 'Likes', data: data.likes, backgroundColor: '#3b82f6', categoryPercentage: 0.8, barPercentage: 0.9 },
                { label: 'Comments', data: data.comments, backgroundColor: '#f59e0b', categoryPercentage: 0.8, barPercentage: 0.9 },
                { label: 'Shares', data: data.shares, backgroundColor: '#8b5cf6', categoryPercentage: 0.8, barPercentage: 0.9 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                tooltip: { mode: 'index', intersect: false },
                legend: { position: 'top', labels: { color: '#94a3b8', font: {family: 'Satoshi'} } }
            },
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { color: '#94a3b8' } },
                y: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
            }
        }
    });
}

function renderSentimentDoughnut(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || typeof Chart === 'undefined') return;
    if (window._chartSentiment) window._chartSentiment.destroy();
    
    document.getElementById('sentiment-score').innerHTML = `
        <div style="font-size:24px; font-weight:800; color:var(--color-success);">${data.index}</div>
        <div style="font-size:10px; color:var(--text-muted);">Score</div>
    `;

    window._chartSentiment = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Positive', 'Neutral', 'Negative'],
            datasets: [{
                data: [data.positive, data.neutral, data.negative],
                backgroundColor: ['#10b981', '#64748b', '#ef4444'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => ' ' + ctx.label + ': ' + ctx.raw + '%' } }
            }
        }
    });
}

// ==============================================================================
// UTILS & FALLBACK DATA (PHASE A)
// ==============================================================================

function fmt(n) { 
    if(!n && n!==0) return '0'; 
    if(n>=1000000) return (n/1000000).toFixed(1)+'M'; 
    if(n>=1000) return (n/1000).toFixed(1)+'K'; 
    return n.toLocaleString(); 
}

export function timeAgo(ts) {
    const diff = Math.floor((Date.now() - ts)/1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff/60) + 'm ago';
    if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
    return Math.floor(diff/86400) + 'd ago';
}

export function statusBadge(s) {
    const map = {
        success: ['badge-success','check-circle','Success'],
        done: ['badge-success','check-circle','Success'],
        connected: ['badge-success','check-circle','Connected'],
        pending: ['badge-warning','clock','Pending'],
        scheduled: ['badge-info','calendar-clock','Scheduled'],
        failed: ['badge-error','x-circle','Failed']
    };
    const [cls, icon, label] = map[s] || ['badge-secondary','info', s || 'Unknown'];
    return `<span class="badge ${cls}" style="font-size:10px; padding:2px 6px;"><i data-lucide="${icon}" width="10" height="10"></i> ${label}</span>`;
}

function getRangeDays(range) {
    if (range === 'custom' && _customRange) {
        const diff = Math.ceil((new Date(_customRange.to) - new Date(_customRange.from)) / 86400000) + 1;
        return Math.max(1, diff);
    }
    const map = { 'today': 1, '7d': 7, '30d': 30, 'month': 30, '90d': 90 };
    return map[range] || 30;
}

function getFallbackSummary(range = '30d', compareOn = false) {
    // Scale mock data based on range
    const days = getRangeDays(range);
    const factor = days / 30;
    const base = { followers: 12480, reach: Math.round(45200*factor), engagementRate: 4.2, inbox: Math.round(18*factor) };
    // Previous period values (slightly lower to simulate growth)
    const prevReach = Math.round(base.reach * 0.87);
    const prevFollowers = base.followers - 342;
    return {
        kpis: { 
            followers: base.followers, 
            followersChange: '342', 
            followersPct: compareOn ? 2.8 : null,
            reach: base.reach, 
            reachChange: compareOn ? Math.round(base.reach - prevReach) : '12.4',
            reachPct: compareOn ? 14.9 : null,
            engagementRate: base.engagementRate, 
            erChange: '0.3',
            erPct: compareOn ? 7.7 : null,
            inbox: base.inbox, 
            inboxChange: '-2',
            inboxPct: compareOn ? -10 : null
        },
        platforms: [
            { id: 'facebook', followers: 8400, reach: Math.round(24000*factor), er: 4.5 },
            { id: 'instagram', followers: 3200, reach: Math.round(18200*factor), er: 5.8 },
            { id: 'twitter', followers: 880, reach: Math.round(3000*factor), er: 1.2 }
        ]
    };
}

function getFallbackPosts() {
    return [
        { title: '🎉 Super Flash Sale 50% hôm nay', platform: 'facebook', type: 'image', reach: 12400, likes: 842, er: 18.4 },
        { title: 'BTS: Hậu trường sự kiện kỷ niệm...', platform: 'instagram', type: 'video', reach: 8900, likes: 1102, er: 14.6 },
        { title: 'Bạn chọn màu xanh hay màu đỏ?', platform: 'facebook', type: 'image', reach: 6200, likes: 420, er: 9.8 },
        { title: 'Hướng dẫn sử dụng sản phẩm X...', platform: 'facebook', type: 'video', reach: 5100, likes: 215, er: 6.2 },
        { title: 'Thread: 5 tips tối ưu quy trình', platform: 'twitter', type: 'text', reach: 4100, likes: 188, er: 4.8 }
    ];
}

function getFallbackBreakdown(range = '30d', compareOn = false) {
    const days = Math.min(getRangeDays(range), 30); // cap chart points at 30
    
    // If custom range, generate labels from actual dates
    let labels;
    if (range === 'custom' && _customRange) {
        const start = new Date(_customRange.from);
        labels = Array.from({length:days}, (_,i) => {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            return d.getDate()+'/'+(d.getMonth()+1);
        });
    } else {
        labels = Array.from({length:days}, (_,i) => { const d = new Date(); d.setDate(d.getDate()-(days-1-i)); return d.getDate()+'/'+(d.getMonth()+1); });
    }
    
    const reach = labels.map(() => 1000 + Math.random()*2000);
    const followers = labels.map((_,i) => 12000 + (i*10) + Math.random()*20);
    
    const growth = { labels, reach, followers };
    
    // Add comparison data (from Kỳ B or previous period)
    if (compareOn || (_customCompare)) {
        growth.prevReach = reach.map(v => v * (0.7 + Math.random()*0.2));
        growth.prevFollowers = followers.map(v => v - 200 - Math.random()*100);
    }
    
    return {
        growth,
        engagement: {
            labels,
            likes: labels.map(() => 50 + Math.random()*150),
            comments: labels.map(() => 10 + Math.random()*40),
            shares: labels.map(() => Math.random()*20)
        }
    };
}
