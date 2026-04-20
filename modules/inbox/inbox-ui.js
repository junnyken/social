// ============================================================
// Smart Inbox UI — 3-Column Split View + Thread + AI
// ============================================================

import { getMessages, markRead, markDone, getUnreadCount, onUpdate } from './inbox-store.js';
import { startInboxPolling } from './inbox-fetcher.js';
import { PLATFORMS } from '../platforms/platform-registry.js';
import { getPages } from '../facebook/fb-auth.js';
import { renderContactPanel } from './contact-panel.js';
import { renderPageSelector, getSelectedPageId } from '../../assets/components/page-selector.js';

const PLATFORM_COLORS = { facebook: '#1877F2', instagram: '#E1306C', twitter: '#1DA1F2', linkedin: '#0077B5' };

export function renderInbox(container) {
  container.innerHTML = getInboxHTML();
  if (window.refreshIcons) window.refreshIcons();

  let activeMessage = null;
  let filters = { platform: '', type: '', status: '', search: '', pageId: 'all' };

  startInboxPolling((newCount) => {
    if (window.Toast) window.Toast.show(`📬 ${newCount} tin nhắn mới`, 'info');
    refreshList();
    updateBadge();
  });

  onUpdate(() => { refreshList(); updateBadge(); });
  
  const pageContainer = container.querySelector('#inbox-page-selector-container');
  if (pageContainer) {
    renderPageSelector(pageContainer, (pageId) => {
      filters.pageId = pageId;
      refreshList();
    });
    filters.pageId = getSelectedPageId();
  }

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

  async function openMessage(msg) {
    activeMessage = msg;
    markRead(msg.id);
    refreshList(); // Update active state

    const detail = container.querySelector('#inbox-detail');
    const contactPnl = container.querySelector('#inbox-contact-panel');
    
    detail.innerHTML = `<div style="padding: 24px; text-align: center;">⏳ Đang tải chuỗi hội thoại...</div>`;
    
    // Fetch thread context
    let thread = [];
    let contactInfo = { displayName: msg.from, avatar: msg.authorPicture, tags: [] };
    
    try {
      if (msg.contactId) {
        const contactRes = await fetch(`/api/v1/contacts/${msg.contactId}`);
        const contactData = await contactRes.json();
        if (contactData.success) contactInfo = contactData.data;

        const threadRes = await fetch(`/api/v1/inbox/thread/${msg.contactId}`);
        const threadData = await threadRes.json();
        if (threadData.success) thread = threadData.data;
      }
    } catch (e) { console.warn('Faile to load thread/contact', e); }

    // Fallback if no thread loaded
    if (thread.length === 0) thread = [msg];

    // Render Contact Panel
    renderContactPanel(contactInfo, contactPnl);

    // Render Chat Thread
    const pColor = PLATFORM_COLORS[msg.platform] || '#999';
    const pName = PLATFORMS[msg.platform]?.name || msg.platform;

    const threadHTML = thread.map(m => {
      const isShop = m.fromId === getPages()?.[0]?.id || m.status === 'sent';
      const bubbleColor = isShop ? '#E3F2FD' : 'var(--color-surface-hover,#f3f2ef)';
      const align = isShop ? 'flex-end' : 'flex-start';
      const textColor = isShop ? '#0D47A1' : 'inherit';
      return `
        <div style="display:flex; flex-direction:column; align-items:${align}; margin-bottom: 12px; width: 100%;">
          <div style="font-size: 10px; color: var(--color-text-muted); margin-bottom: 4px;">${new Date(m.timestamp).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</div>
          <div style="background:${bubbleColor}; color:${textColor}; padding: 10px 14px; border-radius: 12px; max-width: 80%; line-height: 1.5; font-size: 14px;">
            ${m.text}
          </div>
        </div>
      `;
    }).join('');

    detail.innerHTML = `
      <div class="message-detail" style="display:flex; flex-direction:column; height: 100%;">
        <div class="message-detail-header" style="flex: 0 0 auto; padding: 16px; border-bottom: 1px solid var(--border); display:flex; justify-content: space-between; align-items: center;">
           <div style="display:flex; gap: 12px; align-items: center;">
             <div class="avatar-placeholder" style="width:40px;height:40px;border-radius:50%;background:${pColor};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px">${msg.from[0]}</div>
             <div>
               <div style="font-weight:600; font-size: 15px;">${msg.from}</div>
               <div style="font-size: 12px; color: ${pColor};">${pName} · ${msg.type === 'dm' ? 'Tin nhắn' : 'Bình luận'}</div>
             </div>
           </div>
           <div>
             <button id="btn-mark-done" class="btn btn-secondary btn-sm">✓ Hoàn tất</button>
           </div>
        </div>

        <div style="flex: 1 1 auto; overflow-y: auto; padding: 16px; background: var(--bg);">
          ${msg.parentPost ? `<div style="font-size:12px; color:var(--text-muted); margin-bottom: 16px; padding: 8px 12px; border-left:3px solid var(--border); background:var(--surface);">Trên bài: <em>${msg.parentPost.content}</em></div>` : ''}
          ${threadHTML}
        </div>

        <div style="flex: 0 0 auto; padding: 16px; border-top: 1px solid var(--border); background: var(--surface);">
          <div id="ai-suggestion-box" style="margin-bottom: 12px;">
            <div style="display:flex; align-items:center; gap: 8px; font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">
               <span style="background: linear-gradient(90deg, #A855F7, #EC4899); -webkit-background-clip: text; color: transparent; font-weight: 700;">✨ AI Đề xuất</span>
               <span id="ai-loading" style="display:none;">Đang phân tích...</span>
            </div>
            <div id="ai-replies-container" style="display:flex; flex-wrap: wrap; gap: 8px;">
              <!-- AI replies will go here -->
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap: 8px;">
            <textarea id="reply-input" class="field-input" rows="3" placeholder="Viết phản hồi..." style="resize:vertical; width: 100%;"></textarea>
            <div style="display:flex; justify-content: flex-end; gap: 8px;">
              <button id="btn-send-reply" class="btn btn-primary btn-sm">Gửi</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Fetch AI Suggestions
    const aiLoading = detail.querySelector('#ai-loading');
    const aiContainer = detail.querySelector('#ai-replies-container');
    const replyInput = detail.querySelector('#reply-input');

    aiLoading.style.display = 'inline-block';
    try {
      const gRes = await fetch('/api/v1/ai/suggest-reply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg.text, contactId: msg.contactId })
      });
      const gData = await gRes.json();
      aiLoading.style.display = 'none';

      if (gData.success && gData.data.replies) {
        aiContainer.innerHTML = gData.data.replies.map(r => 
          `<button class="quick-reply-chip" style="background:var(--bg); border: 1px solid var(--border); border-radius: 12px; padding: 6px 12px; font-size: 12px; cursor:pointer;" data-text="${r.replace(/"/g, '&quot;')}">${r}</button>`
        ).join('');

        aiContainer.querySelectorAll('.quick-reply-chip').forEach(chip => {
          chip.addEventListener('click', () => { replyInput.value = chip.dataset.text; replyInput.focus(); });
        });
      }
    } catch(e) {
      aiLoading.style.display = 'none';
      aiContainer.innerHTML = '<span style="color:var(--text-muted); font-size:12px;">Không thể tải AI.</span>';
    }

    detail.querySelector('#btn-mark-done')?.addEventListener('click', () => {
      markDone(msg.id);
      if (window.Toast) window.Toast.show('Đã đánh dấu hoàn thành', 'success');
      refreshList();
      detail.innerHTML = '<div class="inbox-empty-detail"><p>Đã hoàn thành</p></div>';
      contactPnl.innerHTML = '';
    });

    detail.querySelector('#btn-send-reply')?.addEventListener('click', async () => {
      const text = replyInput.value.trim();
      if (!text) return;
      if (window.Toast) window.Toast.show('Đang gửi...', 'info');

      if (msg.platform === 'facebook' && msg.id.startsWith('fb_c_')) {
        try {
          const pages = typeof getPages === 'function' ? getPages() : [];
          if (pages.length > 0) {
            const pageId = pages[0].id;
            const commentId = msg.id.replace('fb_c_', '');
            const res = await fetch(`/api/v1/fb/pages/${pageId}/comments/${commentId}/reply`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: text })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Error sending reply');
          }
        } catch (e) {
          if (window.Toast) window.Toast.show('❌ Lỗi: ' + e.message, 'error');
          return;
        }
      } else {
        await new Promise(r => setTimeout(r, 600)); // mock delay for others
      }

      if (window.Toast) window.Toast.show('Đã gửi phản hồi!', 'success');
      msg.status = 'replied';
      replyInput.value = '';
      openMessage(msg); // reload thread
    });
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
    <div style="display:flex;flex-direction:column;gap:var(--space-4); height: 100%;">
      <div style="display:flex;align-items:center;gap:var(--space-3)">
        <h2 style="margin:0">Smart Inbox</h2>
        <span class="unread-badge" id="inbox-unread-badge" style="background:var(--color-error);color:#fff;font-size:10px;padding:2px 8px;border-radius:var(--radius-full);font-weight:700">0</span>
      </div>

      <div class="inbox-filters">
        <input type="search" id="inbox-search" class="inbox-search" placeholder="🔍 Tìm kiếm..."/>
        <div id="inbox-page-selector-container"></div>
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

      <div class="inbox-split" style="display: grid; grid-template-columns: 300px 1fr 300px; gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: var(--radius-lg); height: calc(100vh - 200px); overflow: hidden;">
        <div class="inbox-list" id="inbox-message-list" style="background: var(--surface); height: 100%; overflow-y: auto;"></div>
        <div class="inbox-detail" id="inbox-detail" style="background: var(--bg); height: 100%;">
          <div class="inbox-empty-detail">
            <!-- <i data-lucide="message-square" width="40" height="40"></i> -->
            <p>Chọn tin nhắn để xem chi tiết</p>
          </div>
        </div>
        <div id="inbox-contact-panel" style="background: var(--surface); height: 100%; overflow-y: auto;">
          <div style="padding: 24px; text-align: center; color: var(--text-muted);">CRM Panel Trống</div>
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
