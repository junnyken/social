import { Accounts, Auth } from '../api-client.js';
import { statusBadge } from './dashboard.view.js';

export async function renderAccounts(container) {
  container.innerHTML = `
        <div class="flex-col">
            <div class="flex-between"><h2>Accounts</h2><button class="btn btn-primary btn-md" id="btn-add-account"><i data-lucide="user-plus" width="18" height="18"></i> Add Account</button></div>
            <div class="grid-3" id="accounts-grid">Loading...</div>
        </div>
  `;

  try {
    const res = await Accounts.list();
    const accts = res.data || [];
    
    document.getElementById('accounts-grid').innerHTML = accts.map(a => `
        <div class="card" style="display:flex;flex-direction:column;gap:var(--space-4)">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div style="display:flex;gap:var(--space-3);align-items:center">
                    <div class="avatar" style="width:44px;height:44px;font-size:var(--text-base)">${a.name.substring(0,2).toUpperCase()}</div>
                    <div><h4 style="font-size:var(--text-base)">${a.name}</h4><div style="font-size:var(--text-xs);color:var(--color-text-muted)">${a.type || 'Page/Group'} · ${a.pageId || a.id}</div></div>
                </div>
                <button class="icon-btn" style="width:32px;height:32px;min-width:32px;min-height:32px"><i data-lucide="more-vertical" width="16" height="16"></i></button>
            </div>
            <div style="display:flex;gap:var(--space-2)">${statusBadge(a.status)}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);background:var(--color-surface-hover);padding:var(--space-3);border-radius:var(--radius-md)">
                <div><div style="font-size:10px;color:var(--color-text-muted);text-transform:uppercase">Posts Today</div><div style="font-weight:700;font-size:var(--text-lg)">${a.postsToday || 0}</div></div>
                <div><div style="font-size:10px;color:var(--color-text-muted);text-transform:uppercase">Success Rate</div><div style="font-weight:700;font-size:var(--text-lg);${(a.successRate||100)>90?'color:var(--color-success)':''}">${a.successRate || 100}%</div></div>
            </div>
            <div style="display:flex;gap:var(--space-2)">
                <button class="btn btn-ghost btn-sm" style="flex:1">Configure</button>
                ${a.status==='connected' ?
                    `<button class="btn btn-ghost btn-sm" style="flex:1;color:var(--color-warning)">Pause</button>` :
                    `<button class="btn btn-primary btn-sm" style="flex:1">Reconnect</button>`}
                <button class="btn btn-ghost btn-sm btn-del-acc" data-id="${a.id}" style="color:var(--color-error)" aria-label="Remove account"><i data-lucide="trash-2" width="14" height="14"></i></button>
            </div>
        </div>`).join('');
        
        // Bind events
        document.getElementById('btn-add-account').addEventListener('click', () => {
            window.location.hash = '#/login'; // Simple redirect to OAuth page layout mapping
        });
        
        document.querySelectorAll('.btn-del-acc').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                await Accounts.remove(id);
                renderAccounts(container); // reload
            });
        });
        
        if (window.refreshIcons) window.refreshIcons();
        
  } catch (error) {
    console.error(error);
  }
}
