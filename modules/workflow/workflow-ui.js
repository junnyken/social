// ============================================================
// Workflow UI — Kanban board + Drawer + Comments
// ============================================================

import { getPosts, getPost, submitForReview, approvePost, rejectPost, markPublished, revertToDraft, addComment, getComments, getWorkflowStats, POST_STATES, seedWorkflowData, onUpdate } from './workflow-store.js';

const PCOLS = { facebook: '#1877F2', instagram: '#E1306C', twitter: '#1DA1F2', linkedin: '#0077B5' };

export function renderWorkflow(container) {
  seedWorkflowData();
  container.innerHTML = getHTML();
  if (window.refreshIcons) window.refreshIcons();
  onUpdate(() => refreshBoard(container));
  refreshBoard(container);
}

function getHTML() {
  return `
    <div style="display:flex;flex-direction:column;gap:var(--space-4)">
      <div><h2 style="margin:0">Approval Workflow</h2><p style="color:var(--color-text-muted);margin:var(--space-1) 0 0 0;font-size:var(--text-sm)">Pipeline duyệt bài trước khi đăng</p></div>
      <div class="workflow-stats" id="wf-stats"></div>
      <div class="workflow-board" id="wf-board">
        ${['draft','review','approved','rejected','published'].map(s => {
          const st = POST_STATES[s];
          return `<div class="workflow-column"><div class="col-header" style="border-top:3px solid ${st.color}"><span>${st.icon}</span><span class="col-title">${st.label}</span><span class="col-count" id="cnt-${s}">0</span></div><div class="col-posts" id="col-${s}"></div></div>`;
        }).join('')}
      </div>
      <div id="wf-drawer" class="workflow-drawer" style="display:none"><div class="drawer-header"><div id="drawer-badge"></div><button id="close-drawer" class="btn btn-ghost btn-sm">✕</button></div><div id="drawer-content" class="drawer-content"></div></div>
      <div id="drawer-overlay" class="drawer-overlay" style="display:none"></div>
    </div>`;
}

function refreshBoard(container) {
  const stats = getWorkflowStats();
  container.querySelector('#wf-stats').innerHTML = Object.entries(POST_STATES).map(([id, s]) => `<div class="workflow-stat-item"><span style="font-size:18px">${s.icon}</span><span style="font-size:var(--text-xl);font-weight:800;color:${s.color}">${stats[id] || 0}</span><span style="font-size:var(--text-xs);color:var(--color-text-muted)">${s.label}</span></div>`).join('');

  Object.keys(POST_STATES).forEach(state => {
    const ps = getPosts({ state }), col = container.querySelector('#col-' + state), cnt = container.querySelector('#cnt-' + state);
    if (!col) return;
    cnt.textContent = ps.length;
    col.innerHTML = ps.length === 0 ? '<div class="col-empty">Không có bài</div>' : ps.map(p => _card(p)).join('');
    col.querySelectorAll('.post-card').forEach(card => card.addEventListener('click', () => openDrawer(container, card.dataset.id)));
  });
}

function _card(p) {
  return `<div class="post-card" data-id="${p.id}">
    <div class="post-card-platforms">${(p.platforms || []).map(pl => `<span class="platform-dot" style="background:${PCOLS[pl] || '#888'}" title="${pl}"></span>`).join('')}</div>
    <div class="post-card-preview">${(p.content || '').slice(0, 80)}${(p.content || '').length > 80 ? '...' : ''}</div>
    <div class="post-card-footer"><span>${p.createdByName || ''}</span><span>${_rel(p.updatedAt)}</span></div>
    ${p.state === 'rejected' && p.rejectionReason ? `<div class="rejection-hint">⚠️ ${p.rejectionReason.slice(0, 40)}</div>` : ''}
  </div>`;
}

function openDrawer(container, postId) {
  const post = getPost(postId);
  if (!post) return;
  const st = POST_STATES[post.state];
  const drawer = container.querySelector('#wf-drawer'), overlay = container.querySelector('#drawer-overlay');
  container.querySelector('#drawer-badge').innerHTML = `<span style="background:${st.color}18;color:${st.color};padding:4px 12px;border-radius:999px;font-size:13px;font-weight:600">${st.icon} ${st.label}</span>`;

  const cmts = getComments(postId);
  container.querySelector('#drawer-content').innerHTML = `
    <div class="drawer-post-body">
      <div class="drawer-section">
        <div style="display:flex;gap:var(--space-3);flex-wrap:wrap;font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:var(--space-2)">
          <span>👤 ${post.createdByName}</span><span>🕐 ${new Date(post.createdAt).toLocaleString('vi-VN')}</span>
          <div>${(post.platforms || []).map(p => `<span style="color:${PCOLS[p]};font-size:12px">● ${p}</span>`).join(' ')}</div>
        </div>
        <div class="drawer-post-content">${post.content || '(Trống)'}</div>
        ${post.scheduledAt ? `<div style="font-size:var(--text-xs);color:var(--color-primary);margin-top:var(--space-2)">📅 Lên lịch: ${new Date(post.scheduledAt).toLocaleString('vi-VN')}</div>` : ''}
        ${post.rejectionReason ? `<div class="drawer-rejection">⚠️ <strong>Lý do:</strong> ${post.rejectionReason}</div>` : ''}
      </div>
      <div class="drawer-section"><div class="action-row">${_actions(post)}</div></div>
      <div class="drawer-section">
        <h4 style="margin:0 0 var(--space-2) 0;font-size:var(--text-sm)">Comments (${cmts.length})</h4>
        <div class="comment-list">${cmts.map(c => `<div class="comment-item"><div class="comment-author">${c.authorName}</div><div class="comment-text">${c.text}</div><div class="comment-time">${_rel(c.createdAt)}</div></div>`).join('') || '<p style="font-size:var(--text-xs);color:var(--color-text-muted);text-align:center">Chưa có</p>'}</div>
        <div class="comment-compose"><input type="text" class="field-input" id="cmt-input" placeholder="Thêm comment..."/><button class="btn btn-secondary btn-sm" id="btn-cmt">Gửi</button></div>
      </div>
    </div>`;

  // Comment
  container.querySelector('#btn-cmt')?.addEventListener('click', () => {
    const inp = container.querySelector('#cmt-input'), text = inp?.value.trim();
    if (!text) return;
    addComment(postId, text);
    inp.value = '';
    openDrawer(container, postId); // refresh
  });

  // Actions
  container.querySelectorAll('[data-action]').forEach(btn => btn.addEventListener('click', async () => {
    try {
      const a = btn.dataset.action;
      if (a === 'submit') { await submitForReview(postId); if (window.Toast) window.Toast.show('Đã gửi duyệt!', 'success'); }
      if (a === 'approve') { await approvePost(postId); if (window.Toast) window.Toast.show('Đã duyệt!', 'success'); }
      if (a === 'reject') { const r = prompt('Lý do từ chối:'); if (r !== null) { await rejectPost(postId, r || 'Không đạt'); if (window.Toast) window.Toast.show('Đã từ chối', 'info'); } else return; }
      if (a === 'magiclink') {
          const l = window.location.origin + '/api/v1/approval/p/' + btoa(postId);
          navigator.clipboard.writeText(l);
          if (window.Toast) window.Toast.show('Đã copy Magic Link!', 'success');
          return;
      }
      if (a === 'publish') { 
          if (window.Toast) window.Toast.show('Đang xử lý...', 'info'); 
          await markPublished(postId);
          // Push to real Queue
          const { addToQueue } = await import('../scheduler/scheduler-store.js');
          try {
              for (const pf of (post.platforms || ['facebook'])) {
                  await addToQueue({ platform: pf, text: post.content, scheduledAt: new Date().toISOString() });
              }
              if (window.Toast) window.Toast.show('🚀 Đã đẩy vào Queue!', 'success');
          } catch(e) {
              if (window.Toast) window.Toast.show('❌ Lỗi Queue', 'error');
          }
      }
      if (a === 'revise') { await revertToDraft(postId); if (window.Toast) window.Toast.show('Đã mở lại để sửa', 'info'); }
      closeDrawer(drawer, overlay);
    } catch (e) { if (window.Toast) window.Toast.show('❌ ' + e.message, 'error'); }
  }));

  drawer.style.display = 'flex';
  overlay.style.display = 'block';
  container.querySelector('#close-drawer').onclick = () => closeDrawer(drawer, overlay);
  overlay.onclick = () => closeDrawer(drawer, overlay);
}

function _actions(post) {
  const btns = [];
  if (post.state === 'draft') btns.push(`<button class="btn btn-primary btn-sm" data-action="submit">📤 Submit duyệt</button>`);
  if (post.state === 'review') { btns.push(`<button class="btn btn-sm" style="background:var(--color-success);color:#fff" data-action="approve">✅ Duyệt</button>`); btns.push(`<button class="btn btn-sm" style="background:var(--color-error);color:#fff" data-action="reject">❌ Từ chối</button>`); }
  if (post.state === 'approved') btns.push(`<button class="btn btn-primary btn-sm" data-action="publish">🚀 Đăng ngay</button>`);
  if (post.state === 'rejected') btns.push(`<button class="btn btn-secondary btn-sm" data-action="revise">✏️ Sửa lại</button>`);
  if (['draft', 'review'].includes(post.state)) btns.push(`<button class="btn btn-secondary btn-sm" data-action="magiclink">🔗 Magic Link</button>`);
  return btns.length ? btns.join('') : '<span style="font-size:var(--text-xs);color:var(--color-text-muted)">Không có hành động</span>';
}

function closeDrawer(d, o) { d.style.display = 'none'; o.style.display = 'none'; }
function _rel(iso) { if (!iso) return ''; const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000); if (m < 1) return 'Vừa xong'; if (m < 60) return m + 'p'; const h = Math.floor(m / 60); return h < 24 ? h + 'h' : Math.floor(h / 24) + 'd'; }
