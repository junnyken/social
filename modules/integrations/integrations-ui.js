import {
  configureGA4, getGA4Config, getGA4Stats, getGA4Events,
  trackPostPublished, trackConversion
} from './ga4-tracker.js';

import {
  getUTMTemplates, addUTMTemplate, generateUTM, batchGenerateUTM,
  getUTMHistory, getUTMStats
} from './utm-builder.js';

import {
  createTrackedLink, getTrackedLinks, getLinkAnalytics,
  trackLinkClick, getLinkClicks
} from './link-analytics.js';

import {
  configurePixel, getPixelConfig, getAllPixels, trackConversionEvent,
  trackPurchase, trackSignup, getPixelStats
} from './conversion-pixel.js';

import {
  calculatePostROI, calculatePlatformROI, getROIStats,
  logPostCost, logPostRevenue, projectROI
} from './roi-calculator.js';

const showToast = (msg, type) => window.Toast && window.Toast.show(msg, type);
let integrationsTab = 'ga4';

export function renderIntegrations(container) {
  container.innerHTML = getIntegrationsHTML();
  bindIntegrationsEvents(container);
  renderIntegrationsTab(container, integrationsTab);
}

function getIntegrationsHTML() {
  return `
  <div class="integrations-page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h2>🔗 Integrations & Analytics</h2>
        <p class="page-subtitle">GA4, UTM, Link Tracking, Pixels, ROI</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="integrations-tabs">
      <button class="int-tab active" data-tab="ga4">📊 GA4</button>
      <button class="int-tab" data-tab="utm">🔗 UTM Builder</button>
      <button class="int-tab" data-tab="links">📈 Link Analytics</button>
      <button class="int-tab" data-tab="pixels">📍 Conversion Pixels</button>
      <button class="int-tab" data-tab="roi">💰 ROI Calculator</button>
    </div>

    <!-- Tab Content -->
    <div id="integrations-content" class="integrations-content"></div>
  </div>`;
}

function renderIntegrationsTab(container, tab) {
  const content = container.querySelector('#integrations-content');
  integrationsTab = tab;

  switch (tab) {
    case 'ga4':     renderGA4Tab(content); break;
    case 'utm':     renderUTMTab(content); break;
    case 'links':   renderLinksTab(content); break;
    case 'pixels':  renderPixelsTab(content); break;
    case 'roi':     renderROITab(content); break;
  }
}

// ── Tab: GA4 ───────────────────────────────────────────────────
function renderGA4Tab(container) {
  const config = getGA4Config();
  const stats = getGA4Stats();

  container.innerHTML = `
  <div class="integration-section">
    <div class="section-header">
      <h3>📊 Google Analytics 4</h3>
      <div class="status-badge ${config.enabled ? 'connected' : 'disconnected'}">
        ${config.enabled ? '✅ Connected' : '⚠️ Not Connected'}
      </div>
    </div>

    ${!config.isConfigured ? `
      <!-- Setup Form -->
      <div class="setup-form">
        <p>Kết nối GA4 để track social posts, clicks, conversions</p>
        
        <div class="form-group">
          <label>Measurement ID</label>
          <input type="text" id="ga4-measurement-id" class="input-field"
            placeholder="G-XXXXXXXXXX" />
          <span class="hint">Tìm ở: Google Analytics > Admin > Data Streams</span>
        </div>

        <div class="form-group">
          <label>API Secret</label>
          <input type="password" id="ga4-api-secret" class="input-field"
            placeholder="Paste từ GA4 console" />
          <span class="hint">Backend only — dùng để send events</span>
        </div>

        <button class="btn-primary btn-lg" id="btn-setup-ga4">
          ✅ Connect GA4
        </button>
      </div>
    ` : `
      <!-- Stats -->
      <div class="ga4-stats">
        <div class="stat-card">
          <div class="stat-label">Total Events</div>
          <div class="stat-value">${stats.totalEvents}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Posts Published</div>
          <div class="stat-value">${stats.eventTypes.post_published}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Link Clicks</div>
          <div class="stat-value">${stats.eventTypes.link_clicked}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Conversions</div>
          <div class="stat-value">${stats.eventTypes.conversion_completed}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Revenue</div>
          <div class="stat-value">${stats.totalConversionValue.toLocaleString()} ₫</div>
        </div>
      </div>

      <!-- Event Log -->
      <div class="ga4-events">
        <h4>📋 Recent Events</h4>
        <div class="events-list">
          ${getGA4Events(null, 10).map(e => `
            <div class="event-item">
              <span class="event-name">${e.name}</span>
              <span class="event-time">${new Date(e.params.timestamp).toLocaleTimeString('vi-VN')}</span>
            </div>
          `).join('') || '<p class="empty">Chưa có events</p>'}
        </div>
      </div>

      <!-- Test Event Button -->
      <div style="margin-top:var(--space-4)">
        <button class="btn-secondary" id="btn-test-ga4-event">
          🧪 Send Test Event
        </button>
      </div>
    `}
  </div>`;

  if (!config.isConfigured) {
    container.querySelector('#btn-setup-ga4')?.addEventListener('click', () => {
      const measurementId = container.querySelector('#ga4-measurement-id').value;
      const apiSecret = container.querySelector('#ga4-api-secret').value;

      if (!measurementId || !apiSecret) {
        showToast('Vui lòng điền cả hai trường', 'error');
        return;
      }

      configureGA4({ measurementId, apiSecret });
      showToast('✅ GA4 đã kết nối!', 'success');
      renderIntegrationsTab(container.parentElement, 'ga4');
    });
  } else {
    container.querySelector('#btn-test-ga4-event')?.addEventListener('click', () => {
      trackPostPublished({
        id: 'test-' + Date.now(),
        platform: 'facebook',
        text: 'Test post for GA4',
        type: 'standard'
      });
      showToast('✅ Test event sent to GA4!', 'success');
      renderIntegrationsTab(container.parentElement, 'ga4');
    });
  }

  if (window.lucide) lucide.createIcons();
}

// ── Tab: UTM Builder ───────────────────────────────────────────
function renderUTMTab(container) {
  const templates = getUTMTemplates();
  const stats = getUTMStats();

  container.innerHTML = `
  <div class="integration-section">
    <div class="section-header">
      <h3>🔗 UTM Parameter Builder</h3>
      <button id="btn-add-utm-template" class="btn-primary btn-sm">
        + Template mới
      </button>
    </div>

    <!-- Stats -->
    <div class="utm-stats">
      <div class="stat-card">
        <div class="stat-label">Total UTMs</div>
        <div class="stat-value">${stats.totalUTMs}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Templates</div>
        <div class="stat-value">${templates.length}</div>
      </div>
    </div>

    <!-- Templates -->
    <div class="utm-templates">
      <h4>Templates</h4>
      <div class="templates-list">
        ${templates.map(t => `
          <div class="template-item">
            <div>
              <div class="template-name">${t.name} ${t.isDefault ? '(Default)' : ''}</div>
              <div class="template-pattern">Pattern: ${t.pattern}</div>
            </div>
            <button class="btn-ghost btn-sm use-template" data-template-id="${t.id}">
              Dùng
            </button>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Generator -->
    <div class="utm-generator">
      <h4>Tạo UTM</h4>
      <div class="form-group">
        <label>URL</label>
        <input type="url" id="utm-url" class="input-field"
          placeholder="https://example.com" />
      </div>
      
      <div class="form-row-2">
        <div class="form-group">
          <label>Platform</label>
          <select id="utm-platform" class="select-input">
            <option>facebook</option>
            <option>instagram</option>
            <option>twitter</option>
            <option>linkedin</option>
          </select>
        </div>
        <div class="form-group">
          <label>Campaign</label>
          <input type="text" id="utm-campaign" class="input-field"
            placeholder="summer_sale" />
        </div>
      </div>

      <button class="btn-primary" id="btn-generate-utm">
        ✅ Tạo UTM
      </button>

      <div id="utm-result" style="display:none">
        <div class="utm-url-box">
          <input type="text" id="utm-url-output" class="input-field" readonly />
          <button class="btn-secondary btn-sm" onclick="copyToClipboard('utm-url-output')">
            📋 Copy
          </button>
        </div>
      </div>
    </div>
  </div>`;

  container.querySelector('#btn-generate-utm')?.addEventListener('click', () => {
    const url = container.querySelector('#utm-url').value;
    const platform = container.querySelector('#utm-platform').value;
    const campaign = container.querySelector('#utm-campaign').value;

    if (!url || !campaign) {
      showToast('Vui lòng điền URL và Campaign', 'error');
      return;
    }

    const result = generateUTM({ url, platform, campaign });
    container.querySelector('#utm-url-output').value = result.utmUrl;
    container.querySelector('#utm-result').style.display = 'block';
    showToast('✅ UTM đã tạo!', 'success');
  });

  if (window.lucide) lucide.createIcons();
}

// ── Tab: Link Analytics ────────────────────────────────────────
function renderLinksTab(container) {
  const links = getTrackedLinks(null, 20);

  container.innerHTML = `
  <div class="integration-section">
    <div class="section-header">
      <h3>📈 Link Analytics & Tracking</h3>
      <button id="btn-create-tracked-link" class="btn-primary btn-sm">
        + Link mới
      </button>
    </div>

    ${links.length === 0 ? `
      <div class="empty-state">
        <i data-lucide="link" width="40" height="40"></i>
        <p>Chưa có tracked links</p>
      </div>
    ` : `
      <div class="links-table">
        <table>
          <thead>
            <tr>
              <th>Short Link</th>
              <th>Campaign</th>
              <th>Clicks</th>
              <th>Unique</th>
              <th>CTR</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${links.map(l => `
              <tr>
                <td>${l.shortCode}</td>
                <td>${l.campaign}</td>
                <td>${l.clicks}</td>
                <td>${l.uniqueClicks}</td>
                <td>${((l.uniqueClicks / Math.max(1, l.clicks)) * 100).toFixed(1)}%</td>
                <td>
                  <button class="btn-ghost btn-sm link-detail" data-link-id="${l.id}">
                    📊 Details
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `}
  </div>`;

  container.querySelector('#btn-create-tracked-link')?.addEventListener('click', () => {
    const url = prompt('Link URL:');
    if (url) {
      createTrackedLink({ url, campaign: 'campaign_' + Date.now() });
      showToast('✅ Tracked link tạo thành công!', 'success');
      renderIntegrationsTab(container.parentElement, 'links');
    }
  });

  container.querySelectorAll('.link-detail').forEach(btn => {
    btn.addEventListener('click', () => {
      const linkId = btn.dataset.linkId;
      const analytics = getLinkAnalytics(linkId);
      showLinkAnalyticsModal(analytics);
    });
  });

  if (window.lucide) lucide.createIcons();
}

// ── Tab: Conversion Pixels ─────────────────────────────────────
function renderPixelsTab(container) {
  const pixels = getAllPixels();
  const stats = getPixelStats();

  container.innerHTML = `
  <div class="integration-section">
    <div class="section-header">
      <h3>📍 Conversion Pixels</h3>
    </div>

    <!-- Stats -->
    <div class="pixel-stats">
      <div class="stat-card">
        <div class="stat-label">Total Conversions</div>
        <div class="stat-value">${stats.totalEvents}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Value</div>
        <div class="stat-value">${stats.totalValue.toLocaleString()} ₫</div>
      </div>
    </div>

    <!-- Pixel Setup -->
    <div class="pixels-setup">
      <h4>Kết nối Pixels</h4>
      <div class="pixels-list">
        ${pixels.map(p => {
          const config = getPixelConfig(p.platform);
          return `
          <div class="pixel-card">
            <div class="pixel-header">
              <span class="pixel-name">
                ${p.platform === 'facebook' ? '📘' : p.platform === 'tiktok' ? '🎵' : '🔵'}
                ${p.platform.toUpperCase()}
              </span>
              <span class="pixel-status ${p.enabled ? 'active' : 'inactive'}">
                ${p.enabled ? 'Active' : 'Inactive'}
              </span>
            </div>
            <button class="btn-secondary btn-sm" data-platform="${p.platform}">
              ${p.enabled ? '⚙️ Settings' : '🔗 Connect'}
            </button>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- Test Conversion -->
    <div class="pixel-test">
      <h4>Test Conversion</h4>
      <button class="btn-secondary" id="btn-test-conversion">
        🧪 Trigger Test Conversion
      </button>
    </div>
  </div>`;

  container.querySelector('#btn-test-conversion')?.addEventListener('click', () => {
    trackConversionEvent({
      type: 'purchase',
      value: Math.random() * 1000000,
      currency: 'VND',
      contentName: 'test_product'
    });
    showToast('✅ Test conversion sent!', 'success');
  });

  if (window.lucide) lucide.createIcons();
}

// ── Tab: ROI Calculator ────────────────────────────────────────
function renderROITab(container) {
  const roiStats = getROIStats();

  container.innerHTML = `
  <div class="integration-section">
    <div class="section-header">
      <h3>💰 ROI Calculator</h3>
    </div>

    <!-- Overall ROI -->
    <div class="roi-hero">
      <div class="roi-card primary">
        <div class="roi-label">Overall ROI</div>
        <div class="roi-value">${roiStats.overallROI}</div>
      </div>
      <div class="roi-card">
        <div class="roi-label">Total Spend</div>
        <div class="roi-value">${roiStats.totalSpend.toLocaleString()} ₫</div>
      </div>
      <div class="roi-card">
        <div class="roi-label">Total Revenue</div>
        <div class="roi-value">${roiStats.totalRevenue.toLocaleString()} ₫</div>
      </div>
      <div class="roi-card success">
        <div class="roi-label">Profit</div>
        <div class="roi-value">${roiStats.totalProfit.toLocaleString()} ₫</div>
      </div>
    </div>

    <!-- Log Cost/Revenue -->
    <div class="roi-input">
      <h4>Log Transaction</h4>
      <div class="form-row-2">
        <div class="form-group">
          <label>Amount (₫)</label>
          <input type="number" id="roi-amount" class="input-field"
            placeholder="100000" />
        </div>
        <div class="form-group">
          <label>Type</label>
          <select id="roi-type" class="select-input">
            <option value="cost">Ad Spend</option>
            <option value="revenue">Revenue</option>
          </select>
        </div>
      </div>
      <button class="btn-primary" id="btn-log-roi">
        ✅ Log
      </button>
    </div>

    <!-- ROI Projection -->
    <div class="roi-projection">
      <h4>ROI Projection</h4>
      <div class="form-group">
        <label>Projected Spend (₫)</label>
        <input type="number" id="projection-spend" class="input-field"
          placeholder="1000000" />
      </div>
      <button class="btn-secondary" id="btn-project-roi">
        📊 Calculate Projection
      </button>
      <div id="projection-result" style="display:none">
        <div class="projection-box">
          <div class="proj-item">
            <span>Projected Revenue:</span>
            <strong id="proj-revenue">—</strong>
          </div>
          <div class="proj-item">
            <span>Projected ROI:</span>
            <strong id="proj-roi">—</strong>
          </div>
        </div>
      </div>
    </div>
  </div>`;

  container.querySelector('#btn-log-roi')?.addEventListener('click', () => {
    const amount = parseFloat(container.querySelector('#roi-amount').value);
    const type = container.querySelector('#roi-type').value;

    if (!amount || amount <= 0) {
      showToast('Vui lòng nhập số tiền hợp lệ', 'error');
      return;
    }

    if (type === 'cost') {
      logPostCost({ amount, currency: 'VND' });
    } else {
      logPostRevenue({ amount, currency: 'VND' });
    }

    showToast('✅ Transaction logged!', 'success');
    renderIntegrationsTab(container.parentElement, 'roi');
  });

  container.querySelector('#btn-project-roi')?.addEventListener('click', () => {
    const spend = parseFloat(container.querySelector('#projection-spend').value);
    if (!spend || spend <= 0) {
      showToast('Vui lòng nhập số tiền hợp lệ', 'error');
      return;
    }

    const projection = projectROI(roiStats.totalSpend, roiStats.totalRevenue, spend);
    container.querySelector('#proj-revenue').textContent = 
      projection.projectedRevenue + ' ₫';
    container.querySelector('#proj-roi').textContent =
      projection.projectedRoi;
    container.querySelector('#projection-result').style.display = 'block';
  });

  if (window.lucide) lucide.createIcons();
}

// ── Event Binder ───────────────────────────────────────────────
function bindIntegrationsEvents(container) {
  container.querySelectorAll('.int-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.int-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderIntegrationsTab(container, tab.dataset.tab);
    });
  });
}

function showLinkAnalyticsModal(analytics) {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
  <div class="modal-box modal-lg">
    <div class="modal-header">
      <h3>Link Analytics: ${analytics.link.name}</h3>
      <button class="btn-ghost close-modal">✕</button>
    </div>
    <div class="modal-body">
      <div class="analytics-grid">
        <div class="metric">
          <div class="metric-label">Total Clicks</div>
          <div class="metric-value">${analytics.clicks}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Unique Clicks</div>
          <div class="metric-value">${analytics.uniqueClicks}</div>
        </div>
        <div class="metric">
          <div class="metric-label">CTR</div>
          <div class="metric-value">${analytics.clickRate}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Avg/Day</div>
          <div class="metric-value">${analytics.avgClicksPerDay}</div>
        </div>
      </div>

      ${Object.keys(analytics.deviceBreakdown).length > 0 ? `
      <div class="breakdown">
        <h4>By Device</h4>
        ${Object.entries(analytics.deviceBreakdown).map(([device, count]) => `
          <div class="breakdown-item">
            <span>${device}</span>
            <strong>${count}</strong>
          </div>
        `).join('')}
      </div>
      ` : ''}
    </div>
    <div class="modal-footer">
      <button class="btn-secondary close-modal">Close</button>
    </div>
  </div>`;

  document.body.appendChild(modal);
  modal.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => modal.remove());
  });
}

export { renderIntegrations };
