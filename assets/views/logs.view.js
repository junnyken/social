import { Logs } from '../api-client.js';
import { timeAgo, statusBadge } from './dashboard.view.js';

let currentFilters = { page: 0, limit: 20, status: '', accountId: '' };

export async function renderLogs(container) {
  container.innerHTML = `
        <div class="flex-col">
            <div class="flex-between"><h2>Activity Logs</h2><button class="btn btn-secondary btn-md" id="btn-export"><i data-lucide="download" width="16" height="16"></i> Export CSV</button></div>
            <div class="card" style="padding:var(--space-4)">
                <div style="display:flex;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-4)">
                    <input class="field-input" style="width:200px;min-height:36px" placeholder="Search content..." id="log-search">
                    <select class="field-select" style="width:140px;min-height:36px" id="log-status-filter"><option value="">All Statuses</option><option value="success">Success</option><option value="pending">Pending</option><option value="failed">Failed</option></select>
                    <select class="field-select" style="width:180px;min-height:36px" id="log-account-filter"><option value="">All Accounts</option></select>
                </div>
                <div class="tbl-wrap" style="max-height:480px;overflow-y:auto"><table class="tbl"><thead><tr><th>#</th><th>Time</th><th>Account</th><th>Target</th><th>Content</th><th>Status</th></tr></thead><tbody id="logs-tbody"></tbody></table></div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:var(--space-4);padding-top:var(--space-3);border-top:1px solid var(--color-border)">
                    <span style="font-size:var(--text-xs);color:var(--color-text-muted)" id="logs-info"></span>
                    <div style="display:flex;gap:var(--space-2)"><button class="btn btn-ghost btn-sm" id="logs-prev">Previous</button><button class="btn btn-ghost btn-sm" id="logs-next">Next</button></div>
                </div>
            </div>
        </div>
  `;

  await fetchAndRenderLogs();

  document.getElementById('log-search').addEventListener('input', e => { currentFilters.q = e.target.value.toLowerCase(); fetchAndRenderLogs(); });
  document.getElementById('log-status-filter').addEventListener('change', e => { currentFilters.status = e.target.value; fetchAndRenderLogs(); });
  document.getElementById('log-account-filter').addEventListener('change', e => { currentFilters.accountId = e.target.value; fetchAndRenderLogs(); });
  document.getElementById('btn-export').addEventListener('click', () => Logs.export(currentFilters));
  
  document.getElementById('logs-prev').addEventListener('click', () => { if(currentFilters.page>0){ currentFilters.page--; fetchAndRenderLogs(); } });
  document.getElementById('logs-next').addEventListener('click', () => { currentFilters.page++; fetchAndRenderLogs(); });
}

async function fetchAndRenderLogs() {
    try {
        const res = await Logs.list();
        let logs = res.data || [];
        
        // Simulate client side filtering for now based on full dataset
        if(currentFilters.q) logs = logs.filter(l => l.content.toLowerCase().includes(currentFilters.q) || l.target?.name?.toLowerCase().includes(currentFilters.q));
        if(currentFilters.status) logs = logs.filter(l => l.status === currentFilters.status);
        if(currentFilters.accountId) logs = logs.filter(l => l.accountId === currentFilters.accountId);
        
        const start = currentFilters.page * currentFilters.limit;
        const slice = logs.slice(start, start + currentFilters.limit);
        
        // Pop account list
        const accts = [...new Set(logs.map(l => l.accountId).filter(Boolean))];
        const afilt = document.getElementById('log-account-filter');
        if (afilt && afilt.options.length <= 1) {
            afilt.innerHTML = '<option value="">All Accounts</option>' + accts.map(a => `<option value="${a}">${a}</option>`).join('');
            afilt.value = currentFilters.accountId;
        }

        document.getElementById('logs-tbody').innerHTML = slice.map((l,i) => `
            <tr>
                <td style="font-family:monospace;color:var(--color-text-muted)">#${String(start+i+1).padStart(3,'0')}</td>
                <td style="color:var(--color-text-muted);white-space:nowrap">${timeAgo(new Date(l.timestamp).getTime())}</td>
                <td style="font-weight:500">${l.accountId}</td>
                <td>${l.target?.name || ''}</td>
                <td><div style="max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${l.content}">${l.content}</div></td>
                <td>${statusBadge(l.status)}</td>
            </tr>`).join('');

        document.getElementById('logs-info').textContent = `Showing ${start+1}–${Math.min(start+currentFilters.limit, logs.length)} of ${logs.length}`;
        document.getElementById('logs-prev').disabled = currentFilters.page === 0;
        document.getElementById('logs-next').disabled = start + currentFilters.limit >= logs.length;
        if(window.refreshIcons) window.refreshIcons();
    } catch(e) {}
}
