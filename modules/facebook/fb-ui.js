// ============================================================
// Facebook Page Publisher — UI Components
// ============================================================

import { getLoginURL, handleCallback, getPages, isAuthenticated, logout } from './fb-auth.js';
import { addToQueue, getQueue, removeFromQueue, pauseQueue, resumeQueue, getStatus, startScheduler, stopScheduler } from './fb-scheduler.js';
import { previewSpins } from './fb-spinner.js';

// ── Bootstrap: Gọi 1 lần khi social tool load ────────────────

export function initFacebookModule(containerSelector) {
  const container = typeof containerSelector === 'string'
    ? document.querySelector(containerSelector)
    : containerSelector;
  if (!container) return;

  // Check URL hash for OAuth callback token
  checkForOAuthCallback();

  if (isAuthenticated()) {
    renderDashboard(container);
  } else {
    renderConnectPrompt(container);
  }

  // Start scheduler, callback cập nhật UI
  startScheduler(({ event, task }) => {
    refreshQueueUI();
    if (event === 'post_done')   showToast(`✅ Đã đăng lên Page thành công`, 'success');
    if (event === 'post_failed') showToast(`❌ Đăng thất bại: ${task?.error}`, 'error');
    if (event === 'daily_cap')   showToast(`⚠️ Đã đạt giới hạn đăng hôm nay`, 'warning');
  });
}

// ── OAuth Callback Check ──────────────────────────────────────

function checkForOAuthCallback() {
  // Implicit flow trả token trong URL hash: #access_token=xxx&...
  const hash = window.location.hash;
  if (hash.includes('access_token=')) {
    const params = new URLSearchParams(hash.substring(1));
    const token = params.get('access_token');
    if (token) {
      handleCallback(token).then(() => {
        // Xóa token khỏi URL
        history.replaceState(null, '', window.location.pathname);
      }).catch(err => {
        showToast('Lỗi xác thực: ' + err.message, 'error');
      });
    }
  }
}

// ── Connect Prompt ────────────────────────────────────────────

function renderConnectPrompt(container) {
  container.innerHTML = `
    <div class="fb-module-connect" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:400px;gap:var(--space-4,16px);text-align:center">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
      <h3 style="font-size:1.25rem;font-weight:700;margin:0">Kết nối Facebook Page</h3>
      <p style="color:var(--color-text-muted,#888);max-width:360px;margin:0">Cho phép đăng bài tự động lên Page của bạn. Kết nối an toàn qua Facebook OAuth.</p>
      <button class="btn btn-primary btn-md" id="fb-connect-btn" style="min-width:220px">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle;margin-right:8px"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        Kết nối với Facebook
      </button>
    </div>
  `;

  document.querySelector('#fb-connect-btn').addEventListener('click', () => {
    window.location.href = getLoginURL();
  });
}

// ── Main Dashboard ────────────────────────────────────────────

function renderDashboard(container) {
  const pages = getPages();
  const status = getStatus();

  container.innerHTML = `
    <div class="fb-module" style="display:flex;flex-direction:column;gap:var(--space-4,16px)">

      <!-- Header -->
      <div class="fb-module-header" style="display:flex;align-items:center;gap:var(--space-3,12px);flex-wrap:wrap">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        <h3 style="margin:0;font-size:1.1rem;font-weight:700;flex:1">Facebook Page Publisher</h3>
        <div class="fb-status" style="display:flex;align-items:center;gap:6px;font-size:0.85rem">
          <span style="width:8px;height:8px;border-radius:50%;display:inline-block;background:${status.isPaused ? 'var(--color-warning,#f59e0b)' : 'var(--color-success,#22c55e)'}"></span>
          ${status.isPaused ? 'Đang tạm dừng' : 'Đang hoạt động'}
        </div>
        <button id="fb-pause-btn" class="btn ${status.isPaused ? 'btn-primary' : 'btn-ghost'} btn-sm">
          ${status.isPaused ? '▶ Tiếp tục' : '⏸ Tạm dừng'}
        </button>
        <button id="fb-logout-btn" class="btn btn-ghost btn-sm" style="color:var(--color-error,#ef4444)" title="Ngắt kết nối">
          ✕ Ngắt
        </button>
      </div>

      <!-- Compose Box -->
      <div class="fb-compose card" style="padding:var(--space-4,16px);display:flex;flex-direction:column;gap:var(--space-3,12px)">
        <select id="fb-page-select" class="field-select">
          <option value="">-- Chọn Page --</option>
          ${pages.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
        </select>

        <textarea id="fb-content" class="field-input" rows="4"
          placeholder="Nội dung bài... Dùng {lựa chọn 1|lựa chọn 2} để spin content"
          style="resize:vertical;font:inherit"></textarea>

        <div style="display:flex;align-items:center;justify-content:space-between">
          <span id="fb-charcount" style="font-size:0.75rem;color:var(--color-text-muted,#888)">0 / 2200</span>
          <button id="fb-preview-btn" class="btn btn-ghost btn-sm">👁 Preview 3 biến thể</button>
        </div>

        <!-- Spinner Preview -->
        <div id="fb-spinner-preview" style="display:none;flex-direction:column;gap:var(--space-2,8px)"></div>

        <!-- Schedule Time -->
        <div style="display:flex;align-items:center;gap:var(--space-3,12px);flex-wrap:wrap">
          <label style="font-size:0.85rem;font-weight:500;white-space:nowrap">Đăng lúc:</label>
          <input type="datetime-local" id="fb-schedule-time" class="field-input"
            value="${getDefaultScheduleTime()}" style="flex:1;min-width:200px" />
        </div>

        <!-- Actions -->
        <div style="display:flex;gap:var(--space-2,8px);justify-content:flex-end">
          <button id="fb-post-now-btn" class="btn btn-primary btn-md">⚡ Đăng ngay</button>
          <button id="fb-schedule-btn" class="btn btn-secondary btn-md">📅 Lên lịch</button>
        </div>
      </div>

      <!-- Queue -->
      <div class="fb-queue card" style="padding:var(--space-4,16px)">
        <div style="display:flex;align-items:center;gap:var(--space-2,8px);margin-bottom:var(--space-3,12px)">
          <h4 style="margin:0;font-weight:600">Hàng đợi</h4>
          <span class="badge badge-info" id="fb-pending-count">${status.pendingCount}</span>
        </div>
        <div id="fb-queue-list" style="display:flex;flex-direction:column;gap:var(--space-2,8px);max-height:400px;overflow-y:auto"></div>
      </div>

    </div>
  `;

  bindEvents(container);
  refreshQueueUI();
}

// ── Event Bindings ────────────────────────────────────────────

function bindEvents(container) {

  // Char count
  document.querySelector('#fb-content')?.addEventListener('input', (e) => {
    const len = e.target.value.length;
    const el = document.querySelector('#fb-charcount');
    if (el) {
      el.textContent = `${len} / 2200`;
      el.style.color = len > 2200 ? 'var(--color-error,#ef4444)' : 'var(--color-text-muted,#888)';
    }
  });

  // Pause / Resume
  document.querySelector('#fb-pause-btn')?.addEventListener('click', () => {
    const st = getStatus();
    if (st.isPaused) {
      resumeQueue();
    } else {
      pauseQueue();
    }
    // Re-render
    renderDashboard(container);
  });

  // Logout
  document.querySelector('#fb-logout-btn')?.addEventListener('click', () => {
    logout();
    stopScheduler();
    renderConnectPrompt(container);
    showToast('Đã ngắt kết nối Facebook', 'info');
  });

  // Preview spinner
  document.querySelector('#fb-preview-btn')?.addEventListener('click', () => {
    const content = document.querySelector('#fb-content').value;
    if (!content.trim()) { showToast('Nhập nội dung trước', 'warning'); return; }
    const previews = previewSpins(content, 3);
    const previewEl = document.querySelector('#fb-spinner-preview');
    previewEl.style.display = 'flex';
    previewEl.innerHTML = previews.map((p, i) =>
      `<div style="background:var(--color-surface,#f5f5f5);padding:var(--space-3,12px);border-radius:var(--radius-sm,6px);border-left:3px solid var(--color-accent,#38bdf8);font-size:0.85rem;white-space:pre-wrap">
        <div style="font-weight:600;font-size:0.7rem;color:var(--color-text-muted,#888);text-transform:uppercase;margin-bottom:4px">Biến thể ${i + 1}</div>
        ${p}
      </div>`
    ).join('');
  });

  // Post now
  document.querySelector('#fb-post-now-btn')?.addEventListener('click', () => {
    const pageId  = document.querySelector('#fb-page-select').value;
    const content = document.querySelector('#fb-content').value;
    if (!pageId || !content.trim()) {
      showToast('Vui lòng chọn Page và nhập nội dung', 'error');
      return;
    }

    addToQueue(pageId, content, [], new Date());
    showToast('Đã thêm vào hàng đợi — sẽ đăng ngay!', 'success');
    document.querySelector('#fb-content').value = '';
    document.querySelector('#fb-charcount').textContent = '0 / 2200';
    document.querySelector('#fb-spinner-preview').style.display = 'none';
    refreshQueueUI();
  });

  // Schedule post
  document.querySelector('#fb-schedule-btn')?.addEventListener('click', () => {
    const pageId      = document.querySelector('#fb-page-select').value;
    const content     = document.querySelector('#fb-content').value;
    const scheduledAt = document.querySelector('#fb-schedule-time').value;
    if (!pageId || !content.trim() || !scheduledAt) {
      showToast('Điền đầy đủ thông tin', 'error');
      return;
    }

    addToQueue(pageId, content, [], new Date(scheduledAt));
    showToast(`Đã lên lịch đăng vào ${new Date(scheduledAt).toLocaleString('vi-VN')}`, 'success');
    document.querySelector('#fb-content').value = '';
    document.querySelector('#fb-charcount').textContent = '0 / 2200';
    document.querySelector('#fb-spinner-preview').style.display = 'none';
    refreshQueueUI();
  });
}

// ── Queue UI Refresh ──────────────────────────────────────────

function refreshQueueUI() {
  const queueList = document.querySelector('#fb-queue-list');
  const countEl   = document.querySelector('#fb-pending-count');
  if (!queueList) return;

  const items = getQueue().slice(-20).reverse();
  const pendingCount = items.filter(t => t.status === 'pending').length;
  if (countEl) countEl.textContent = pendingCount;

  if (items.length === 0) {
    queueList.innerHTML = `<p style="text-align:center;color:var(--color-text-muted,#888);font-size:0.85rem;padding:var(--space-4,16px)">Chưa có bài nào trong hàng đợi</p>`;
    return;
  }

  queueList.innerHTML = items.map(item => `
    <div class="queue-item" style="display:flex;align-items:center;gap:var(--space-3,12px);padding:var(--space-3,12px);background:var(--color-surface,#f5f5f5);border-radius:var(--radius-md,8px);border:1px solid var(--color-border,#e5e5e5);${item.status === 'done' ? 'opacity:0.5' : ''}">
      <div style="flex:1;min-width:0">
        <div style="font-size:0.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.content.slice(0, 80)}${item.content.length > 80 ? '...' : ''}</div>
        <div style="display:flex;gap:var(--space-2,8px);align-items:center;margin-top:4px">
          <span style="font-size:0.7rem;color:var(--color-text-muted,#888)">${new Date(item.scheduledAt).toLocaleString('vi-VN')}</span>
          <span style="font-size:0.7rem;font-weight:600;${statusColor(item.status)}">${statusLabel(item.status)}</span>
        </div>
      </div>
      ${item.status === 'pending'
        ? `<button class="btn btn-ghost btn-sm fb-remove-task" data-id="${item.id}" style="color:var(--color-error,#ef4444);min-width:32px">✕</button>`
        : ''}
    </div>
  `).join('');

  // Bind remove buttons
  queueList.querySelectorAll('.fb-remove-task').forEach(btn => {
    btn.addEventListener('click', () => {
      removeFromQueue(btn.dataset.id);
      refreshQueueUI();
      showToast('Đã xóa khỏi hàng đợi', 'info');
    });
  });
}

// ── Helpers ───────────────────────────────────────────────────

function getDefaultScheduleTime() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

function statusLabel(s) {
  return { pending: '⏳ Chờ', processing: '🔄 Đang đăng', done: '✅ Xong', failed: '❌ Lỗi' }[s] || s;
}

function statusColor(s) {
  return {
    pending:    'color:var(--color-text-muted,#888)',
    processing: 'color:var(--color-accent,#38bdf8)',
    done:       'color:var(--color-success,#22c55e)',
    failed:     'color:var(--color-error,#ef4444)'
  }[s] || '';
}

function showToast(msg, type = 'info') {
  // Tích hợp với toast system mới
  if (window.Toast && window.Toast.show) {
    window.Toast.show(msg, type);
    return;
  }
  // Fallback
  const toast = document.createElement('div');
  toast.className = `fb-toast fb-toast-${type}`;
  toast.textContent = msg;
  Object.assign(toast.style, {
    position: 'fixed', bottom: '20px', right: '20px',
    padding: '12px 20px', borderRadius: '8px', color: 'white',
    zIndex: '9999', fontSize: '0.85rem', fontWeight: '500',
    background: { success:'#22c55e', error:'#ef4444', warning:'#f59e0b', info:'#1e3a5f' }[type] || '#1e3a5f',
    animation: 'fadeIn 0.3s ease'
  });
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; }, 3500);
  setTimeout(() => toast.remove(), 4000);
}
