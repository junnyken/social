import {
  getAllWorkspaces, getCurrentWorkspace, switchWorkspace, createWorkspace,
  updateWorkspace, getWorkspaceUsage, WORKSPACE_PLANS
} from './workspace-manager.js';

import {
  getWorkspaceClients, addClient, reassignClient, getClientMetrics
} from './client-manager.js';

import {
  sendTeamInvite, getPendingInvites, updateMemberRole, removeTeamMember,
  acceptInvite, rejectInvite
} from './team-invites.js';

import {
  getActivityLog, getActivitySummary, ACTIVITY_TYPES
} from './activity-log.js';

import {
  getSubscription, getBillingOverview, cancelSubscription
} from './billing-manager.js';

import {
  ROLES, ROLE_LABELS, canManageRole
} from './team-roles.js';

const showToast = (msg, type) => window.Toast && window.Toast.show(msg, type);

let agencyTab = 'workspaces';

export function renderAgency(container) {
  container.innerHTML = getAgencyHTML();
  bindAgencyEvents(container);
  renderAgencyTab(container, agencyTab);
}

function getAgencyHTML() {
  const currentWs = getCurrentWorkspace();

  return `
  <div class="agency-page">
    <!-- Header -->
    <div class="agency-header">
      <div>
        <h2>🏢 Agency Workspace</h2>
        <p class="subtitle">Manage teams, clients, billing</p>
      </div>
      <div class="header-controls">
        <div class="workspace-switcher">
          <select id="workspace-select" class="select-input">
            ${getAllWorkspaces().map(w => `
              <option value="${w.id}" ${w.id === currentWs?.id ? 'selected' : ''}>
                ${w.name}
              </option>
            `).join('')}
          </select>
        </div>
        <button id="btn-new-workspace" class="btn-primary">
          + Workspace
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="agency-tabs">
      <button class="agency-tab active" data-tab="workspaces">🏢 Workspaces</button>
      <button class="agency-tab" data-tab="team">👥 Team</button>
      <button class="agency-tab" data-tab="clients">🤝 Clients</button>
      <button class="agency-tab" data-tab="activity">📋 Activity</button>
      <button class="agency-tab" data-tab="billing">💳 Billing</button>
    </div>

    <!-- Tab Content -->
    <div id="agency-content" class="agency-content"></div>
  </div>`;
}

function renderAgencyTab(container, tab) {
  const content = container.querySelector('#agency-content');
  agencyTab = tab;

  switch (tab) {
    case 'workspaces': renderWorkspacesTab(content); break;
    case 'team':       renderTeamTab(content); break;
    case 'clients':    renderClientsTab(content); break;
    case 'activity':   renderActivityTab(content); break;
    case 'billing':    renderBillingTab(content); break;
  }
}

// ── Tab: Workspaces ───────────────────────────────────────────
function renderWorkspacesTab(container) {
  const workspaces = getAllWorkspaces();
  const current = getCurrentWorkspace();
  const usage = getWorkspaceUsage(current?.id);

  container.innerHTML = `
  <div class="agency-section">
    <div class="section-header">
      <h3>🏢 Workspaces</h3>
      <button id="btn-create-workspace" class="btn-primary btn-sm">
        + Create Workspace
      </button>
    </div>

    <!-- Current Workspace Info -->
    ${current ? `
    <div class="current-workspace-card">
      <div class="workspace-info">
        <h4>${current.name}</h4>
        <p class="workspace-type">${current.type === 'agency' ? '🏢 Agency' : current.type === 'team' ? '👥 Team' : '🔒 Personal'}</p>
        <p class="workspace-plan">Plan: <strong>${current.plan.toUpperCase()}</strong></p>
      </div>
      <div class="workspace-usage">
        <div class="usage-item">
          <span>Team Members</span>
          <span class="usage-value">${current.members?.length || 0}/${WORKSPACE_PLANS[current.plan].maxMembers}</span>
        </div>
        <div class="usage-item">
          <span>Clients</span>
          <span class="usage-value">${usage.clients.current}/${usage.clients.limit}</span>
        </div>
      </div>
    </div>
    ` : ''}

    <!-- Workspaces List -->
    <div class="workspaces-list">
      <h4>All Workspaces</h4>
      ${workspaces.length === 0 ? `
        <div class="empty-state">No workspaces</div>
      ` : `
        <div class="workspace-cards">
          ${workspaces.map(w => `
            <div class="workspace-card ${w.id === current?.id ? 'active' : ''}">
              <div class="workspace-header">
                <h5>${w.name}</h5>
                <span class="ws-badge">${w.plan}</span>
              </div>
              <p class="ws-members">👥 ${w.members?.length || 0} members</p>
              <p class="ws-type">${w.type}</p>
              <button class="btn-secondary btn-sm switch-workspace" data-ws-id="${w.id}">
                Switch
              </button>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  </div>`;

  container.querySelector('#btn-create-workspace')?.addEventListener('click', () => {
    const name = prompt('Workspace name:');
    if (name) {
      createWorkspace({ name, owner: 'current_user', type: 'team' });
      renderAgencyTab(container.parentElement, 'workspaces');
      showToast('✅ Workspace created!', 'success');
    }
  });

  container.querySelectorAll('.switch-workspace').forEach(btn => {
    btn.addEventListener('click', () => {
      switchWorkspace(btn.dataset.wsId);
      renderAgencyTab(container.parentElement, 'workspaces');
      showToast('✅ Switched workspace!', 'success');
    });
  });

  if (window.lucide) lucide.createIcons();
}

// ── Tab: Team ─────────────────────────────────────────────────
function renderTeamTab(container) {
  const current = getCurrentWorkspace();
  const members = current?.members || [];
  const pending = getPendingInvites(current?.id);
  const currentUser = 'current_user';  // In real app: get from auth

  container.innerHTML = `
  <div class="agency-section">
    <div class="section-header">
      <h3>👥 Team Members</h3>
      <button id="btn-invite-member" class="btn-primary btn-sm">
        + Invite Member
      </button>
    </div>

    <!-- Team Members -->
    ${members.length === 0 ? `
      <div class="empty-state">No team members</div>
    ` : `
      <div class="members-table">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${members.map(m => `
              <tr>
                <td>${m.email || m.userId}</td>
                <td>${ROLE_LABELS[m.role] || m.role}</td>
                <td>${m.joinedAt ? new Date(m.joinedAt).toLocaleDateString('vi-VN') : 'Admin'}</td>
                <td>
                  ${m.userId !== currentUser ? `
                    <button class="btn-ghost btn-sm change-role" data-user-id="${m.userId}">
                      🔄 Change Role
                    </button>
                    <button class="btn-ghost btn-sm remove-member" data-user-id="${m.userId}">
                      🗑️ Remove
                    </button>
                  ` : '<span class="text-muted">You</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `}

    <!-- Pending Invites -->
    ${pending.length > 0 ? `
      <div class="pending-invites">
        <h4>📬 Pending Invitations</h4>
        ${pending.map(inv => `
          <div class="invite-item">
            <div>
              <div class="invite-email">${inv.email}</div>
              <div class="invite-role">${ROLE_LABELS[inv.role]}</div>
            </div>
            <button class="btn-ghost btn-sm cancel-invite" data-invite-id="${inv.id}">
              ❌ Cancel
            </button>
          </div>
        `).join('')}
      </div>
    ` : ''}
  </div>`;

  container.querySelector('#btn-invite-member')?.addEventListener('click', () => {
    openInviteModal(container, current.id);
  });

  container.querySelectorAll('.remove-member').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Remove this member?')) {
        removeTeamMember(current.id, btn.dataset.userId);
        showToast('✅ Member removed!', 'success');
        renderAgencyTab(container.parentElement, 'team');
      }
    });
  });

  container.querySelectorAll('.change-role').forEach(btn => {
    btn.addEventListener('click', () => {
      openRoleChangeModal(container, current.id, btn.dataset.userId);
    });
  });

  if (window.lucide) lucide.createIcons();
}

// ── Tab: Clients ───────────────────────────────────────────────
function renderClientsTab(container) {
  const current = getCurrentWorkspace();
  const clients = getWorkspaceClients(current?.id);

  container.innerHTML = `
  <div class="agency-section">
    <div class="section-header">
      <h3>🤝 Clients</h3>
      <button id="btn-add-client" class="btn-primary btn-sm">
        + Add Client
      </button>
    </div>

    ${clients.length === 0 ? `
      <div class="empty-state">
        <i data-lucide="users" width="40" height="40"></i>
        <p>No clients yet</p>
      </div>
    ` : `
      <div class="clients-grid">
        ${clients.map(client => {
          const metrics = getClientMetrics(client.id);
          return `
          <div class="client-card">
            <div class="client-header">
              <h4>${client.name}</h4>
              <span class="client-status ${client.status}">${client.status}</span>
            </div>
            <p class="client-industry">${client.industry}</p>
            <div class="client-stats">
              <div class="stat">
                <span>Posts</span>
                <strong>${metrics.postsCreated}</strong>
              </div>
              <div class="stat">
                <span>Reach</span>
                <strong>${(metrics.totalReach / 1000).toFixed(0)}K</strong>
              </div>
              <div class="stat">
                <span>ER</span>
                <strong>${metrics.avgER}%</strong>
              </div>
            </div>
            <button class="btn-secondary btn-sm view-client" data-client-id="${client.id}">
              📊 View
            </button>
          </div>`;
        }).join('')}
      </div>
    `}
  </div>`;

  container.querySelector('#btn-add-client')?.addEventListener('click', () => {
    openAddClientModal(container, current.id);
  });

  if (window.lucide) lucide.createIcons();
}

// ── Tab: Activity ──────────────────────────────────────────────
function renderActivityTab(container) {
  const current = getCurrentWorkspace();
  const activities = getActivityLog(current?.id, {}, 50);
  const summary = getActivitySummary(current?.id);

  container.innerHTML = `
  <div class="agency-section">
    <div class="section-header">
      <h3>📋 Activity Log</h3>
    </div>

    <!-- Summary -->
    <div class="activity-summary">
      <div class="summary-stat">
        <div class="summary-label">Total Activities (7 days)</div>
        <div class="summary-value">${summary.totalActivities}</div>
      </div>
      <div class="summary-stat">
        <div class="summary-label">Active Users</div>
        <div class="summary-value">${Object.keys(summary.byUser).length}</div>
      </div>
    </div>

    <!-- Activity List -->
    <div class="activity-list">
      ${activities.length === 0 ? `
        <p class="empty">No activities</p>
      ` : activities.map(a => `
        <div class="activity-item">
          <div class="activity-icon">${getActivityIcon(a.type)}</div>
          <div class="activity-details">
            <div class="activity-title">
              <strong>${a.username}</strong>
              ${getActivityLabel(a.type)}
              <span class="resource">${a.resourceName}</span>
            </div>
            <div class="activity-time">${new Date(a.timestamp).toLocaleString('vi-VN')}</div>
          </div>
        </div>
      `).join('')}
    </div>
  </div>`;

  if (window.lucide) lucide.createIcons();
}

// ── Tab: Billing ───────────────────────────────────────────────
function renderBillingTab(container) {
  const current = getCurrentWorkspace();
  const billing = getBillingOverview(current?.id);

  container.innerHTML = `
  <div class="agency-section">
    <div class="section-header">
      <h3>💳 Billing & Subscription</h3>
    </div>

    <!-- Current Plan -->
    ${current?.plan ? `
    <div class="current-plan-card">
      <div class="plan-info">
        <h4>${WORKSPACE_PLANS[current.plan].name}</h4>
        <p class="plan-price">
          ${WORKSPACE_PLANS[current.plan].price.toLocaleString()} ₫
          <span class="period">/month</span>
        </p>
        <p class="plan-status">Status: <strong>${billing.status}</strong></p>
      </div>
      <div class="plan-features">
        <h5>Features</h5>
        <ul>
          ${WORKSPACE_PLANS[current.plan].features.slice(0, 5).map(f => `
            <li>✅ ${f}</li>
          `).join('')}
        </ul>
      </div>
      <button class="btn-secondary btn-sm upgrade-plan">
        📈 Upgrade Plan
      </button>
    </div>
    ` : ''}

    <!-- Recent Invoices -->
    <div class="recent-invoices">
      <h4>📄 Recent Invoices</h4>
      ${billing.recentInvoices?.length === 0 ? `
        <p>No invoices yet</p>
      ` : `
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${billing.recentInvoices?.map(inv => `
              <tr>
                <td>${inv.invoiceNumber}</td>
                <td>${inv.amount.toLocaleString()} ₫</td>
                <td>${new Date(inv.issuedAt).toLocaleDateString('vi-VN')}</td>
                <td><span class="badge ${inv.status}">${inv.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </div>
  </div>`;

  if (window.lucide) lucide.createIcons();
}

// ── Helper Modals ──────────────────────────────────────────────
function openInviteModal(container, workspaceId) {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
  <div class="modal-box">
    <div class="modal-header">
      <h3>Invite Team Member</h3>
      <button class="btn-ghost close-modal">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="invite-email" class="input-field" />
      </div>
      <div class="form-group">
        <label>Role</label>
        <select id="invite-role" class="select-input">
          <option value="viewer">👁️ Viewer</option>
          <option value="editor">✏️ Editor</option>
          <option value="admin">⭐ Admin</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary close-modal">Cancel</button>
      <button class="btn-primary" id="btn-send-invite">✅ Send Invite</button>
    </div>
  </div>`;

  document.body.appendChild(modal);

  modal.querySelector('#btn-send-invite')?.addEventListener('click', () => {
    const email = modal.querySelector('#invite-email').value;
    const role = modal.querySelector('#invite-role').value;

    if (!email) {
      showToast('Please enter email', 'error');
      return;
    }

    sendTeamInvite({ workspaceId, email, role, invitedBy: 'current_user' });
    showToast('✅ Invitation sent!', 'success');
    modal.remove();
    renderAgencyTab(container.parentElement, 'team');
  });

  modal.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => modal.remove());
  });
}

function openAddClientModal(container, workspaceId) {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
  <div class="modal-box">
    <div class="modal-header">
      <h3>Add Client</h3>
      <button class="btn-ghost close-modal">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>Client Name</label>
        <input type="text" id="client-name" class="input-field" />
      </div>
      <div class="form-group">
        <label>Industry</label>
        <input type="text" id="client-industry" class="input-field" placeholder="E.g., E-commerce" />
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="client-email" class="input-field" />
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary close-modal">Cancel</button>
      <button class="btn-primary" id="btn-add-client-save">✅ Add Client</button>
    </div>
  </div>`;

  document.body.appendChild(modal);

  modal.querySelector('#btn-add-client-save')?.addEventListener('click', () => {
    const clientData = {
      workspaceId,
      name: modal.querySelector('#client-name').value,
      industry: modal.querySelector('#client-industry').value,
      email: modal.querySelector('#client-email').value
    };

    if (!clientData.name || !clientData.email) {
      showToast('Please fill required fields', 'error');
      return;
    }

    addClient(clientData);
    showToast('✅ Client added!', 'success');
    modal.remove();
    renderAgencyTab(container.parentElement, 'clients');
  });

  modal.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => modal.remove());
  });
}

function openRoleChangeModal(container, workspaceId, userId) {
  const workspace = getCurrentWorkspace();
  const member = workspace.members.find(m => m.userId === userId);

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
  <div class="modal-box">
    <div class="modal-header">
      <h3>Change Role</h3>
      <button class="btn-ghost close-modal">✕</button>
    </div>
    <div class="modal-body">
      <p class="modal-text">Change role for ${member.email}</p>
      <div class="role-options">
        ${Object.entries(ROLE_LABELS).map(([role, label]) => `
          <label class="radio-item">
            <input type="radio" name="role" value="${role}" ${member.role === role ? 'checked' : ''} />
            <span>${label}</span>
          </label>
        `).join('')}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary close-modal">Cancel</button>
      <button class="btn-primary" id="btn-change-role-save">✅ Save</button>
    </div>
  </div>`;

  document.body.appendChild(modal);

  modal.querySelector('#btn-change-role-save')?.addEventListener('click', () => {
    const newRole = modal.querySelector('input[name="role"]:checked').value;
    updateMemberRole(workspaceId, userId, newRole);
    showToast('✅ Role updated!', 'success');
    modal.remove();
    renderAgencyTab(container.parentElement, 'team');
  });

  modal.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => modal.remove());
  });
}

// ── Event Binder ───────────────────────────────────────────────
function bindAgencyEvents(container) {
  container.querySelector('#workspace-select')?.addEventListener('change', e => {
    switchWorkspace(e.target.value);
    renderAgency(container);
  });

  container.querySelectorAll('.agency-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.agency-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderAgencyTab(container, tab.dataset.tab);
    });
  });
}

// ── Helpers ────────────────────────────────────────────────────
function getActivityIcon(type) {
  const icons = {
    post_created: '✍️',
    post_published: '📤',
    team_invited: '📧',
    team_joined: '✅',
    client_added: '🤝'
  };
  return icons[type] || '📋';
}

function getActivityLabel(type) {
  const labels = {
    post_created: 'created a post',
    post_published: 'published',
    team_invited: 'invited',
    team_joined: 'joined the team',
    client_added: 'added a client'
  };
  return labels[type] || 'activity';
}
