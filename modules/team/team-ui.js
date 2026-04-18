// ============================================================
// Team UI — Members, Invitations, Permissions Matrix
// ============================================================

import { getMembers, addMember, removeMember, updateMemberRole, createInvitation, getInvitations, revokeInvitation, ROLES, getCurrentUser, onUpdate } from './team-store.js';
import { renderActivityLog } from './team-activity.js';
import { can } from './team-auth.js';

export function renderTeam(container) {
  container.innerHTML = getHTML();
  if (window.refreshIcons) window.refreshIcons();
  onUpdate(() => refresh(container));
  refresh(container);
  bindEvents(container);
}

function getHTML() {
  const canManage = can('team.manage');
  return `
    <div style="display:flex;flex-direction:column;gap:var(--space-4)">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h2 style="margin:0">Team</h2>
        ${canManage ? '<button id="btn-invite" class="btn btn-primary btn-sm"><i data-lucide="user-plus" width="14" height="14"></i> Mời thành viên</button>' : ''}
      </div>

      <div id="invite-modal" class="modal-backdrop" style="display:none">
        <div class="modal-box" style="max-width:440px">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-4);border-bottom:1px solid var(--color-border)">
            <h3 style="margin:0;font-size:var(--text-base)">Mời thành viên</h3>
            <button id="close-invite" class="btn btn-ghost btn-sm">✕</button>
          </div>
          <div style="padding:var(--space-4)">
            <div style="margin-bottom:var(--space-3)"><label style="font-size:var(--text-xs);font-weight:600;display:block;margin-bottom:4px">Email</label><input type="email" id="invite-email" placeholder="name@company.com" class="field-input"/></div>
            <div><label style="font-size:var(--text-xs);font-weight:600;display:block;margin-bottom:4px">Role</label>
              <div id="role-selector">${Object.values(ROLES).filter(r => r.id !== 'owner').map(r => `<button class="role-option ${r.id === 'editor' ? 'active' : ''}" data-role="${r.id}"><span style="font-size:18px">${r.icon}</span><div><div style="font-weight:600;font-size:var(--text-sm);color:${r.color}">${r.label}</div><div style="font-size:10px;color:var(--color-text-muted)">${_rdesc(r.id)}</div></div></button>`).join('')}</div>
            </div>
          </div>
          <div style="display:flex;gap:var(--space-2);justify-content:flex-end;padding:var(--space-3) var(--space-4);border-top:1px solid var(--color-border)">
            <button id="cancel-invite" class="btn btn-secondary btn-sm">Hủy</button>
            <button id="send-invite" class="btn btn-primary btn-sm">Gửi lời mời</button>
          </div>
        </div>
      </div>

      <div class="team-layout">
        <div class="team-main">
          <div class="team-card"><h3 style="margin:0 0 var(--space-3) 0;font-size:var(--text-sm);font-weight:600">Thành viên (<span id="member-count">0</span>)</h3><div id="members-list"></div></div>
          <div class="team-card" id="inv-card" style="display:none"><h3 style="margin:0 0 var(--space-3) 0;font-size:var(--text-sm);font-weight:600">Lời mời đang chờ</h3><div id="inv-list"></div></div>
          <div class="team-card"><h3 style="margin:0 0 var(--space-3) 0;font-size:var(--text-sm);font-weight:600">Phân quyền</h3>${_permMatrix()}</div>
        </div>
        <div class="team-sidebar"><div class="team-card"><h3 style="margin:0 0 var(--space-3) 0;font-size:var(--text-sm);font-weight:600">Hoạt động</h3><div id="activity-log" class="activity-log"></div></div></div>
      </div>
    </div>`;
}

function refresh(container) {
  const members = getMembers(), cur = getCurrentUser(), invs = getInvitations();
  container.querySelector('#member-count').textContent = members.length;

  const ml = container.querySelector('#members-list');
  ml.innerHTML = members.map(m => {
    const role = ROLES[m.role], isCur = m.id === cur.id;
    return `<div class="member-row">
      <div class="member-avatar" style="background:${role?.color}22;color:${role?.color}">${m.name.slice(0, 2).toUpperCase()}</div>
      <div class="member-info"><div class="member-name">${m.name}${isCur ? ' <span class="you-badge">Bạn</span>' : ''}</div><div class="member-email">${m.email}</div></div>
      <div class="member-role">${can('team.manage') && !isCur
        ? `<select class="role-select" data-mid="${m.id}">${Object.values(ROLES).map(r => `<option value="${r.id}" ${m.role === r.id ? 'selected' : ''}>${r.icon} ${r.label}</option>`).join('')}</select>`
        : `<span class="role-badge" style="background:${role?.color}18;color:${role?.color}">${role?.icon} ${role?.label}</span>`
      }</div>
      ${can('team.manage') && !isCur ? `<button class="btn btn-ghost btn-sm member-rm" data-id="${m.id}" title="Xóa">🗑</button>` : '<div style="width:28px"></div>'}
    </div>`;
  }).join('');

  ml.querySelectorAll('.role-select').forEach(s => s.addEventListener('change', e => { updateMemberRole(e.target.dataset.mid, e.target.value); if (window.Toast) window.Toast.show('Đã cập nhật role', 'success'); }));
  ml.querySelectorAll('.member-rm').forEach(b => b.addEventListener('click', () => { if (confirm('Xóa?')) { removeMember(b.dataset.id); if (window.Toast) window.Toast.show('Đã xóa', 'info'); } }));

  const ic = container.querySelector('#inv-card');
  ic.style.display = invs.length ? 'block' : 'none';
  container.querySelector('#inv-list').innerHTML = invs.map(inv => `<div class="invitation-row"><span class="inv-email">${inv.email}</span><span class="role-badge" style="background:${ROLES[inv.role]?.color}18;color:${ROLES[inv.role]?.color}">${ROLES[inv.role]?.icon} ${ROLES[inv.role]?.label}</span><button class="btn btn-ghost btn-sm inv-rev" data-id="${inv.id}">✕ Thu hồi</button></div>`).join('');
  container.querySelectorAll('.inv-rev').forEach(b => b.addEventListener('click', () => revokeInvitation(b.dataset.id)));

  renderActivityLog(container.querySelector('#activity-log'));
  if (window.refreshIcons) window.refreshIcons();
}

function bindEvents(container) {
  let selRole = 'editor';
  container.querySelector('#btn-invite')?.addEventListener('click', () => container.querySelector('#invite-modal').style.display = 'flex');
  ['#close-invite', '#cancel-invite'].forEach(s => container.querySelector(s)?.addEventListener('click', () => container.querySelector('#invite-modal').style.display = 'none'));

  container.querySelectorAll('.role-option').forEach(b => b.addEventListener('click', () => { container.querySelectorAll('.role-option').forEach(x => x.classList.remove('active')); b.classList.add('active'); selRole = b.dataset.role; }));

  container.querySelector('#send-invite')?.addEventListener('click', () => {
    const email = container.querySelector('#invite-email').value.trim();
    if (!email || !email.includes('@')) { if (window.Toast) window.Toast.show('Email không hợp lệ', 'error'); return; }
    if (getMembers().some(m => m.email === email)) { if (window.Toast) window.Toast.show('Đã là thành viên', 'warning'); return; }
    const inv = createInvitation(email, selRole);
    container.querySelector('#invite-modal').style.display = 'none';
    container.querySelector('#invite-email').value = '';
    if (window.Toast) window.Toast.show(`Đã mời ${email}!`, 'success');
    setTimeout(() => { addMember({ name: email.split('@')[0], email, role: inv.role }); revokeInvitation(inv.id); if (window.Toast) window.Toast.show(`${email} đã tham gia!`, 'success'); }, 2000);
  });
}

function _permMatrix() {
  const groups = [
    { label: 'Bài đăng', perms: ['post.create','post.edit','post.submit_review','post.approve','post.publish','post.delete'] },
    { label: 'Analytics', perms: ['analytics.view'] },
    { label: 'Library', perms: ['library.view','library.upload','library.manage'] },
    { label: 'Inbox', perms: ['inbox.view','inbox.reply'] },
    { label: 'Team', perms: ['team.view','team.manage'] }
  ];
  const roles = ['owner','manager','editor','viewer'];
  const labels = { 'post.create':'Tạo','post.edit':'Sửa','post.submit_review':'Submit','post.approve':'Duyệt','post.publish':'Đăng','post.delete':'Xóa','analytics.view':'Xem','library.view':'Xem','library.upload':'Upload','library.manage':'Quản lý','inbox.view':'Xem','inbox.reply':'Trả lời','team.view':'Xem','team.manage':'Quản lý' };
  let h = '<table class="data-table" style="font-size:11px"><thead><tr><th></th>' + roles.map(r => `<th style="color:${ROLES[r].color};text-align:center">${ROLES[r].icon}</th>`).join('') + '</tr></thead><tbody>';
  groups.forEach(g => {
    h += `<tr><td colspan="${roles.length + 1}" style="font-weight:700;font-size:10px;text-transform:uppercase;color:var(--color-text-muted);background:var(--color-surface-hover);padding:4px 8px">${g.label}</td></tr>`;
    g.perms.forEach(p => {
      h += `<tr><td style="padding:3px 8px;color:var(--color-text-muted)">${labels[p] || p}</td>`;
      roles.forEach(rid => { const role = ROLES[rid]; const has = role.permissions.includes('*') || role.permissions.includes(p); h += `<td style="text-align:center">${has ? '✅' : '—'}</td>`; });
      h += '</tr>';
    });
  });
  return h + '</tbody></table>';
}

function _rdesc(id) { return { manager: 'Duyệt + đăng + quản lý', editor: 'Tạo & sửa, cần duyệt', viewer: 'Chỉ xem' }[id] || ''; }
