import {
  optimizePostContent, getContentScorecard, generateOptimizedContent
} from './content-optimizer.js';

import {
  getPostRecommendations, suggestPostContent, findBestPostingTimes
} from './recommendation-engine.js';

import {
  analyzeAudience, segmentAudience
} from './audience-analyzer.js';

import {
  detectTrends, getTrendAlerts, generateTrendContentIdeas
} from './trend-detector.js';

import {
  createABTest, analyzeABTest, getABTestRecommendations
} from './ab-test-optimizer.js';

import {
  predictPostPerformance, predictFollowerGrowth, predictBestPostTime
} from './predictive-analytics.js';

const showToast = (msg, type) => {
  if (window.Toast && window.Toast.show) window.Toast.show(msg, type);
};

let aiTab = 'optimizer';

export function renderAIBrain(container) {
  container.innerHTML = getAIHTML();
  bindAIEvents(container);
  renderAITab(container, aiTab);
}

function getAIHTML() {
  return `
  <div class="ai-page">
    <div class="page-header">
      <div>
        <h2>🤖 AI Optimization Hub</h2>
        <p class="page-subtitle">Smart recommendations, trends, analytics</p>
      </div>
    </div>

    <div class="ai-tabs">
      <button class="ai-tab active" data-tab="optimizer">✨ Content Optimizer</button>
      <button class="ai-tab" data-tab="recommendations">💡 Recommendations</button>
      <button class="ai-tab" data-tab="audience">👥 Audience</button>
      <button class="ai-tab" data-tab="trends">🔥 Trends</button>
      <button class="ai-tab" data-tab="ab-test">📊 A/B Tests</button>
      <button class="ai-tab" data-tab="predict">🔮 Predictions</button>
    </div>

    <div id="ai-brain-content" class="ai-content"></div>
  </div>`;
}

function renderAITab(container, tab) {
  const content = container.querySelector('#ai-brain-content');
  if (!content) return;
  aiTab = tab;

  switch (tab) {
    case 'optimizer':       renderOptimizerTab(content); break;
    case 'recommendations': renderRecommendationsTab(content); break;
    case 'audience':        renderAudienceTab(content); break;
    case 'trends':          renderTrendsTab(content); break;
    case 'ab-test':         renderABTestTab(content); break;
    case 'predict':         renderPredictTab(content); break;
  }
}

// ── Tab: Content Optimizer ────────────────────────────────
function renderOptimizerTab(container) {
  container.innerHTML = `
  <div class="ai-section">
    <div class="section-header"><h3>✨ Content Optimizer</h3></div>

    <div class="optimizer-form">
      <div class="form-group">
        <label>Post Text</label>
        <textarea id="optimizer-text" class="textarea-field" 
          placeholder="Paste your post content..." rows="6"></textarea>
      </div>
      
      <div class="form-row-2">
        <div class="form-group">
          <label>Platform</label>
          <select id="optimizer-platform" class="select-input">
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="twitter">Twitter</option>
            <option value="linkedin">LinkedIn</option>
            <option value="tiktok">TikTok</option>
          </select>
        </div>
        <div class="form-group">
          <label>Media Type</label>
          <select id="optimizer-media" class="select-input">
            <option value="text">Text only</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="carousel">Carousel</option>
          </select>
        </div>
      </div>

      <button class="btn-primary" id="btn-analyze-content">
        🔍 Analyze & Optimize
      </button>

      <div id="optimizer-result" style="display:none"></div>
    </div>
  </div>`;

  container.querySelector('#btn-analyze-content')?.addEventListener('click', () => {
    const text = container.querySelector('#optimizer-text').value;
    const platform = container.querySelector('#optimizer-platform').value;

    if (!text) { showToast('Please enter post content', 'error'); return; }

    const post = { text, platform, id: 'test-' + Date.now() };
    const scorecard = getContentScorecard(post);
    const optimized = generateOptimizedContent(post);

    const resultHTML = `
    <div class="optimizer-results">
      <div class="score-display">
        <div class="score-circle">
          <div class="score-number">${scorecard.overallScore}</div>
          <div class="score-label">Score</div>
        </div>
        <div class="score-label-big">${scorecard.scoreLabel}</div>
      </div>

      <div class="suggestions-list">
        <h4>📋 Suggestions</h4>
        ${scorecard.suggestions.map(s => `
          <div class="suggestion-item severity-${s.severity}">
            <div class="suggestion-icon">${
              s.severity === 'high' ? '🔴' : s.severity === 'medium' ? '🟡' : '🟢'
            }</div>
            <div class="suggestion-text">
              <div class="suggestion-message">${s.message}</div>
              <div class="suggestion-impact">Impact: ${s.impact > 0 ? '+' : ''}${s.impact}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="metrics-display">
        <h4>📊 Content Metrics</h4>
        <div class="metrics-grid">
          <div class="metric"><span class="metric-label">Characters</span><span class="metric-value">${scorecard.metrics.textLength}</span></div>
          <div class="metric"><span class="metric-label">Hashtags</span><span class="metric-value">${scorecard.metrics.hashtagCount}</span></div>
          <div class="metric"><span class="metric-label">Emojis</span><span class="metric-value">${scorecard.metrics.emojiCount}</span></div>
          <div class="metric"><span class="metric-label">Sentiment</span><span class="metric-value">${scorecard.metrics.sentimentLabel}</span></div>
        </div>
      </div>

      <div class="optimized-version">
        <h4>✨ Optimized Version</h4>
        <div class="optimized-text">${optimized}</div>
        <button class="btn-secondary btn-sm" id="btn-copy-optimized">📋 Copy Optimized</button>
      </div>
    </div>`;

    const resultEl = container.querySelector('#optimizer-result');
    resultEl.innerHTML = resultHTML;
    resultEl.style.display = 'block';

    resultEl.querySelector('#btn-copy-optimized')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(optimized).then(() => showToast('Copied!', 'success'));
    });
  });
}

// ── Tab: Recommendations ──────────────────────────────────
function renderRecommendationsTab(container) {
  const context = {
    topPerformers: {
      videoEngagementRate: 0.12, carouselEngagementRate: 0.08,
      topTopics: [
        { name: 'AI trends', engagementRate: 0.095 },
        { name: 'Social media', engagementRate: 0.087 },
        { name: 'Marketing tips', engagementRate: 0.078 }
      ]
    },
    bestTimes: [
      { time: '7:00 PM', dayOfWeek: 'Wednesday', reach: 15000 },
      { time: '12:00 PM', dayOfWeek: 'Friday', reach: 12000 }
    ],
    platformMetrics: {
      instagram: { weeklyReach: 50000, engagementRate: 0.075 },
      facebook: { weeklyReach: 25000, engagementRate: 0.035 }
    },
    trends: [
      { name: 'AI', momentum: 0.95 },
      { name: 'Content Marketing', momentum: 0.82 }
    ]
  };

  const recommendations = getPostRecommendations(context);

  container.innerHTML = `
  <div class="ai-section">
    <div class="section-header"><h3>💡 Smart Recommendations</h3></div>
    <div class="recommendations-list">
      ${recommendations.map(rec => `
        <div class="recommendation-card priority-${rec.priority}">
          <div class="recommendation-header">
            <h4>${rec.title}</h4>
            <span class="priority-badge">${rec.priority.toUpperCase()}</span>
          </div>
          <p class="recommendation-desc">${rec.description}</p>
          <div class="recommendation-meta">
            <span class="expected-lift">Expected: ${rec.expectedLift}</span>
            ${rec.timeLimit ? `<span class="time-limit">⏱️ ${rec.timeLimit}</span>` : ''}
          </div>
          <button class="btn-secondary btn-sm">✅ ${rec.action}</button>
        </div>
      `).join('')}
    </div>
  </div>`;
}

// ── Tab: Audience ──────────────────────────────────────────
function renderAudienceTab(container) {
  const audience = {
    followers: 45000,
    demographics: {
      ageGroups: { '13-17': 12, '18-24': 38, '25-34': 28, '35-44': 16, '45+': 6 },
      gender: { Female: 62, Male: 35, Other: 3 },
      topCountries: [
        { country: 'Vietnam', percentage: 52 },
        { country: 'Thailand', percentage: 18 },
        { country: 'Philippines', percentage: 15 },
        { country: 'Indonesia', percentage: 10 },
        { country: 'Others', percentage: 5 }
      ]
    },
    interests: ['Technology', 'Marketing', 'Business', 'Innovation']
  };

  const analysis = analyzeAudience(audience, []);
  const segments = segmentAudience(audience, {});

  container.innerHTML = `
  <div class="ai-section">
    <div class="section-header"><h3>👥 Audience Insights</h3></div>

    <div class="insights-grid">
      <div class="insight-card">
        <h4>📊 Demographics</h4>
        <div class="demographics-chart">
          ${Object.entries(audience.demographics.ageGroups).map(([age, pct]) => `
            <div class="demo-item">
              <span>${age}</span>
              <div class="demo-bar"><div class="demo-fill" style="width:${pct}%"></div></div>
              <span>${pct.toFixed(0)}%</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="insight-card">
        <h4>💓 Top Interests</h4>
        <ul class="interests-list">
          ${analysis.interests.slice(0, 5).map(int => `
            <li>${int.topic} <span class="affinity">${int.affinity.toFixed(0)}%</span></li>
          `).join('')}
        </ul>
      </div>

      <div class="insight-card">
        <h4>🗺️ Top Locations</h4>
        <ul class="locations-list">
          ${audience.demographics.topCountries.map(loc => `
            <li>${loc.country} <span>${loc.percentage}%</span></li>
          `).join('')}
        </ul>
      </div>
    </div>

    <div class="segment-analysis">
      <h4>👥 Audience Segments</h4>
      <div class="segments-grid">
        ${Object.values(segments).map(seg => `
          <div class="segment-card">
            <div class="segment-name">${seg.name}</div>
            <div class="segment-pct">${seg.percentage}%</div>
            <div class="segment-desc">${seg.description}</div>
            <div class="segment-strategy">${seg.strategy}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="insights-findings">
      <h4>🎯 Key Insights</h4>
      ${analysis.insights.map(insight => `
        <div class="insight-finding">
          <div class="insight-icon">${
            insight.type === 'demographics' ? '👥' :
            insight.type === 'interest' ? '💓' :
            insight.type === 'engagement' ? '📈' :
            insight.type === 'growth' ? '📊' : '⏰'
          }</div>
          <div>
            <div class="insight-title">${insight.title}</div>
            <div class="insight-desc">${insight.description}</div>
            ${insight.actionable ? `<button class="btn-ghost btn-xs">${insight.action || 'Learn more'}</button>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  </div>`;
}

// ── Tab: Trends ────────────────────────────────────────────
function renderTrendsTab(container) {
  const industryData = [
    { name: 'AI Content', category: 'Technology', growthRate: 0.45, volume: 250000, engagementRate: 0.12 },
    { name: 'Sustainability', category: 'ESG', growthRate: 0.32, volume: 180000, engagementRate: 0.095 },
    { name: 'Remote Work', category: 'Business', growthRate: -0.15, volume: 95000, engagementRate: 0.072 }
  ];

  const trends = detectTrends(industryData, ['Technology', 'Marketing']);
  const alerts = getTrendAlerts(['Technology', 'Marketing']);

  container.innerHTML = `
  <div class="ai-section">
    <div class="section-header"><h3>🔥 Trend Detection</h3></div>

    ${alerts.length > 0 ? `
    <div class="trend-alerts">
      <h4>⚠️ Trend Alerts</h4>
      ${alerts.map(alert => `
        <div class="alert-item alert-${alert.priority}">
          <div class="alert-icon">${alert.icon}</div>
          <div class="alert-content">
            <div class="alert-title">${alert.message}</div>
            <div class="alert-action">${alert.action} (${alert.timeLimit})</div>
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="trends-section">
      <h4>📈 Rising Trends</h4>
      <div class="trends-grid">
        ${trends.rising.map(trend => `
          <div class="trend-card rising">
            <div class="trend-name">${trend.name}</div>
            <div class="trend-growth">+${(trend.growthRate * 100).toFixed(0)}%</div>
            <div class="trend-volume">${(trend.volume / 1000).toFixed(0)}K mentions</div>
            <div class="trend-reach">Est. reach: ${(trend.estimatedReach / 1000000).toFixed(1)}M</div>
            <button class="btn-secondary btn-sm">📝 Create content</button>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="trends-section">
      <h4>🔥 Peak Trends (HOT NOW)</h4>
      <div class="trends-grid">
        ${trends.peak.map(trend => `
          <div class="trend-card peak">
            <div class="trend-emoji">${trend.emoji || '🔥'}</div>
            <div class="trend-name">${trend.name}</div>
            <div class="trend-volume">${(trend.volume / 1000).toFixed(0)}K mentions</div>
            <div class="trend-window">⏰ Next 24 hours</div>
            <button class="btn-primary btn-sm">⚡ Quick post</button>
          </div>
        `).join('')}
      </div>
    </div>
  </div>`;
}

// ── Tab: A/B Tests ────────────────────────────────────────
function renderABTestTab(container) {
  const recommendations = getABTestRecommendations();

  container.innerHTML = `
  <div class="ai-section">
    <div class="section-header">
      <h3>📊 A/B Test Optimizer</h3>
      <button id="btn-create-ab-test" class="btn-primary btn-sm">+ Create Test</button>
    </div>

    ${recommendations.length === 0 ? `
      <div class="empty-state"><p>No active A/B tests. Create one to start optimizing!</p></div>
    ` : `
      <div class="ab-tests-list">
        ${recommendations.map(rec => `
          <div class="ab-test-card priority-${rec.priority}">
            <div class="ab-test-header">
              <h4>${rec.title}</h4>
              <span class="ab-status">${rec.type}</span>
            </div>
            <p>${rec.message}</p>
            <div class="ab-lift">Expected lift: <strong>${rec.expectedLift}</strong></div>
            <button class="btn-secondary btn-sm">${rec.action}</button>
          </div>
        `).join('')}
      </div>
    `}
  </div>`;

  container.querySelector('#btn-create-ab-test')?.addEventListener('click', () => {
    openCreateABTestModal(container);
  });
}

// ── Tab: Predictions ───────────────────────────────────────
function renderPredictTab(container) {
  const mockPost = {
    id: 'post-demo',
    text: 'Check out our latest AI insights! 🤖 #AI #Marketing',
    platform: 'linkedin',
    type: 'post',
    mediaUrl: 'https://example.com/image.jpg',
    scheduledAt: new Date().toISOString()
  };

  const performance = predictPostPerformance(mockPost, []);
  const growth = predictFollowerGrowth(45000, null, 30);
  const timing = predictBestPostTime({ demographics: { ageGroups: { '25-34': 45 } } }, 'linkedin');

  container.innerHTML = `
  <div class="ai-section">
    <div class="section-header"><h3>🔮 Predictive Analytics</h3></div>

    <div class="prediction-card">
      <h4>📊 Post Performance Forecast</h4>
      <div class="prediction-metrics">
        <div class="pred-metric"><span>Predicted Impressions</span><strong>${performance.predictedImpressions?.toLocaleString() || '—'}</strong></div>
        <div class="pred-metric"><span>Predicted ER</span><strong>${((performance.predictedEngagementRate || 0) * 100).toFixed(2)}%</strong></div>
        <div class="pred-metric"><span>Predicted Likes</span><strong>${performance.predictedLikes?.toLocaleString() || '—'}</strong></div>
        <div class="pred-metric"><span>Confidence</span><strong>${((performance.confidence || 0) * 100).toFixed(0)}%</strong></div>
      </div>
    </div>

    <div class="prediction-card">
      <h4>📈 30-Day Follower Growth</h4>
      <div class="growth-prediction">
        <div class="growth-stat"><span>Current</span><strong>${(growth.currentFollowers || 0).toLocaleString()}</strong></div>
        <div class="growth-arrow">→</div>
        <div class="growth-stat"><span>Projected (30d)</span><strong>${(growth.projectedFollowers || 0).toLocaleString()}</strong></div>
      </div>
      <div class="growth-details">
        <div>Growth: +${(growth.projectedGrowth || 0).toLocaleString()}</div>
        <div>Rate: ${growth.growthRate || '—'}</div>
        <div>Confidence: ${((growth.confidence || 0) * 100).toFixed(0)}%</div>
      </div>
    </div>

    <div class="prediction-card">
      <h4>⏰ Best Times to Post</h4>
      <div class="best-times">
        ${(timing.recommendedTimes || []).map(t => `
          <div class="best-time-item">
            <div class="time">${t.time}</div>
            <div class="confidence-bar"><div class="bar-fill" style="width:${(t.confidence * 100).toFixed(0)}%"></div></div>
            <span>${(t.confidence * 100).toFixed(0)}%</span>
          </div>
        `).join('')}
      </div>
    </div>
  </div>`;
}

// ── Helper: Create A/B Test Modal ──────────────────────────
function openCreateABTestModal(container) {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
  <div class="modal-box">
    <div class="modal-header">
      <h3>Create A/B Test</h3>
      <button class="btn-ghost close-modal">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>Test Type</label>
        <select id="ab-test-type" class="select-input">
          <option value="text">Text</option>
          <option value="image">Image</option>
          <option value="cta">Call-to-Action</option>
          <option value="hashtag">Hashtag</option>
          <option value="timing">Timing</option>
        </select>
      </div>
      <div class="form-group">
        <label>Variant A</label>
        <input type="text" id="ab-variant-a" class="input-field" placeholder="Option A" />
      </div>
      <div class="form-group">
        <label>Variant B</label>
        <input type="text" id="ab-variant-b" class="input-field" placeholder="Option B" />
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary close-modal">Cancel</button>
      <button class="btn-primary" id="btn-create-test-save">✅ Create Test</button>
    </div>
  </div>`;

  document.body.appendChild(modal);

  modal.querySelector('#btn-create-test-save')?.addEventListener('click', () => {
    const testType = modal.querySelector('#ab-test-type').value;
    const varA = modal.querySelector('#ab-variant-a').value;
    const varB = modal.querySelector('#ab-variant-b').value;

    if (!varA || !varB) { showToast('Please fill both variants', 'error'); return; }

    createABTest({
      postId: 'post-' + Date.now(),
      testType,
      variableA: { value: varA },
      variableB: { value: varB }
    });

    showToast('✅ A/B test created!', 'success');
    modal.remove();
    renderAITab(container.closest('.ai-page')?.parentElement || container, 'ab-test');
  });

  modal.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => modal.remove());
  });
}

// ── Event Binder ───────────────────────────────────────────
function bindAIEvents(container) {
  container.querySelectorAll('.ai-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.ai-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderAITab(container, tab.dataset.tab);
    });
  });
}
