// ============================================================
// Social Listening UI — Phase O: 4-Tab Advanced Dashboard
// Tabs: Feed | Sentiment Dashboard | Keywords Manager | Alerts
// ============================================================

import { addKeyword, removeKeyword, getKeywords, getMentions, getSentimentSummary,
         onUpdate, loadKeywords, getSentimentSummaryFromAPI, getSentimentTrends, getAlerts } from './listening-store.js';
import { startListeningPolling } from './listening-fetcher.js';

const PLATFORM_COLORS = { facebook: '#1877F2', instagram: '#E1306C', twitter: '#1DA1F2', linkedin: '#0077B5' };
let activeTab = 'feed';

export async function renderListening(container) {
  container.innerHTML = getShellHTML();
  if (window.refreshIcons) window.refreshIcons();

  // Load persisted keywords from API
  await loadKeywords();

  // Seed default keywords if empty
  if (getKeywords().length === 0) {
    await addKeyword('sản phẩm');
    await addKeyword('đánh giá');
  }

  startListeningPolling((count) => {
    if (window.Toast) window.Toast.show(`🔍 ${count} mentions mới`, 'info');
    renderActiveTab(container);
  });

  onUpdate(() => renderActiveTab(container));
  bindShellEvents(container);
  renderActiveTab(container);
}

// ── Shell HTML ────────────────────────────────────────────────
function getShellHTML() {
  return `
    <div style="display:flex;flex-direction:column;gap:var(--space-4)">
      <div>
        <h2 style="margin:0">Social Listening & Sentiment</h2>
        <p style="color:var(--color-text-muted);margin:var(--space-1) 0 0 0;font-size:var(--text-sm)">Theo dõi mentions, phân tích cảm xúc và phát hiện crisis</p>
      </div>

      <div class="analytics-tabs">
        <button class="at-tab active" data-tab="feed">📡 Feed</button>
        <button class="at-tab" data-tab="sentiment">📊 Sentiment</button>
        <button class="at-tab" data-tab="keywords">🔑 Keywords</button>
        <button class="at-tab" data-tab="alerts">🚨 Alerts</button>
      </div>

      <div id="listening-content"></div>
    </div>
  `;
}

function bindShellEvents(container) {
  container.querySelectorAll('.at-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.at-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.tab;
      renderActiveTab(container);
    });
  });
}

async function renderActiveTab(container) {
  const content = container.querySelector('#listening-content');
  if (!content) return;
  switch (activeTab) {
    case 'feed':      renderFeed(content); break;
    case 'sentiment': await renderSentimentDashboard(content); break;
    case 'keywords':  renderKeywordsManager(content); break;
    case 'alerts':    await renderAlertsTab(content); break;
  }
  if (window.refreshIcons) window.refreshIcons();
}

// ══════════════════════════════════════════════════════════════
// TAB 1: FEED
// ══════════════════════════════════════════════════════════════
function renderFeed(container) {
  const kws = getKeywords();

  container.innerHTML = `
    <div class="listening-layout">
      <div class="listening-sidebar">
        <div class="listening-card">
          <h3 style="margin:0 0 var(--space-3) 0;font-size:var(--text-sm);font-weight:600">Quick Add Keyword</h3>
          <div class="keyword-add-row">
            <input type="text" id="keyword-input" placeholder="Nhập từ khóa..." class="field-input" style="flex:1"/>
            <button id="btn-add-keyword" class="btn btn-primary btn-sm">+ Thêm</button>
          </div>
        </div>

        <div class="listening-card">
          <h3 style="margin:0 0 var(--space-3) 0;font-size:var(--text-sm);font-weight:600">Cảm xúc tổng thể</h3>
          <div id="sentiment-summary"></div>
        </div>
      </div>

      <div class="listening-main">
        <div class="mentions-filters">
          <select id="filter-mention-keyword" class="field-select"><option value="">Tất cả từ khóa</option>${kws.map(kw => `<option value="${kw.term}">${kw.term} (${kw.mentionCount})</option>`).join('')}</select>
          <select id="filter-mention-sentiment" class="field-select">
            <option value="">Tất cả cảm xúc</option>
            <option value="positive">😊 Tích cực</option>
            <option value="neutral">😐 Trung lập</option>
            <option value="negative">😞 Tiêu cực</option>
          </select>
          <select id="filter-mention-platform" class="field-select">
            <option value="">Tất cả platforms</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="twitter">X/Twitter</option>
          </select>
        </div>
        <div id="mentions-feed" class="mentions-feed"></div>
      </div>
    </div>
  `;

  refreshMentionsFeed(container);
  refreshSentiment(container);
  bindFeedEvents(container);
}

function refreshMentionsFeed(container) {
  const keyword = container.querySelector('#filter-mention-keyword')?.value || '';
  const sentiment = container.querySelector('#filter-mention-sentiment')?.value || '';
  const platform = container.querySelector('#filter-mention-platform')?.value || '';

  const mentions = getMentions({ keyword, platform, sentiment });
  const feedEl = container.querySelector('#mentions-feed');
  if (!feedEl) return;

  if (!mentions.length) {
    feedEl.innerHTML = '<div style="text-align:center;padding:var(--space-8);color:var(--color-text-muted)"><p>Chưa có mentions. Thêm từ khóa để bắt đầu theo dõi.</p></div>';
    return;
  }

  const sentimentCfg = {
    positive: { icon: '😊', label: 'Tích cực', color: 'var(--color-success)' },
    neutral:  { icon: '😐', label: 'Trung lập', color: 'var(--color-text-muted)' },
    negative: { icon: '😞', label: 'Tiêu cực', color: 'var(--color-error)' }
  };

  feedEl.innerHTML = mentions.slice(0, 50).map(m => {
    const sc = sentimentCfg[m.sentiment] || sentimentCfg.neutral;
    const scoreDisplay = m.sentimentScore !== undefined ? ` (${m.sentimentScore > 0 ? '+' : ''}${m.sentimentScore})` : '';
    return `
      <div class="mention-card">
        <div class="mention-header">
          <div class="mention-platform" style="color:${PLATFORM_COLORS[m.platform] || '#888'}">${m.platform}</div>
          <div class="mention-sentiment" style="color:${sc.color}">${sc.icon} ${sc.label}${scoreDisplay}</div>
          <div class="mention-time">${_relTime(m.timestamp)}</div>
        </div>
        <div class="mention-from">@${m.from}</div>
        <div class="mention-text">${_highlight(m.text, m.keyword)}</div>
        <div class="mention-actions">
          <button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText('${m.text.replace(/'/g, "\\'")}')">📋 Copy</button>
        </div>
      </div>
    `;
  }).join('');
}

function refreshSentiment(container) {
  const summary = getSentimentSummary();
  const el = container.querySelector('#sentiment-summary');
  if (!el) return;
  const total = summary.positive + summary.neutral + summary.negative || 1;

  el.innerHTML = `
    <div class="sentiment-bar">
      <div class="sentiment-seg positive" style="width:${summary.positive / total * 100}%" title="Tích cực: ${summary.positive}"></div>
      <div class="sentiment-seg neutral" style="width:${summary.neutral / total * 100}%" title="Trung lập: ${summary.neutral}"></div>
      <div class="sentiment-seg negative" style="width:${summary.negative / total * 100}%" title="Tiêu cực: ${summary.negative}"></div>
    </div>
    <div class="sentiment-legend">
      <span class="sleg positive">😊 ${summary.positive}</span>
      <span class="sleg neutral">😐 ${summary.neutral}</span>
      <span class="sleg negative">😞 ${summary.negative}</span>
    </div>
  `;
}

function bindFeedEvents(container) {
  const addAction = async () => {
    const input = container.querySelector('#keyword-input');
    const term = input?.value.trim();
    if (!term) { if (window.Toast) window.Toast.show('Nhập từ khóa', 'error'); return; }
    if (getKeywords().length >= 10) { if (window.Toast) window.Toast.show('Tối đa 10 từ khóa', 'warning'); return; }
    await addKeyword(term);
    input.value = '';
    if (window.Toast) window.Toast.show(`Đang theo dõi: "${term}"`, 'success');
  };
  container.querySelector('#btn-add-keyword')?.addEventListener('click', addAction);
  container.querySelector('#keyword-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') addAction(); });

  ['#filter-mention-keyword', '#filter-mention-sentiment', '#filter-mention-platform'].forEach(sel => {
    container.querySelector(sel)?.addEventListener('change', () => refreshMentionsFeed(container));
  });
}

// ══════════════════════════════════════════════════════════════
// TAB 2: SENTIMENT DASHBOARD
// ══════════════════════════════════════════════════════════════
async function renderSentimentDashboard(container) {
  const summary = await getSentimentSummaryFromAPI();
  const trends = await getSentimentTrends(30);

  const total = summary.total || (summary.positive + summary.neutral + summary.negative) || 1;
  const posPct = ((summary.positive / total) * 100).toFixed(0);
  const neuPct = ((summary.neutral / total) * 100).toFixed(0);
  const negPct = ((summary.negative / total) * 100).toFixed(0);
  const healthColor = summary.brandHealth >= 70 ? 'var(--color-success)' : summary.brandHealth >= 40 ? 'var(--color-warning)' : 'var(--color-error)';

  container.innerHTML = `
    <div class="kpi-grid" style="margin-bottom:var(--space-4)">
      <div class="kpi-card">
        <div class="kpi-icon" style="background:color-mix(in srgb, var(--color-primary) 12%, transparent);color:var(--color-primary)"><i data-lucide="activity" width="20" height="20"></i></div>
        <div class="kpi-body"><div class="kpi-label">Brand Health</div><div class="kpi-value" style="color:${healthColor}">${summary.brandHealth || 50}/100</div><div class="kpi-change">Avg Score: ${summary.avgScore || 0}</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:color-mix(in srgb, var(--color-success) 12%, transparent);color:var(--color-success)">😊</div>
        <div class="kpi-body"><div class="kpi-label">Tích cực</div><div class="kpi-value" style="color:var(--color-success)">${posPct}%</div><div class="kpi-change">${summary.positive} mentions</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:color-mix(in srgb, var(--color-text-muted) 12%, transparent);color:var(--color-text-muted)">😐</div>
        <div class="kpi-body"><div class="kpi-label">Trung lập</div><div class="kpi-value">${neuPct}%</div><div class="kpi-change">${summary.neutral} mentions</div></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:color-mix(in srgb, var(--color-error) 12%, transparent);color:var(--color-error)">😞</div>
        <div class="kpi-body"><div class="kpi-label">Tiêu cực</div><div class="kpi-value" style="color:var(--color-error)">${negPct}%</div><div class="kpi-change">${summary.negative} mentions</div></div>
      </div>
    </div>

    <div class="chart-card" style="margin-bottom:var(--space-4)">
      <div class="chart-card-header"><h3 style="margin:0">Sentiment Trend (30 ngày)</h3></div>
      ${trends.length > 0 ? `
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead><tr><th>Ngày</th><th>😊 Pos</th><th>😐 Neu</th><th>😞 Neg</th><th>Tổng</th><th>Avg Score</th></tr></thead>
            <tbody>${trends.map(t => `
              <tr>
                <td>${t.date}</td>
                <td style="color:var(--color-success);font-weight:700">${t.positive}</td>
                <td>${t.neutral}</td>
                <td style="color:var(--color-error);font-weight:700">${t.negative}</td>
                <td>${t.total}</td>
                <td><span class="er-badge ${t.avgScore > 0 ? 'er-good' : t.avgScore < 0 ? '' : ''}" style="color:${t.avgScore > 0 ? 'var(--color-success)' : t.avgScore < 0 ? 'var(--color-error)' : 'var(--color-text-muted)'}">${t.avgScore > 0 ? '+' : ''}${t.avgScore}</span></td>
              </tr>
            `).join('')}</tbody>
          </table>
        </div>
      ` : '<p style="text-align:center;color:var(--color-text-muted);padding:var(--space-4)">Chưa có dữ liệu sentiment trends. Thêm từ khóa và chờ mentions thu thập.</p>'}
    </div>

    <div class="insight-cards">
      <div class="insight-card ${parseInt(posPct) >= 50 ? 'insight-positive' : 'insight-warning'}">
        <div class="insight-icon">💡</div>
        <div class="insight-body">
          <div class="insight-title">Khuyến nghị</div>
          <div class="insight-value">${parseInt(posPct) >= 50 ? 'Sentiment tích cực' : parseInt(negPct) > 30 ? 'Cần cải thiện' : 'Ổn định'}</div>
          <div class="insight-sub">${parseInt(posPct) >= 50 ? 'Thương hiệu đang nhận phản hồi tốt!' : 'Cần theo dõi và phản hồi mentions tiêu cực kịp thời.'}</div>
        </div>
      </div>
    </div>
  `;
}

// ══════════════════════════════════════════════════════════════
// TAB 3: KEYWORDS MANAGER
// ══════════════════════════════════════════════════════════════
function renderKeywordsManager(container) {
  const kws = getKeywords();

  container.innerHTML = `
    <div class="chart-card" style="margin-bottom:var(--space-4)">
      <div class="chart-card-header">
        <h3 style="margin:0">Quản lý từ khóa (${kws.length}/10)</h3>
      </div>
      <div class="keyword-add-row" style="margin-bottom:var(--space-3)">
        <input type="text" id="kw-mgr-input" placeholder="Nhập từ khóa mới..." class="field-input" style="flex:1"/>
        <button id="btn-kw-mgr-add" class="btn btn-primary btn-sm">+ Thêm</button>
      </div>

      ${kws.length === 0 ? '<p style="color:var(--color-text-muted);text-align:center;padding:var(--space-4)">Chưa có từ khóa. Thêm từ khóa để bắt đầu theo dõi Social Listening.</p>' : ''}

      <div class="content-er-list">
        ${kws.map(kw => {
          const maxCount = Math.max(...kws.map(k => k.mentionCount || 1), 1);
          const barW = Math.round(((kw.mentionCount || 0) / maxCount) * 100);
          return `
            <div class="er-row" style="align-items:center">
              <span class="kw-dot" style="background:${kw.color};width:8px;height:8px;border-radius:50%;flex-shrink:0"></span>
              <span class="er-type" style="min-width:120px">${kw.term}</span>
              <div class="er-bar-wrap"><div class="er-bar" style="width:${barW}%;background:${kw.color}"></div></div>
              <span class="er-val">${kw.mentionCount || 0}</span>
              <button class="btn btn-ghost btn-sm kw-mgr-remove" data-id="${kw.id}" style="padding:2px 6px;font-size:12px">🗑</button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // Events
  const addAction = async () => {
    const input = container.querySelector('#kw-mgr-input');
    const term = input?.value.trim();
    if (!term) return;
    if (kws.length >= 10) { if (window.Toast) window.Toast.show('Tối đa 10 từ khóa', 'warning'); return; }
    await addKeyword(term);
    input.value = '';
    if (window.Toast) window.Toast.show(`Đã thêm: "${term}"`, 'success');
  };
  container.querySelector('#btn-kw-mgr-add')?.addEventListener('click', addAction);
  container.querySelector('#kw-mgr-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') addAction(); });
  container.querySelectorAll('.kw-mgr-remove').forEach(btn => {
    btn.addEventListener('click', async () => {
      await removeKeyword(btn.dataset.id);
      if (window.Toast) window.Toast.show('Đã xóa từ khóa', 'info');
    });
  });
}

// ══════════════════════════════════════════════════════════════
// TAB 4: ALERTS
// ══════════════════════════════════════════════════════════════
async function renderAlertsTab(container) {
  const alerts = await getAlerts();

  const levelStyle = {
    critical: { bg: 'color-mix(in srgb, var(--color-error) 8%, transparent)', border: 'var(--color-error)', icon: '🚨' },
    warning: { bg: 'color-mix(in srgb, var(--color-warning) 8%, transparent)', border: 'var(--color-warning)', icon: '⚠️' },
    info: { bg: 'color-mix(in srgb, var(--color-primary) 8%, transparent)', border: 'var(--color-primary)', icon: '📈' }
  };

  container.innerHTML = `
    <div class="chart-card">
      <div class="chart-card-header"><h3 style="margin:0">Cảnh báo Sentiment</h3><p style="margin:4px 0 0 0;font-size:var(--text-xs);color:var(--color-text-muted)">Hệ thống tự động giám sát mentions 24/7</p></div>

      ${alerts.length === 0 ? `
        <div style="text-align:center;padding:var(--space-8);color:var(--color-text-muted)">
          <div style="font-size:48px;margin-bottom:var(--space-2)">✅</div>
          <p style="font-weight:700">Không có cảnh báo</p>
          <p style="font-size:var(--text-xs)">Hệ thống hoạt động ổn định. Sentiment đang trong ngưỡng bình thường.</p>
        </div>
      ` : `
        <div style="display:flex;flex-direction:column;gap:var(--space-3)">
          ${alerts.map(a => {
            const ls = levelStyle[a.level] || levelStyle.info;
            return `
              <div style="background:${ls.bg};border:1px solid ${ls.border};border-left:4px solid ${ls.border};border-radius:var(--radius-md);padding:var(--space-3) var(--space-4)">
                <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-1)">
                  <span style="font-size:20px">${ls.icon}</span>
                  <strong style="font-size:var(--text-sm)">${a.title}</strong>
                  <span style="margin-left:auto;font-size:var(--text-xs);color:var(--color-text-muted)">${_relTime(a.timestamp)}</span>
                </div>
                <p style="margin:0;font-size:var(--text-xs);color:var(--color-text-muted)">${a.message}</p>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>

    <div class="chart-card" style="margin-top:var(--space-4)">
      <h4 style="margin-top:0">Cấu hình cảnh báo</h4>
      <div style="display:flex;flex-direction:column;gap:var(--space-3)">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-2);background:var(--color-surface-hover);border-radius:var(--radius-md)">
          <div><strong style="font-size:var(--text-sm)">Crisis Alert</strong><div style="font-size:var(--text-xs);color:var(--color-text-muted)">Cảnh báo khi >50% mentions tiêu cực trong 24h</div></div>
          <input type="checkbox" checked>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-2);background:var(--color-surface-hover);border-radius:var(--radius-md)">
          <div><strong style="font-size:var(--text-sm)">Spike Detection</strong><div style="font-size:var(--text-xs);color:var(--color-text-muted)">Phát hiện tăng đột biến mention volume</div></div>
          <input type="checkbox" checked>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-2);background:var(--color-surface-hover);border-radius:var(--radius-md)">
          <div><strong style="font-size:var(--text-sm)">Desktop Notification</strong><div style="font-size:var(--text-xs);color:var(--color-text-muted)">Gửi notification trên trình duyệt</div></div>
          <input type="checkbox">
        </div>
      </div>
    </div>
  `;
}

// ── Helpers ───────────────────────────────────────────────────
function _highlight(text, keyword) {
  if (!keyword) return text;
  return text.replace(new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark>$1</mark>');
}

function _relTime(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins}p`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  return Math.floor(h / 24) + ' ngày';
}
