import {
  getQueue, getDrafts, getDraft, saveDraft, publishDraft, deleteDraft,
  updateQueueItem, removeFromQueue, reschedulePost, moveToFront, getQueueStats,
  addToQueue, bulkSchedule, getNextPostTime
} from './scheduler-store.js';

import {
  recommendBestTime, getSmartScheduleTime, getSuggestedInterval,
  optimizeSchedule
} from './scheduler-engine.js';

import {
  suggestRecyclableContent, getRecycleStats, setupAutoRecycle, scheduleRecycledContent
} from './scheduler-recycle.js';

import {
  parseCSV, bulkImportCSV, generateCSVTemplate, exportQueueToCSV
} from './scheduler-csv.js';

import {
  addRSSFeed, getRSSFeeds, autoPostFromRSS, removeRSSFeed
} from './scheduler-rss.js';

import {
  getCurrentStreakData, getStreakStats, getStreakRecommendation,
  predictStreakBreak, STREAK_ACHIEVEMENTS
} from './scheduler-streaks.js';

let schedulerTab = 'queue';

// Basic toast helper if Toast isn't global
function showToast(message, type = 'info') {
  if (window.Toast) {
    window.Toast.show(message, type);
  } else {
    console.log(`[${type}] ${message}`);
  }
}

function switchTab(tabId) {
  document.querySelectorAll('.sched-tab').forEach(t => t.classList.remove('active'));
  const t = document.querySelector(`.sched-tab[data-tab="${tabId}"]`);
  if (t) t.classList.add('active');
  const container = document.getElementById('scheduler-content')?.parentElement;
  if (container) {
    renderSchedulerTab(container, tabId);
  }
}
window.switchTab = switchTab; // for onclick inline handler

export function renderScheduler(container) {
  container.innerHTML = getSchedulerHTML();
  bindSchedulerEvents(container);
  renderSchedulerTab(container, schedulerTab);
}

function getSchedulerHTML() {
  const stats = getQueueStats();
  return `
  <div class="scheduler-page">
    <!-- Header -->
    <div class="scheduler-header">
      <div>
        <h2>📅 Scheduler</h2>
        <p class="page-subtitle">Lên lịch + quản lý queue + posting streaks</p>
      </div>
      <div class="scheduler-stats">
        <div class="stat-badge">📋 ${stats.totalScheduled} bài chờ đăng</div>
        <div class="stat-badge" style="color:var(--color-primary)">⏱️ Sắp tới: ${stats.nextPostIn ? stats.nextPostIn + ' min' : '—'}</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="scheduler-tabs">
      <button class="sched-tab active" data-tab="queue">📋 Queue</button>
      <button class="sched-tab" data-tab="drafts">✏️ Drafts</button>
      <button class="sched-tab" data-tab="bulk">📥 Bulk Upload</button>
      <button class="sched-tab" data-tab="recycle">♻️ Recycle</button>
      <button class="sched-tab" data-tab="rss">📡 RSS</button>
      <button class="sched-tab" data-tab="streaks">🔥 Streaks</button>
    </div>

    <!-- Tab Content -->
    <div id="scheduler-content" class="scheduler-content"></div>
  </div>`;
}

function renderSchedulerTab(container, tab) {
  const content = container.querySelector('#scheduler-content');
  schedulerTab = tab;

  switch (tab) {
    case 'queue':   renderQueueTab(content); break;
    case 'drafts':  renderDraftsTab(content); break;
    case 'bulk':    renderBulkTab(content); break;
    case 'recycle': renderRecycleTab(content); break;
    case 'rss':     renderRSSTab(content); break;
    case 'streaks': renderStreaksTab(content); break;
  }
}

// ── Tab: Queue ────────────────────────────────────────────────
function renderQueueTab(container) {
  const queue = getQueue();

  container.innerHTML = `
  <div class="scheduler-section">
    <div class="section-header">
      <h3>📋 Posting Queue</h3>
      <div class="section-controls">
        <select id="queue-filter-pf" class="select-input select-sm">
          <option value="">Tất cả platform</option>
          <option value="facebook">Facebook</option>
          <option value="instagram">Instagram</option>
          <option value="twitter">Twitter</option>
          <option value="linkedin">LinkedIn</option>
        </select>
        <button id="btn-queue-optimize" class="btn btn-secondary btn-sm">
          ⚡ Tối ưu hóa
        </button>
        <button id="btn-queue-export" class="btn btn-secondary btn-sm">
          📥 Xuất CSV
        </button>
      </div>
    </div>

    ${queue.length === 0 ? `
      <div class="empty-state" style="text-align: center; padding: var(--space-8);">
        <p>Queue trống. Hãy <a href="#" onclick="switchTab('drafts'); return false;" style="color:var(--color-primary)">lên lịch bài mới</a></p>
      </div>
    ` : `
      <div class="queue-timeline">
        ${queue.map((item, i) => renderQueueItem(item, i)).join('')}
      </div>
    `}
  </div>`;

  // Platform filter
  container.querySelector('#queue-filter-pf')?.addEventListener('change', e => {
    const filtered = e.target.value ? getQueue(e.target.value) : getQueue();
    renderQueueItems(container, filtered);
  });

  // Optimize
  container.querySelector('#btn-queue-optimize')?.addEventListener('click', () => {
    const optimized = optimizeSchedule(queue, {
      targetGap: 24,
      avoidWeekends: false,
      preferredHours: [8, 9, 10, 17]
    });
    showToast('✅ Queue đã được tối ưu hóa!', 'success');
    renderSchedulerTab(container.parentElement, 'queue');
  });

  // Export
  container.querySelector('#btn-queue-export')?.addEventListener('click', () => {
    const csv = exportQueueToCSV(queue);
    downloadCSV(csv, 'queue.csv');
  });

  if (window.lucide) lucide.createIcons();
}

function renderQueueItem(item, index) {
  const dt = new Date(item.scheduledAt);
  const now = new Date();
  const isNext = index === 0;
  const isPast = dt < now;

  const PLATFORM_ICONS = { facebook: '📘', instagram: '📸', twitter: '🐦', linkedin: '💼' };

  return `
  <div class="queue-item ${isNext ? 'queue-item-next' : ''} ${isPast ? 'queue-item-past' : ''}">
    <div class="queue-item-meta">
      <span class="queue-index">#${index + 1}</span>
      <span class="queue-platform">${PLATFORM_ICONS[item.platform] || '📱'} ${item.platform}</span>
      <span class="queue-time">
        ${dt.toLocaleString('vi-VN')}
      </span>
    </div>
    <div class="queue-item-content">${(item.text || '').slice(0, 100)}...</div>
    <div class="queue-item-actions">
      <button class="btn btn-ghost btn-sm queue-btn-move" data-id="${item.id}">
        Lên trước
      </button>
      <button class="btn btn-ghost btn-sm queue-btn-reschedule" data-id="${item.id}">
        Thay lịch
      </button>
      <button class="btn btn-ghost btn-sm queue-btn-remove" data-id="${item.id}">
        Xóa
      </button>
    </div>
  </div>`;
}

function renderQueueItems(container, queue) {
  const timelineDiv = container.querySelector('.queue-timeline');
  if (!timelineDiv) return;

  timelineDiv.innerHTML = queue.map((item, i) => renderQueueItem(item, i)).join('');

  // Bind events
  container.querySelectorAll('.queue-btn-move').forEach(btn => {
    btn.addEventListener('click', () => {
      moveToFront(btn.dataset.id);
      showToast('✅ Đã chuyển lên trước queue!', 'success');
      renderSchedulerTab(container.parentElement, 'queue');
    });
  });

  container.querySelectorAll('.queue-btn-reschedule').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const item = getQueue().find(q => q.id === id);
      if (item) openRescheduleModal(container, id, item);
    });
  });

  container.querySelectorAll('.queue-btn-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      removeFromQueue(btn.dataset.id);
      showToast('✅ Đã xóa khỏi queue!', 'success');
      renderSchedulerTab(container.parentElement, 'queue');
    });
  });
}

// ── Tab: Drafts ────────────────────────────────────────────
function renderDraftsTab(container) {
  const drafts = getDrafts();

  container.innerHTML = `
  <div class="scheduler-section">
    <div class="section-header">
      <h3>✏️ Drafts</h3>
      <button id="btn-new-draft" class="btn btn-primary btn-sm">
        + Bài mới
      </button>
    </div>

    ${drafts.length === 0 ? `
      <div class="empty-state" style="text-align: center; padding: var(--space-8);">
        <p>Không có draft nào. <button id="btn-new-draft-2" class="btn btn-ghost" style="color:var(--color-primary)">Tạo bài mới</button></p>
      </div>
    ` : `
      <div class="drafts-grid">
        ${drafts.map(draft => renderDraftCard(draft)).join('')}
      </div>
    `}
  </div>`;

  const openNewDraftEditor = () => openDraftEditor(container, null);
  container.querySelector('#btn-new-draft')?.addEventListener('click', openNewDraftEditor);
  container.querySelector('#btn-new-draft-2')?.addEventListener('click', openNewDraftEditor);

  // Bind events for cards
  container.querySelectorAll('.draft-edit').forEach(btn => {
    btn.addEventListener('click', () => openDraftEditor(container, btn.dataset.id));
  });
  
  container.querySelectorAll('.draft-publish').forEach(btn => {
    btn.addEventListener('click', () => {
      publishDraft(btn.dataset.id, new Date().toISOString());
      showToast('✅ Đã chuyển draft sang Queue!');
      renderSchedulerTab(container.parentElement, 'drafts');
    });
  });

  container.querySelectorAll('.draft-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteDraft(btn.dataset.id);
      showToast('✅ Đã xoá draft');
      renderSchedulerTab(container.parentElement, 'drafts');
    });
  });

  if (window.lucide) lucide.createIcons();
}

function renderDraftCard(draft) {
  return `
  <div class="draft-card">
    <div class="draft-meta">
      <span class="draft-platform">📱 ${draft.platform}</span>
      <span class="draft-date">${new Date(draft.updatedAt).toLocaleDateString('vi-VN')}</span>
    </div>
    <div class="draft-text">${(draft.text || '').slice(0, 150)}...</div>
    <div class="draft-actions">
      <button class="btn btn-secondary btn-sm draft-edit" data-id="${draft.id}">
        ✏️ Sửa
      </button>
      <button class="btn btn-primary btn-sm draft-publish" data-id="${draft.id}">
        📅 Lên lịch
      </button>
      <button class="btn btn-ghost btn-sm draft-delete" data-id="${draft.id}">
        🗑️
      </button>
    </div>
  </div>`;
}

// Draft Editor Modal (simplified)
function openDraftEditor(container, draftId) {
  const draft = draftId ? getDraft(draftId) : null;

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.style = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000";
  modal.innerHTML = `
  <div class="modal-box modal-lg" style="background:var(--color-surface);padding:var(--space-6);border-radius:var(--radius-lg);width:500px;max-width:90%">
    <div class="modal-header" style="display:flex;justify-content:space-between;margin-bottom:var(--space-4)">
      <h3 style="margin:0">${draftId ? 'Sửa Draft' : 'Bài mới'}</h3>
      <button class="btn btn-ghost close-modal" style="padding:0">✕</button>
    </div>
    <div class="modal-body" style="display:flex;flex-direction:column;gap:var(--space-4)">
      <div class="form-group fg">
        <label>Platform</label>
        <select id="draft-platform" class="select-input">
          <option value="facebook" ${draft?.platform === 'facebook' ? 'selected' : ''}>Facebook</option>
          <option value="instagram" ${draft?.platform === 'instagram' ? 'selected' : ''}>Instagram</option>
          <option value="twitter" ${draft?.platform === 'twitter' ? 'selected' : ''}>Twitter</option>
          <option value="linkedin" ${draft?.platform === 'linkedin' ? 'selected' : ''}>LinkedIn</option>
        </select>
      </div>
      <div class="form-group fg">
        <label>Nội dung</label>
        <textarea id="draft-text" class="field-input" rows="6">${draft?.text || ''}</textarea>
      </div>
      <div class="form-row-2" style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
        <div class="form-group fg">
          <label>Hashtags</label>
          <input type="text" id="draft-hashtags" class="field-input"
            value="${(draft?.hashtags || []).join(' ')}" />
        </div>
        <div class="form-group fg">
          <label>Media URL</label>
          <input type="url" id="draft-media" class="field-input"
            value="${draft?.mediaUrl || ''}" />
        </div>
      </div>
    </div>
    <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:var(--space-2);margin-top:var(--space-4)">
      <button class="btn btn-secondary close-modal">Hủy</button>
      <button class="btn btn-primary" id="btn-save-draft">💾 Lưu</button>
    </div>
  </div>`;

  document.body.appendChild(modal);

  modal.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => modal.remove());
  });

  modal.querySelector('#btn-save-draft').addEventListener('click', () => {
    const data = {
      platform: modal.querySelector('#draft-platform').value,
      text: modal.querySelector('#draft-text').value,
      hashtags: modal.querySelector('#draft-hashtags').value.split(/\s+/).filter(Boolean),
      mediaUrl: modal.querySelector('#draft-media').value
    };

    if (draftId) {
      updateDraft(draftId, data);
      showToast('✅ Draft đã cập nhật!', 'success');
    } else {
      saveDraft(data);
      showToast('✅ Draft đã lưu!', 'success');
    }

    modal.remove();
    renderDraftsTab(container);
  });
}

// ── Tab: Bulk Upload ───────────────────────────────────────────
function renderBulkTab(container) {
  container.innerHTML = `
  <div class="scheduler-section">
    <div class="section-header">
      <h3>📥 Bulk Upload — CSV Import</h3>
      <button id="btn-download-template" class="btn btn-secondary btn-sm">
        📋 Tải template
      </button>
    </div>

    <div class="bulk-upload-area">
      <div class="upload-zone" id="upload-zone">
        <p style="margin-bottom:var(--space-2)">Kéo file CSV vào đây hoặc</p>
        <input type="file" id="csv-file-input" accept=".csv" style="display:none" />
        <button class="btn btn-primary" onclick="document.getElementById('csv-file-input').click()">
          Chọn file
        </button>
      </div>

      <div id="csv-preview" style="display:none;margin-top:var(--space-4)">
        <h4 style="margin-bottom:var(--space-2)">Preview</h4>
        <div id="csv-preview-content"></div>
        <div class="bulk-import-options" style="margin-top:var(--space-3);display:flex;gap:var(--space-4)">
          <label style="display:flex;align-items:center;gap:4px;cursor:pointer">
            <input type="checkbox" id="csv-as-drafts" />
            <span>Lưu thành drafts thay vì queue</span>
          </label>
          <label style="display:flex;align-items:center;gap:4px;cursor:pointer">
            <input type="checkbox" id="csv-skip-errors" checked />
            <span>Bỏ qua lỗi, import bài hợp lệ</span>
          </label>
        </div>
        <div class="bulk-import-actions" style="margin-top:var(--space-3);display:flex;gap:var(--space-2)">
          <button class="btn btn-secondary" id="btn-cancel-csv">Hủy</button>
          <button class="btn btn-primary" id="btn-import-csv">✅ Import</button>
        </div>
      </div>
    </div>
  </div>`;

  // File input
  const fileInput = container.querySelector('#csv-file-input');
  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const csv = event.target.result;
      const result = parseCSV(csv);
      renderCSVPreview(container, result.posts, csv);
    };
    reader.readAsText(file);
  });

  // Template download
  container.querySelector('#btn-download-template').addEventListener('click', () => {
    const template = generateCSVTemplate();
    downloadCSV(template, 'social-scheduler-template.csv');
  });

  if (window.lucide) lucide.createIcons();
}

function renderCSVPreview(container, posts, csvText) {
  const preview = container.querySelector('#csv-preview');
  const content = container.querySelector('#csv-preview-content');

  content.innerHTML = `
  <div class="preview-table">
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr>
          <th style="text-align:left;padding:var(--space-2);border-bottom:1px solid var(--color-border)">Date & Time</th>
          <th style="text-align:left;padding:var(--space-2);border-bottom:1px solid var(--color-border)">Platform</th>
          <th style="text-align:left;padding:var(--space-2);border-bottom:1px solid var(--color-border)">Content</th>
          <th style="text-align:left;padding:var(--space-2);border-bottom:1px solid var(--color-border)">Status</th>
        </tr>
      </thead>
      <tbody>
        ${posts.slice(0, 5).map((p, i) => `
          <tr>
            <td style="padding:var(--space-2);border-bottom:1px solid var(--color-border)">${new Date(p.scheduledAt).toLocaleString('vi-VN')}</td>
            <td style="padding:var(--space-2);border-bottom:1px solid var(--color-border)">${p.platform}</td>
            <td style="padding:var(--space-2);border-bottom:1px solid var(--color-border)">${(p.text || '').slice(0, 50)}...</td>
            <td style="padding:var(--space-2);border-bottom:1px solid var(--color-border)">✅ Valid</td>
          </tr>
        `).join('')}
        ${posts.length > 5 ? `
          <tr>
            <td colspan="4" style="text-align:center;padding:var(--space-2)">... và ${posts.length - 5} bài nữa</td>
          </tr>
        ` : ''}
      </tbody>
    </table>
  </div>
  <div class="preview-summary" style="margin-top:var(--space-2);padding:var(--space-2);background:color-mix(in srgb,var(--color-primary) 10%,transparent)">
    <strong>${posts.length} bài</strong> sẵn sàng để import
  </div>`;

  preview.style.display = 'block';

  container.querySelector('#btn-cancel-csv').addEventListener('click', () => {
    preview.style.display = 'none';
    document.getElementById('csv-file-input').value = '';
  });

  container.querySelector('#btn-import-csv').addEventListener('click', () => {
    const asDrafts = container.querySelector('#csv-as-drafts').checked;
    const skipErrors = container.querySelector('#csv-skip-errors').checked;

    const result = bulkImportCSV(csvText, { asDrafts, skipOnError: skipErrors });

    if (result.success) {
      showToast(`✅ Import ${result.imported}/${result.total} bài thành công!`, 'success');
      preview.style.display = 'none';
      document.getElementById('csv-file-input').value = '';
      setTimeout(() => renderSchedulerTab(container.parentElement, asDrafts ? 'drafts' : 'queue'), 1000);
    } else {
      showToast(`❌ ${result.error}`, 'error');
    }
  });
}

// ── Tab: Recycle ───────────────────────────────────────────
function renderRecycleTab(container) {
  const recyclable = suggestRecyclableContent(10);
  const stats = getRecycleStats();

  container.innerHTML = `
  <div class="scheduler-section">
    <div class="section-header">
      <h3>♻️ Content Recycling</h3>
      <button id="btn-setup-auto-recycle" class="btn btn-primary btn-sm">
        ⚙️ Setup Auto-Recycle
      </button>
    </div>

    <!-- Stats -->
    <div class="recycle-stats">
      <div class="stat-card">
        <div class="stat-label">Bài có thể recycle</div>
        <div class="stat-value">${stats.totalRecyclable}</div>
        <div class="stat-sub">ER avg: ${stats.avgER}%</div>
      </div>
    </div>

    <!-- Recyclable posts -->
    ${recyclable.length === 0 ? `
      <div class="empty-state" style="text-align: center; padding: var(--space-8);">
        <p>Chưa có bài nào đủ điều kiện để recycle (ER >= 5%)</p>
      </div>
    ` : `
      <div class="recyclable-list">
        <h4 style="margin-bottom:var(--space-3)">Top Recyclable Posts</h4>
        ${recyclable.map(post => `
          <div class="recyclable-item">
            <div class="recycle-meta">
              <span class="recycle-score">${post.recycleScore}%</span>
              <span class="recycle-er">ER: ${(post.engagementRate || 0).toFixed(1)}%</span>
              <span class="recycle-date">${new Date(post.publishedAt).toLocaleDateString('vi-VN')}</span>
            </div>
            <div class="recycle-text">${(post.text || '').slice(0, 100)}...</div>
            <button class="btn btn-primary btn-sm" data-post-id="${post.id}">
              ♻️ Recycle
            </button>
          </div>
        `).join('')}
      </div>
    `}
  </div>`;

  container.querySelectorAll('button[data-post-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const post = recyclable.find(p => p.id === btn.dataset.postId);
      scheduleRecycledContent(post);
      showToast('✅ Đã queue bài recycle!', 'success');
      renderSchedulerTab(container.parentElement, 'recycle');
    });
  });

  container.querySelector('#btn-setup-auto-recycle')?.addEventListener('click', () => {
    const result = setupAutoRecycle({ enabled: true, minER: 5, interval: 7, maxPosts: 50 });
    showToast(`✅ ${result.message}`, 'success');
  });

  if (window.lucide) lucide.createIcons();
}

// ── Tab: RSS ────────────────────────────────────────────
function renderRSSTab(container) {
  const feeds = getRSSFeeds();

  container.innerHTML = `
  <div class="scheduler-section">
    <div class="section-header">
      <h3>📡 RSS Auto-Post</h3>
      <button id="btn-add-rss-feed" class="btn btn-primary btn-sm">
        + Thêm RSS Feed
      </button>
    </div>

    ${feeds.length === 0 ? `
      <div class="empty-state" style="text-align: center; padding: var(--space-8);">
        <p>Chưa có RSS feed nào. <button id="btn-add-rss-2" class="btn btn-ghost" style="color:var(--color-primary)">Thêm feed</button></p>
      </div>
    ` : `
      <div class="rss-feeds-list">
        ${feeds.map(feed => renderRSSFeedCard(feed)).join('')}
      </div>
    `}
  </div>`;

  container.querySelector('#btn-add-rss-feed')?.addEventListener('click', () => openAddRSSModal(container));
  container.querySelector('#btn-add-rss-2')?.addEventListener('click', () => openAddRSSModal(container));

  container.querySelectorAll('.rss-btn-fetch').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = '⏳ Đang fetch...';
      const result = await autoPostFromRSS(btn.dataset.feedId, { asDraft: true });
      if (result.success) {
        showToast(`✅ Fetch ${result.posted} bài từ "${result.feedTitle}"!`, 'success');
      } else {
        showToast(`❌ ${result.error}`, 'error');
      }
      btn.disabled = false;
      btn.textContent = '🔄 Fetch now';
    });
  });
  
  container.querySelectorAll('.rss-btn-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      removeRSSFeed(btn.dataset.feedId);
      showToast('✅ Đã xóa feed', 'success');
      renderSchedulerTab(container.parentElement, 'rss');
    });
  });

  if (window.lucide) lucide.createIcons();
}

function renderRSSFeedCard(feed) {
  return `
  <div class="rss-feed-card">
    <div class="rss-feed-meta">
      <div>
        <div class="rss-title">${feed.title}</div>
        <div class="rss-url" title="${feed.url}">${feed.url.slice(0, 50)}...</div>
      </div>
      <span class="rss-platform">${feed.platform}</span>
    </div>
    <div class="rss-actions">
      <button class="btn btn-secondary btn-sm rss-btn-fetch" data-feed-id="${feed.id}">
        🔄 Fetch now
      </button>
      <button class="btn btn-ghost btn-sm rss-btn-remove" data-feed-id="${feed.id}">
        🗑️
      </button>
    </div>
  </div>`;
}

// ── Tab: Streaks ────────────────────────────────────────────
function renderStreaksTab(container) {
  const streak = getCurrentStreakData();
  const stats = getStreakStats();
  const recommendation = getStreakRecommendation();

  container.innerHTML = `
  <div class="scheduler-section">
    <!-- Streak Display -->
    <div class="streak-hero">
      <div class="streak-badge">
        <div class="streak-number">${streak.currentStreak}</div>
        <div class="streak-label">ngày 🔥</div>
      </div>
      <div class="streak-best">
        <div class="best-label">Kỷ lục:</div>
        <div class="best-number">${streak.bestStreak}</div>
      </div>
      <div class="streak-consistency">
        <div class="consistency-label">Consistency Score</div>
        <div class="consistency-bar">
          <div class="consistency-fill" style="width:${streak.consistencyScore}%;
            background: ${streak.consistencyScore >= 80 ? 'var(--color-success)'
                      : streak.consistencyScore >= 60 ? 'var(--color-primary)'
                      : 'var(--color-warning)'}"></div>
        </div>
        <div class="consistency-val">${streak.consistencyScore}%</div>
      </div>
    </div>

    <!-- Achievements -->
    <div class="achievements-section">
      <h4 style="margin-bottom:var(--space-3)">🏆 Achievements</h4>
      <div class="achievements-grid">
        ${STREAK_ACHIEVEMENTS.map(a => {
          const unlocked = streak.unlockedAchievements.some(u => u.days === a.days);
          return `
          <div class="achievement-badge ${unlocked ? 'unlocked' : 'locked'}">
            <div class="achievement-emoji">${a.badge}</div>
            <div class="achievement-title">${a.title}</div>
            <div class="achievement-desc">${a.days} ngày</div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- Stats -->
    <div class="streak-stats">
      <h4 style="margin-bottom:var(--space-3)">📊 This Month</h4>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">Posts</div>
          <div class="stat-value">${stats.thisMonthCount}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Last 7 Days</div>
          <div class="stat-value">${stats.lastSevenDays}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Total</div>
          <div class="stat-value">${stats.totalPosts}</div>
        </div>
      </div>

      <!-- Posts by DOW -->
      <div class="posting-pattern">
        <h4 style="margin-bottom:var(--space-3)">Posts by Day of Week</h4>
        <div class="dow-bars">
          ${stats.postsByDOW.map(d => `
            <div class="dow-bar" style="display:flex;flex-direction:column;align-items:center;min-height:100px;justify-content:flex-end">
              <div class="dow-bar-wrap" style="height:80px;display:flex;align-items:flex-end;width:20px;background:var(--color-surface);border-radius:var(--radius-full);overflow:hidden">
                <div class="dow-bar-fill" style="width:100%;height:${Math.min(d.posts * 20, 100)}%;
                  background:var(--color-primary)"></div>
              </div>
              <div class="dow-day" style="font-size:10px;margin-top:4px">${d.day}</div>
              <div class="dow-count" style="font-size:10px;font-weight:700">${d.posts}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Recommendations -->
    <div class="streak-recommendations" style="margin-top:var(--space-4)">
      <h4 style="margin-bottom:var(--space-3)">💡 Gợi ý</h4>
      <div style="display:flex;flex-direction:column;gap:var(--space-2)">
      ${recommendation.recommendations.map(r => `
        <div class="rec-item" style="padding:var(--space-2);background:var(--color-surface);border-left:3px solid var(--color-primary);border-radius:var(--radius-md)">${r}</div>
      `).join('')}
      </div>
    </div>
  </div>`;

  if (window.lucide) lucide.createIcons();
}

// ── Helper Events ───────────────────────────────────────────
function bindSchedulerEvents(container) {
  container.querySelectorAll('.sched-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.sched-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      schedulerTab = tab.dataset.tab;
      renderSchedulerTab(container, schedulerTab);
    });
  });
}

function downloadCSV(csv, filename) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function openRescheduleModal(container, queueId, item) {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.style = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000";
  modal.innerHTML = `
  <div class="modal-box" style="background:var(--color-surface);padding:var(--space-6);border-radius:var(--radius-lg);width:400px;max-width:90%">
    <div class="modal-header" style="display:flex;justify-content:space-between;margin-bottom:var(--space-4)">
      <h3 style="margin:0">Thay lịch đăng</h3>
      <button class="btn btn-ghost close-modal" style="padding:0">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group fg">
        <label>Thời gian mới</label>
        <input type="datetime-local" id="reschedule-time" class="field-input"
          value="${new Date(item.scheduledAt).toISOString().slice(0,16)}" />
      </div>
    </div>
    <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:var(--space-2);margin-top:var(--space-4)">
      <button class="btn btn-secondary close-modal">Hủy</button>
      <button class="btn btn-primary" id="btn-reschedule-save">💾 Lưu</button>
    </div>
  </div>`;

  document.body.appendChild(modal);
  modal.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => modal.remove());
  });

  modal.querySelector('#btn-reschedule-save').addEventListener('click', () => {
    const newTime = new Date(modal.querySelector('#reschedule-time').value);
    reschedulePost(queueId, newTime);
    modal.remove();
    showToast('✅ Đã thay lịch!', 'success');
    renderSchedulerTab(container.parentElement, 'queue');
  });
}

function openAddRSSModal(container) {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.style = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000";
  modal.innerHTML = `
  <div class="modal-box" style="background:var(--color-surface);padding:var(--space-6);border-radius:var(--radius-lg);width:400px;max-width:90%">
    <div class="modal-header" style="display:flex;justify-content:space-between;margin-bottom:var(--space-4)">
      <h3 style="margin:0">Thêm RSS Feed</h3>
      <button class="btn btn-ghost close-modal" style="padding:0">✕</button>
    </div>
    <div class="modal-body" style="display:flex;flex-direction:column;gap:var(--space-3)">
      <div class="form-group fg">
        <label>Feed URL</label>
        <input type="url" id="rss-url" class="field-input"
          placeholder="https://example.com/feed.xml" />
      </div>
      <div class="form-group fg">
        <label>Tên Feed</label>
        <input type="text" id="rss-title" class="field-input"
          placeholder="My Blog" />
      </div>
      <div class="form-group fg">
        <label>Post tới</label>
        <select id="rss-platform" class="select-input">
          <option value="facebook">Facebook</option>
          <option value="instagram">Instagram</option>
        </select>
      </div>
    </div>
    <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:var(--space-2);margin-top:var(--space-4)">
      <button class="btn btn-secondary close-modal">Hủy</button>
      <button class="btn btn-primary" id="btn-add-rss">✅ Thêm</button>
    </div>
  </div>`;

  document.body.appendChild(modal);
  modal.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => modal.remove());
  });

  modal.querySelector('#btn-add-rss').addEventListener('click', () => {
    const feed = addRSSFeed({
      url: modal.querySelector('#rss-url').value,
      title: modal.querySelector('#rss-title').value,
      platform: modal.querySelector('#rss-platform').value
    });
    modal.remove();
    showToast('✅ RSS feed đã thêm!', 'success');
    renderSchedulerTab(container.parentElement, 'rss');
  });
}

// Scheduled imports (cho feed recycling chạy async)
export { scheduleRecycledContent };
