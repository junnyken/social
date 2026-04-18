import { Accounts, Auth } from '../api-client.js';
import { statusBadge } from './dashboard.view.js';

export async function renderAccounts(container) {
  container.innerHTML = `
    <div class="flex-col">
        <!-- New SproutSocial-like Connect Profile Section -->
        <div class="card" style="padding:var(--space-6);margin-bottom:var(--space-4);text-align:center;background:linear-gradient(to right, #f8fafc, #eff6ff);border:1px solid #bfdbfe;">
            <p style="text-transform:uppercase;font-size:0.75rem;font-weight:700;letter-spacing:1px;color:var(--color-text-muted);margin-bottom:var(--space-2)">Connect Profiles</p>
            <div style="display:flex;gap:4px;justify-content:center;margin-bottom:var(--space-4)">
                <div style="height:3px;width:30px;background:var(--color-primary);border-radius:2px"></div>
                <div style="height:3px;width:30px;background:var(--color-primary);border-radius:2px;opacity:0.6"></div>
                <div style="height:3px;width:30px;background:var(--color-primary);border-radius:2px;opacity:0.3"></div>
                <div style="height:3px;width:30px;background:#e2e8f0;border-radius:2px"></div>
                <div style="height:3px;width:30px;background:#e2e8f0;border-radius:2px"></div>
            </div>
            
            <h2 style="font-size:1.75rem;font-weight:800;margin-bottom:var(--space-2);color:#0f172a">Connect a profile</h2>
            <p style="color:var(--color-text-muted);margin-bottom:var(--space-4);font-size:1rem;">Attach a profile to see how FB AutoPoster can help grow your business.</p>
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);max-width:500px;margin:0 auto var(--space-4)">
                
                <button class="btn" id="btn-add-fb" style="display:flex;align-items:center;justify-content:center;gap:12px;padding:16px;background:white;border:2px solid #1877f2;border-radius:8px;font-weight:600;color:#0f172a;cursor:pointer;transition:all 0.2s">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    Facebook Page
                </button>
                
                <button class="btn" style="display:flex;align-items:center;justify-content:center;gap:12px;padding:16px;background:white;border:2px solid #e1306c;border-radius:8px;font-weight:600;color:#0f172a;cursor:pointer;opacity:0.7">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e1306c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                    Instagram Profile
                </button>

                <button class="btn" style="display:flex;align-items:center;justify-content:center;gap:12px;padding:16px;background:white;border:2px solid #0077b5;border-radius:8px;font-weight:600;color:#0f172a;cursor:pointer;opacity:0.7">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#0077b5"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    LinkedIn Page
                </button>

                <button class="btn" style="display:flex;align-items:center;justify-content:center;gap:12px;padding:16px;background:white;border:2px solid #000;border-radius:8px;font-weight:600;color:#0f172a;cursor:pointer;opacity:0.7">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#000"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    X Profile
                </button>
            </div>
            <p style="font-size:0.85rem;color:var(--color-text-muted)">You can connect more profiles and networks later.</p>
        </div>

        <div class="flex-between" style="margin-top:var(--space-4)"><h2>Manage Accounts</h2></div>
        <div class="grid-3" id="accounts-grid" style="margin-top:var(--space-4)">Loading...</div>
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
        const btnAddFb = document.getElementById('btn-add-fb');
        if (btnAddFb) {
            btnAddFb.addEventListener('click', async () => {
                // Fetch the actual login URL from backend, which includes all required scopes
                try {
                    const res = await fetch('/api/v1/auth/login-url');
                    const data = await res.json();
                    if (data.success && data.loginUrl) {
                        window.location.href = data.loginUrl;
                    } else {
                        // Fallback to simple local logic
                        window.location.hash = '#/login';
                    }
                } catch {
                    window.location.hash = '#/login';
                }
            });
        }
        
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
