// ============================================================
// Content Calendar UI — Month/Week view + Drag & Drop
// ============================================================

import { getCalendarPosts, removeCalendarPost, updateCalendarPost, seedDemoData, onCalendarUpdate } from './calendar-store.js';
import { getMonthGrid, getWeekDays, getHoursRange, formatMonthTitle, formatWeekTitle } from './calendar-engine.js';

const PCOLORS = { facebook: '#1877F2', instagram: '#E1306C', twitter: '#1DA1F2', linkedin: '#0077B5' };
const STATUS_CLASSES = { pending: 'spp-pending', done: 'spp-done', failed: 'spp-failed' };

export function renderCalendar(container) {
  seedDemoData();

  let viewDate = new Date();
  let viewMode = 'month';
  let draggedId = null;

  container.innerHTML = getShellHTML();
  renderGrid();
  onCalendarUpdate(() => renderGrid());

  function renderGrid() {
    const gridEl = container.querySelector('#calendar-grid');
    const titleEl = container.querySelector('#cal-title');
    if (!gridEl || !titleEl) return;

    if (viewMode === 'month') renderMonth(gridEl, titleEl);
    else renderWeek(gridEl, titleEl);
  }

  function renderMonth(gridEl, titleEl) {
    titleEl.textContent = formatMonthTitle(viewDate);
    const cells = getMonthGrid(viewDate.getFullYear(), viewDate.getMonth());
    const posts = getCalendarPosts();
    const dayNames = ['CN','T2','T3','T4','T5','T6','T7'];

    let html = '<div class="cal-grid-month">';
    html += dayNames.map(d => `<div class="cal-day-header">${d}</div>`).join('');

    cells.forEach(cell => {
      if (cell.type === 'empty') {
        html += '<div class="cal-cell cal-cell-empty"></div>';
        return;
      }

      const dayPosts = posts.filter(p => {
        const pd = new Date(p.scheduledAt);
        return pd.toISOString().split('T')[0] === cell.date;
      });

      html += `
        <div class="cal-cell ${cell.isToday ? 'today' : ''} ${cell.isPast ? 'past' : ''}" data-date="${cell.date}">
          <div class="cal-date-num">${cell.day}</div>
          <div class="cal-posts-preview">
            ${dayPosts.slice(0, 3).map(p => `
              <div class="cal-post-chip" style="background:${PCOLORS[p.platforms[0]] || '#888'}18;border-left:3px solid ${PCOLORS[p.platforms[0]] || '#888'}"
                   data-post-id="${p.id}" draggable="true" title="${(p.content || '').slice(0, 80)}">
                <span class="chip-time">${new Date(p.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                <span class="chip-text">${(p.content || '').slice(0, 20)}</span>
              </div>
            `).join('')}
            ${dayPosts.length > 3 ? `<div class="cal-more-badge">+${dayPosts.length - 3}</div>` : ''}
          </div>
        </div>
      `;
    });

    html += '</div>';
    gridEl.innerHTML = html;
    bindDragDrop(gridEl);
  }

  function renderWeek(gridEl, titleEl) {
    titleEl.textContent = formatWeekTitle(viewDate);
    const days = getWeekDays(viewDate);
    const hours = getHoursRange(6, 22);
    const posts = getCalendarPosts();

    let html = '<div class="cal-grid-week">';
    // Header
    html += '<div class="cal-week-time-col"></div>';
    days.forEach(d => {
      html += `<div class="cal-week-day-header ${d.isToday ? 'today' : ''}">
        <div class="week-day-name">${d.dayName}</div>
        <div class="week-day-num ${d.isToday ? 'today-num' : ''}">${d.dayNum}</div>
      </div>`;
    });

    // Time rows
    hours.forEach(hour => {
      html += `<div class="cal-week-time">${hour}:00</div>`;
      days.forEach(d => {
        const cellPosts = posts.filter(p => {
          const pd = new Date(p.scheduledAt);
          return pd.toISOString().split('T')[0] === d.date && pd.getHours() === hour;
        });
        html += `<div class="cal-week-cell" data-date="${d.date}" data-hour="${hour}">
          ${cellPosts.map(p => `
            <div class="cal-week-event" style="background:${PCOLORS[p.platforms[0]] || '#888'}18;border-left:3px solid ${PCOLORS[p.platforms[0]] || '#888'}"
                 data-post-id="${p.id}" draggable="true">
              ${new Date(p.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ${(p.content || '').slice(0, 25)}
            </div>
          `).join('')}
        </div>`;
      });
    });

    html += '</div>';
    gridEl.innerHTML = html;
    bindDragDrop(gridEl);
  }

  function bindDragDrop(gridEl) {
    gridEl.addEventListener('dragstart', e => {
      const chip = e.target.closest('[data-post-id]');
      if (chip) { draggedId = chip.dataset.postId; e.dataTransfer.effectAllowed = 'move'; }
    });
    gridEl.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const cell = e.target.closest('.cal-cell, .cal-week-cell');
      if (cell) cell.classList.add('drag-over');
    });
    gridEl.addEventListener('dragleave', e => {
      const cell = e.target.closest('.cal-cell, .cal-week-cell');
      if (cell) cell.classList.remove('drag-over');
    });
    gridEl.addEventListener('drop', e => {
      e.preventDefault();
      const cell = e.target.closest('.cal-cell, .cal-week-cell');
      if (cell) cell.classList.remove('drag-over');
      if (!draggedId || !cell?.dataset.date) return;

      const post = getCalendarPosts().find(p => p.id === draggedId);
      if (!post) return;

      const oldDate = new Date(post.scheduledAt);
      const newDate = new Date(cell.dataset.date);
      const hour = cell.dataset.hour ? parseInt(cell.dataset.hour) : oldDate.getHours();
      newDate.setHours(hour, oldDate.getMinutes(), 0, 0);

      updateCalendarPost(draggedId, { scheduledAt: newDate.toISOString() });
      if (window.Toast) window.Toast.show(`Đã đổi lịch → ${newDate.toLocaleDateString('vi-VN')} ${hour}:00`, 'success');
      draggedId = null;
    });

    // Click cell → side panel
    gridEl.addEventListener('click', e => {
      const cell = e.target.closest('.cal-cell, .cal-week-cell');
      if (cell?.dataset.date && !e.target.closest('[data-post-id]')) {
        openSidePanel(cell.dataset.date);
      }
      const chip = e.target.closest('[data-post-id]');
      if (chip) {
        const post = getCalendarPosts().find(p => p.id === chip.dataset.postId);
        if (post) openSidePanel(new Date(post.scheduledAt).toISOString().split('T')[0]);
      }
    });
  }

  function openSidePanel(dateStr) {
    const panel = container.querySelector('#cal-side-panel');
    const dateEl = container.querySelector('#side-panel-date');
    const postsEl = container.querySelector('#side-panel-posts');
    if (!panel) return;

    const date = new Date(dateStr);
    dateEl.textContent = date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

    const dayPosts = getCalendarPosts().filter(p => new Date(p.scheduledAt).toISOString().split('T')[0] === dateStr);

    postsEl.innerHTML = dayPosts.length === 0
      ? '<p style="color:var(--color-text-muted);font-size:var(--text-sm);text-align:center;padding:var(--space-4)">Chưa có bài nào</p>'
      : dayPosts.map(p => `
          <div class="side-panel-post">
            <div class="spp-time">${new Date(p.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
            <div class="spp-content">
              <div class="spp-platforms">${p.platforms.map(pl => `<span style="color:${PCOLORS[pl]};font-size:11px">● ${pl}</span>`).join(' ')}</div>
              <p class="spp-text">${(p.content || '').slice(0, 80)}</p>
            </div>
            <div class="spp-status ${STATUS_CLASSES[p.status] || ''}">${p.status}</div>
            <button class="btn btn-ghost btn-sm spp-delete" data-id="${p.id}" title="Xóa">🗑</button>
          </div>
        `).join('');

    postsEl.querySelectorAll('.spp-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        removeCalendarPost(btn.dataset.id);
        if (window.Toast) window.Toast.show('Đã xóa', 'info');
        openSidePanel(dateStr);
      });
    });

    container.querySelector('#btn-add-post-day').onclick = () => {
      window.location.hash = '#/compose';
      setTimeout(() => {
        const inp = document.querySelector('#schedule-time');
        const modeBtn = document.querySelector('[data-mode="schedule"]');
        if (inp) { const d = new Date(dateStr); d.setHours(9, 0); inp.value = d.toISOString().slice(0, 16); }
        if (modeBtn) modeBtn.click();
      }, 200);
    };

    panel.style.display = 'block';
  }

  // Navigation
  container.querySelector('#cal-prev')?.addEventListener('click', () => {
    if (viewMode === 'month') viewDate.setMonth(viewDate.getMonth() - 1);
    else viewDate.setDate(viewDate.getDate() - 7);
    renderGrid();
  });
  container.querySelector('#cal-next')?.addEventListener('click', () => {
    if (viewMode === 'month') viewDate.setMonth(viewDate.getMonth() + 1);
    else viewDate.setDate(viewDate.getDate() + 7);
    renderGrid();
  });
  container.querySelector('#cal-today')?.addEventListener('click', () => { viewDate = new Date(); renderGrid(); });

  container.querySelectorAll('.view-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.view-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      viewMode = btn.dataset.mode;
      renderGrid();
    });
  });

  container.querySelector('#close-side-panel')?.addEventListener('click', () => {
    container.querySelector('#cal-side-panel').style.display = 'none';
  });
}

function getShellHTML() {
  return `
    <div class="calendar-page" style="display:flex;flex-direction:column;gap:var(--space-4)">
      <div class="calendar-header">
        <div class="calendar-nav">
          <button id="cal-prev" class="btn btn-ghost btn-sm" style="font-size:var(--text-xl);line-height:1">‹</button>
          <h2 id="cal-title" style="margin:0;min-width:200px;text-align:center;font-size:var(--text-lg)"></h2>
          <button id="cal-next" class="btn btn-ghost btn-sm" style="font-size:var(--text-xl);line-height:1">›</button>
          <button id="cal-today" class="btn btn-secondary btn-sm">Hôm nay</button>
        </div>
        <div class="calendar-view-modes">
          <button class="view-mode-btn active" data-mode="month">Tháng</button>
          <button class="view-mode-btn" data-mode="week">Tuần</button>
        </div>
      </div>

      <div id="calendar-grid" class="calendar-grid"></div>

      <div id="cal-side-panel" class="cal-side-panel" style="display:none">
        <div class="side-panel-header">
          <h3 id="side-panel-date" style="margin:0;font-size:var(--text-sm)"></h3>
          <button id="close-side-panel" class="btn btn-ghost btn-sm">✕</button>
        </div>
        <div id="side-panel-posts" class="side-panel-posts"></div>
        <button id="btn-add-post-day" class="btn btn-primary btn-sm" style="width:100%;margin-top:var(--space-3)">+ Thêm bài cho ngày này</button>
      </div>
    </div>
  `;
}
