// ============================================================
// Workspace Switcher — Frontend UI Component
// Switch between Agency workspaces with data isolation
// ============================================================

import { api } from '../assets/api-client.js';

export function initWorkspaceSwitcher() {
    const header = document.querySelector('.header-actions') || document.querySelector('header');
    if (!header || document.getElementById('ws-switcher')) return;

    const btn = document.createElement('div');
    btn.id = 'ws-switcher';
    btn.innerHTML = `
        <button id="ws-toggle" class="ws-toggle-btn" title="Switch Workspace">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>
            <span id="ws-name">Personal</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div id="ws-dropdown" class="ws-dropdown hidden">
            <div id="ws-list" class="ws-list"></div>
            <div class="ws-divider"></div>
            <button id="ws-create" class="ws-create-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Tạo Workspace Mới
            </button>
        </div>
    `;
    // Insert before profile area
    const profileArea = header.querySelector('.profile-area') || header.lastElementChild;
    if (profileArea) header.insertBefore(btn, profileArea);
    else header.appendChild(btn);

    injectStyles();
    loadWorkspaces();

    document.getElementById('ws-toggle').onclick = () => {
        document.getElementById('ws-dropdown').classList.toggle('hidden');
    };

    document.getElementById('ws-create').onclick = createWorkspace;

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!btn.contains(e.target)) {
            document.getElementById('ws-dropdown')?.classList.add('hidden');
        }
    });
}

async function loadWorkspaces() {
    try {
        const res = await api.get('/agency/workspaces');
        const workspaces = res.data || [];
        const activeId = localStorage.getItem('activeWorkspaceId') || 'default';

        const list = document.getElementById('ws-list');
        if (!list) return;

        list.innerHTML = workspaces.map(ws => `
            <button class="ws-item ${ws.id === activeId ? 'ws-active' : ''}" data-id="${ws.id}">
                <span class="ws-icon">${ws.type === 'agency' ? '🏢' : ws.type === 'team' ? '👥' : '👤'}</span>
                <span class="ws-item-name">${ws.name}</span>
                ${ws.id === activeId ? '<span class="ws-check">✓</span>' : ''}
            </button>
        `).join('');

        // Update header display
        const active = workspaces.find(w => w.id === activeId);
        if (active) {
            document.getElementById('ws-name').textContent = active.name;
        }

        // Click handlers
        list.querySelectorAll('.ws-item').forEach(item => {
            item.onclick = () => switchWorkspace(item.dataset.id);
        });
    } catch (e) {
        console.log('[WorkspaceSwitcher] Could not load workspaces:', e.message);
    }
}

async function switchWorkspace(id) {
    try {
        const res = await api.post(`/agency/workspaces/${id}/switch`);
        if (res.success) {
            localStorage.setItem('activeWorkspaceId', id);
            document.getElementById('ws-dropdown')?.classList.add('hidden');
            
            // Emit workspace join on socket
            if (window._socket) {
                window._socket.emit('join:workspace', id);
            }

            window.Toast?.show(`Đã chuyển workspace: ${res.data.workspace.name}`, 'success');
            
            // Reload current page data
            setTimeout(() => location.reload(), 300);
        }
    } catch (e) {
        window.Toast?.show(e.message, 'error');
    }
}

async function createWorkspace() {
    const name = prompt('Tên Workspace mới:');
    if (!name) return;

    const type = prompt('Loại workspace (personal/team/agency):', 'team') || 'team';

    try {
        const res = await api.post('/agency/workspaces', { name, type });
        if (res.data) {
            window.Toast?.show(`Workspace "${name}" đã tạo!`, 'success');
            await loadWorkspaces();
        }
    } catch (e) {
        window.Toast?.show(e.message, 'error');
    }
}

function injectStyles() {
    if (document.getElementById('ws-styles')) return;
    const style = document.createElement('style');
    style.id = 'ws-styles';
    style.textContent = `
    #ws-switcher { position:relative;margin-right:12px; }
    .ws-toggle-btn { display:flex;align-items:center;gap:6px;padding:6px 12px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:10px;color:var(--color-text);font-size:13px;cursor:pointer;transition:all 150ms;font-family:inherit; }
    .ws-toggle-btn:hover { background:var(--color-surface-hover);border-color:var(--color-primary); }
    .ws-dropdown { position:absolute;top:calc(100% + 6px);right:0;width:260px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:14px;box-shadow:var(--shadow-lg);z-index:9999;padding:6px;animation:wsSlide .15s ease; }
    .ws-dropdown.hidden { display:none; }
    .ws-list { max-height:240px;overflow-y:auto; }
    .ws-item { display:flex;align-items:center;gap:8px;width:100%;padding:10px 12px;background:none;border:none;border-radius:10px;color:var(--color-text);font-size:13px;cursor:pointer;text-align:left;transition:background 100ms;font-family:inherit; }
    .ws-item:hover { background:var(--color-surface-hover); }
    .ws-active { background:rgba(var(--color-primary-rgb,99,102,241),0.1);font-weight:600; }
    .ws-icon { font-size:16px; }
    .ws-check { margin-left:auto;color:var(--color-primary);font-weight:700; }
    .ws-divider { height:1px;background:var(--color-border);margin:4px 0; }
    .ws-create-btn { display:flex;align-items:center;gap:8px;width:100%;padding:10px 12px;background:none;border:none;border-radius:10px;color:var(--color-primary);font-size:13px;cursor:pointer;font-family:inherit;transition:background 100ms; }
    .ws-create-btn:hover { background:rgba(var(--color-primary-rgb,99,102,241),0.08); }
    @keyframes wsSlide { from { opacity:0;transform:translateY(-4px); } to { opacity:1;transform:translateY(0); } }
    `;
    document.head.appendChild(style);
}

// Auto-inject X-Workspace-Id header on all API calls
const origFetch = window.fetch;
window.fetch = function(url, opts = {}) {
    const wsId = localStorage.getItem('activeWorkspaceId');
    if (wsId && typeof url === 'string' && url.includes('/api/')) {
        opts.headers = opts.headers || {};
        if (opts.headers instanceof Headers) {
            opts.headers.set('X-Workspace-Id', wsId);
        } else {
            opts.headers['X-Workspace-Id'] = wsId;
        }
    }
    return origFetch.call(this, url, opts);
};
