// ============================================================
// Smart Inbox UI — Split view with filters + quick replies
// ============================================================

import { getMessages, markRead, markDone, getUnreadCount, onUpdate } from './inbox-store.js';
import { startInboxPolling } from './inbox-fetcher.js';
import { PLATFORMS } from '../platforms/platform-registry.js';

const PLATFORM_COLORS = { facebook: '#1877F2', instagram: '#E1306C', twitter: '#1DA1F2', linkedin: '#0077B5' };

export function renderInbox(container) {
  container.innerHTML = getInboxHTML();
  if (window.refreshIcons) window.refreshIcons();

  let activeMessage = null;
  let filters = { platform: '', type: '', status: '', search: '' };

  startInboxPolling((newCount) => {
    if (window.Toast) window.Toast.show(`📬 ${newCount} tin nhắn mới`, 'info');
    refreshList();
    updateBadge();
  });

  onUpdate(() => { refreshList(); updateBadge(); });

  function refreshList() {
    const msgs = getMessages(filters);
    const listEl = container.querySelector('#inbox-message-list');
    if (!listEl) return;

    if (!msgs.length) {
      listEl.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:200px;color:var(--color-text-muted);gap:var(--space-2)"><i data-lucide="inbox" width="36" height="36"></i><p>Không có tin nhắn</p></div>`;
      if (window.refreshIcons) window.refreshIcons();
      return;
    }

    listEl.innerHTML = msgs.map(msg => `
      <div class="inbox-item ${msg.read ? '' : 'unread'} ${activeMessage?.id === msg.id ? 'active' : ''}" data-id="${msg.id}">
        <div class="inbox-item-platform">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="${PLATFORM_COLORS[msg.platform] || '#999'}"><circle cx="12" cy="12" r="10"/></svg>
        </div>
        <div class="inbox-item-body">
          <div class="inbox-item-from">${msg.from}</div>
          <div class="inbox-item-text">${msg.text.slice(0, 55)}${msg.text.length > 55 ? '…' : ''}</div>
        </div>
        <div class="inbox-item-meta">
          <span class="inbox-item-time">${formatRelativeTime(msg.timestamp)}</span>
          ${!msg.read ? '<span class="unread-dot"></span>' : ''}
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.inbox-item').forEach(el => {
      el.addEventListener('click', () => {
        const msg = msgs.find(m => m.id === el.dataset.id);
        if (msg) openMessage(msg);
      });
    });
  }

  function openMessage(msg) {
    activeMessage = msg;
    markRead(msg.id);

    const detail = container.querySelector('#inbox-detail');
    const pColor = PLATFORM_COLORS[msg.platform] || '#999';
    const pName = PLATFORMS[msg.platform]?.name || msg.platform;

    detail.innerHTML = `
      <div class="message-detail" style="padding:var(--space-5)">
        <div class="message-detail-header" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-4)">
          <div class="message-sender" style="display:flex;gap:var(--space-3);align-items:center">
            <div class="avatar-placeholder" style="width:42px;height:42px;border-radius:50%;background:${pColor};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1rem">${msg.from[0]}</div>
            <div>
              <div style="font-weight:600">${msg.from}</div>
              <div style="font-size:var(--text-xs);color:${pColor};display:flex;align-items:center;gap:4px">${pName} · ${msg.type === 'dm' ? 'Tin nhắn' : 'Bình luận'}</div>
            </div>
          </div>
          <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${new Date(msg.timestamp).toLocaleString('vi-VN')}</div>
        </div>

        <div style="background:var(--color-surface-hover,#f3f2ef);padding:var(--space-4);border-radius:var(--radius-lg);margin-bottom:var(--space-4);line-height:1.7;font-size:var(--text-sm)">${msg.text}</div>

        ${msg.parentPost ? `<div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:var(--space-3);padding:var(--space-2) var(--space-3);border-left:3px solid var(--color-border);background:var(--color-surface)">Trên bài: <em>${msg.parentPost.content}</em></div>` : ''}

        <div style="display:flex;flex-direction:column;gap:var(--space-3)">
          <textarea id="reply-input" class="field-input" rows="3" placeholder="Viết phản hồi..." style="resize:vertical"></textarea>
          <div class="quick-replies" style="display:flex;flex-wrap:wrap;gap:var(--space-1);align-items:center">
            <span style="font-size:var(--text-xs);color:var(--color-text-muted);margin-right:4px">Nhanh:</span>
            ${['Cảm ơn bạn!', 'Shop sẽ liên hệ lại ngay!', 'Sản phẩm còn hàng ạ 😊', 'Vui lòng để lại SĐT nhé!']
              .map(t => `<button class="quick-reply-chip" data-text="${t}">${t}</button>`).join('')}
          </div>
          <div style="display:flex;gap:var(--space-2)">
            <button id="btn-send-reply" class="btn btn-primary btn-sm">Gửi</button>
            <button id="btn-mark-done" class="btn btn-secondary btn-sm">✓ Xong</button>
            ${msg.postUrl !== '#' ? `<a href="${msg.postUrl}" target="_blank" class="btn btn-ghost btn-sm">Xem gốc</a>` : ''}
          </div>
        </div>
      </div>
    `;

    detail.querySelectorAll('.quick-reply-chip').forEach(chip => {
      chip.addEventListener('click', () => { detail.querySelector('#reply-input').value = chip.dataset.text; });
    });

    detail.querySelector('#btn-send-reply')?.addEventListener('click', async () => {
      const text = detail.querySelector('#reply-input').value.trim();
      if (!text) return;
      if (window.Toast) window.Toast.show('Đang gửi...', 'info');
      await new Promise(r => setTimeout(r, 600));
      if (window.Toast) window.Toast.show('Đã gửi phản hồi!', 'success');
      msg.status = 'replied';
      detail.querySelector('#reply-input').value = '';
    });

    detail.querySelector('#btn-mark-done')?.addEventListener('click', () => {
      markDone(msg.id);
      if (window.Toast) window.Toast.show('Đã đánh dấu hoàn thành', 'success');
      refreshList();
    });

    refreshList();
  }

  // Filters
  container.querySelector('#inbox-search')?.addEventListener('input', e => { filters.search = e.target.value; refreshList(); });
  container.querySelectorAll('[data-filter-platform]').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('[data-filter-platform]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filters.platform = btn.dataset.filterPlatform;
      refreshList();
    });
  });
  container.querySelectorAll('[data-filter-status]').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('[data-filter-status]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filters.status = btn.dataset.filterStatus;
      refreshList();
    });
  });

  refreshList();
}

function getInboxHTML() {
  return `
    <div style="display:flex;flex-direction:column;gap:var(--space-4)">
      <div style="display:flex;align-items:center;gap:var(--space-3)">
        <h2 style="margin:0">Smart Inbox</h2>
        <span class="unread-badge" id="inbox-unread-badge" style="background:var(--color-error);color:#fff;font-size:10px;padding:2px 8px;border-radius:var(--radius-full);font-weight:700">0</span>
      </div>

      <div class="inbox-filters">
        <input type="search" id="inbox-search" class="inbox-search" placeholder="🔍 Tìm kiếm..."/>
        <div class="filter-chips">
          <button class="filter-chip active" data-filter-platform="">Tất cả</button>
          <button class="filter-chip" data-filter-platform="facebook" style="--chip-color:#1877F2">Facebook</button>
          <button class="filter-chip" data-filter-platform="instagram" style="--chip-color:#E1306C">Instagram</button>
          <button class="filter-chip" data-filter-platform="twitter" style="--chip-color:#1DA1F2">X</button>
          <button class="filter-chip" data-filter-platform="linkedin" style="--chip-color:#0077B5">LinkedIn</button>
        </div>
        <div class="filter-chips">
          <button class="filter-chip active" data-filter-status="">Tất cả</button>
          <button class="filter-chip" data-filter-status="unread">Chưa đọc</button>
          <button class="filter-chip" data-filter-status="done">Đã xong</button>
        </div>
      </div>

      <div class="inbox-split">
        <div class="inbox-list" id="inbox-message-list"></div>
        <div class="inbox-detail" id="inbox-detail">
          <div class="inbox-empty-detail">
            <i data-lucide="message-square" width="40" height="40"></i>
            <p>Chọn tin nhắn để xem chi tiết</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function updateBadge() {
  const count = getUnreadCount();
  const badge = document.querySelector('#inbox-unread-badge');
  if (badge) badge.textContent = count || '0';
  const navBadge = document.querySelector('[data-nav-inbox-badge]');
  if (navBadge) { navBadge.textContent = count || ''; navBadge.style.display = count ? 'inline-flex' : 'none'; }
}

function formatRelativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins}p`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return Math.floor(hours / 24) + 'ngày';
}
