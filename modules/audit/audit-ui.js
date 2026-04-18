// ============================================================
// Enterprise Audit Trail UI — Ω8
// ============================================================

import { api } from '../../assets/api-client.js';

export function renderAudit(container) {
    container.innerHTML = shell();
    load(container);
}

function shell() {
    return `
    <div style="padding:24px;max-width:1200px;margin:0 auto;font-family:'Satoshi',sans-serif;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;">
            <div>
                <div style="display:inline-block;padding:4px 12px;background:rgba(239,68,68,0.15);color:#ef4444;border-radius:20px;font-size:11px;font-weight:700;margin-bottom:8px;">📋 COMPLIANCE</div>
                <h1 style="font-size:26px;font-weight:700;color:#f1f5f9;margin:0;">Audit Logs</h1>
                <p style="color:#94a3b8;font-size:14px;margin-top:4px;">Theo dõi mọi hoạt động trong hệ thống phục vụ Data Governance</p>
            </div>
            <div style="display:flex;gap:12px;">
                <select id="filter-action" style="${inputStyle()}"><option value="">Tất cả Action</option><option value="create">🟢 Create</option><option value="update">🟡 Update</option><option value="delete">🔴 Delete</option></select>
                <button id="refresh-audit" style="padding:10px 16px;background:rgba(255,255,255,0.05);color:#f1f5f9;border:1px solid rgba(255,255,255,0.1);border-radius:10px;font-size:13px;cursor:pointer;">🔄 Refresh</button>
            </div>
        </div>
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:16px;overflow:hidden;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;text-align:left;">
                <thead>
                    <tr style="background:rgba(255,255,255,0.04);border-bottom:1px solid rgba(255,255,255,0.06);">
                        <th style="padding:14px 20px;color:#94a3b8;font-weight:600;">Timestamp</th>
                        <th style="padding:14px 20px;color:#94a3b8;font-weight:600;">User</th>
                        <th style="padding:14px 20px;color:#94a3b8;font-weight:600;">Action</th>
                        <th style="padding:14px 20px;color:#94a3b8;font-weight:600;">Resource</th>
                        <th style="padding:14px 20px;color:#94a3b8;font-weight:600;">IP Address</th>
                        <th style="padding:14px 20px;color:#94a3b8;font-weight:600;">Details</th>
                    </tr>
                </thead>
                <tbody id="audit-list"></tbody>
            </table>
        </div>
    </div>`;
}

async function load(container) {
    const action = container.querySelector('#filter-action').value;
    const q = action ? `?action=${action}` : '';
    try {
        const res = await api.get(`/audit${q}`);
        renderList(container.querySelector('#audit-list'), res.data);
    } catch (e) {
        container.querySelector('#audit-list').innerHTML = `<tr><td colspan="6" style="padding:16px;color:#f87171;text-align:center;">❌ ${e.message}</td></tr>`;
    }
    
    container.querySelector('#refresh-audit').onclick = () => load(container);
    container.querySelector('#filter-action').onchange = () => load(container);
}

function renderList(el, logs) {
    if (!logs.length) {
        el.innerHTML = `<tr><td colspan="6" style="padding:40px;text-align:center;color:#64748b;">Chưa có log nào</td></tr>`;
        return;
    }

    const actionColors = { 'create': '#10b981', 'update': '#f59e0b', 'delete': '#ef4444', 'read': '#6b7280' };

    el.innerHTML = logs.map(l => `
    <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
        <td style="padding:14px 20px;color:#94a3b8;white-space:nowrap;">${new Date(l.timestamp).toLocaleString('vi-VN')}</td>
        <td style="padding:14px 20px;color:#f1f5f9;font-weight:600;">👤 ${l.userName}</td>
        <td style="padding:14px 20px;"><span style="padding:4px 8px;border-radius:6px;font-size:11px;font-weight:700;color:${actionColors[l.action]};background:${actionColors[l.action]}20;text-transform:uppercase;">${l.action}</span></td>
        <td style="padding:14px 20px;color:#cbd5e1;">${l.details?.method || ''} ${l.details?.url || l.resource}</td>
        <td style="padding:14px 20px;color:#64748b;font-family:monospace;">${l.ipAddress}</td>
        <td style="padding:14px 20px;color:#94a3b8;"><pre style="margin:0;font-size:11px;background:rgba(0,0,0,0.2);padding:6px;border-radius:6px;">${JSON.stringify(l.details.body || {}, null, 2)}</pre></td>
    </tr>`).join('');
}

function inputStyle() { return 'padding:10px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#f1f5f9;font-size:13px;outline:none;'; }
