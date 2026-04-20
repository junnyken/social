// ============================================================
// White-Label Reports UI — Theme-Aware
// ============================================================

import { api } from '../../assets/api-client.js';

export function renderReportsUI(container) {
    container.innerHTML = shell();
    load(container);
}

function shell() {
    return `
    <div class="rpt-module">
        <div class="rpt-header">
            <div>
                <div class="rpt-badge">📄 WHITE-LABEL</div>
                <h1 class="rpt-title">Branded Reports</h1>
                <p class="rpt-subtitle">Tạo báo cáo PDF branded gửi khách hàng agency</p>
            </div>
            <button id="gen-report-btn" class="rpt-btn rpt-btn-amber">📄 Tạo Report Mới</button>
        </div>
        <div id="rpt-list"></div>
    </div>
    <style>
    .rpt-module { padding:24px;max-width:1200px;margin:0 auto;font-family:var(--font-body,'Satoshi',sans-serif); }
    .rpt-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:12px; }
    .rpt-title { font-size:26px;font-weight:700;color:var(--color-text);margin:0; }
    .rpt-subtitle { color:var(--color-text-muted);font-size:14px;margin-top:4px; }
    .rpt-badge { display:inline-block;padding:4px 12px;background:rgba(245,158,11,0.15);color:#f59e0b;border-radius:20px;font-size:11px;font-weight:700;margin-bottom:8px; }
    .rpt-btn { padding:10px 20px;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;transition:all 150ms; }
    .rpt-btn:hover { filter:brightness(1.1);transform:translateY(-1px); }
    .rpt-btn-amber { background:#f59e0b;color:white; }
    .rpt-btn-blue { background:#3b82f6;color:white; }
    .rpt-btn-red { background:#ef4444;color:white; }
    .rpt-btn-ghost { background:var(--color-surface-hover);color:var(--color-text);border:1px solid var(--color-border); }
    .rpt-btn-sm { padding:6px 14px;font-size:12px; }
    .rpt-card { background:var(--color-surface);border:1px solid var(--color-border);border-radius:16px;padding:20px;margin-bottom:12px;transition:box-shadow 200ms;animation:rptFadeIn .3s ease; }
    .rpt-card:hover { box-shadow:var(--shadow-md); }
    .rpt-mini-grid { display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-top:14px; }
    @media(max-width:768px) { .rpt-mini-grid { grid-template-columns:repeat(3,1fr); } }
    .rpt-mini-kpi { text-align:center;padding:8px;background:var(--color-surface-hover);border-radius:8px; }
    .rpt-mini-kpi-val { font-size:14px;font-weight:700;color:var(--color-text); }
    .rpt-mini-kpi-label { font-size:10px;color:var(--color-text-muted); }
    .rpt-empty { text-align:center;padding:60px;color:var(--color-text-muted); }
    .rpt-input { padding:10px 16px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:10px;color:var(--color-text);font-size:13px;outline:none; }
    @keyframes rptFadeIn { from { opacity:0;transform:translateY(8px); } to { opacity:1;transform:translateY(0); } }
    </style>`;
}

async function load(container) {
    try {
        const res = await api.get('/reports');
        renderList(container.querySelector('#rpt-list'), res.data, container);
    } catch (e) {
        container.querySelector('#rpt-list').innerHTML = `<div style="padding:16px;background:rgba(239,68,68,0.1);border-radius:10px;color:#f87171;">❌ ${e.message}</div>`;
    }
    container.querySelector('#gen-report-btn').onclick = () => showGenerateModal(container);
}

function renderList(el, reports, container) {
    if (!reports.length) {
        el.innerHTML = `<div class="rpt-empty"><div style="font-size:48px;margin-bottom:16px;">📄</div><div style="font-size:16px;font-weight:600;">Chưa có Report nào</div><div style="font-size:13px;margin-top:4px;">Tạo report mới có branding riêng cho agency/client</div></div>`;
        return;
    }

    el.innerHTML = reports.map(r => `
    <div class="rpt-card">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
            <div>
                <h3 style="margin:0;font-size:15px;color:var(--color-text);">${esc(r.title)}</h3>
                <div style="font-size:12px;color:var(--color-text-muted);margin-top:4px;">
                    🏢 ${esc(r.branding?.companyName || '')} ${r.branding?.clientName ? `→ 👤 ${esc(r.branding.clientName)}` : ''}
                    · 📅 ${r.period?.from || '?'} → ${r.period?.to || '?'}
                </div>
            </div>
            <div style="display:flex;gap:8px;">
                <a href="/api/v1/reports/${r.id}/html" target="_blank" class="rpt-btn rpt-btn-blue rpt-btn-sm" style="text-decoration:none;display:inline-block;">🖨️ View & Print</a>
                <button onclick="window._delRpt('${r.id}')" class="rpt-btn rpt-btn-red rpt-btn-sm">🗑️</button>
            </div>
        </div>
        <div class="rpt-mini-grid">
            ${miniKpi('📝', r.summary?.totalPosts, 'Posts')}
            ${miniKpi('👍', r.summary?.totalLikes, 'Likes')}
            ${miniKpi('💬', r.summary?.totalComments, 'Comments')}
            ${miniKpi('🔄', r.summary?.totalShares, 'Shares')}
            ${miniKpi('👁️', r.summary?.totalReach, 'Reach')}
            ${miniKpi('📊', (r.summary?.avgEngagement || 0) + '%', 'ER')}
        </div>
    </div>`).join('');

    window._delRpt = async (id) => {
        if (confirm('Xóa report?')) {
            try { await api.delete(`/reports/${id}`); load(container); } catch (e) { window.Toast?.show(e.message, 'error'); }
        }
    };
}

function miniKpi(icon, value, label) {
    return `<div class="rpt-mini-kpi"><div style="font-size:14px;">${icon}</div><div class="rpt-mini-kpi-val">${value || 0}</div><div class="rpt-mini-kpi-label">${label}</div></div>`;
}

function showGenerateModal(container) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
    overlay.innerHTML = `
    <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:20px;width:500px;max-height:90vh;overflow-y:auto;padding:28px;">
        <h2 style="margin:0 0 20px;color:var(--color-text);font-size:20px;">📄 Tạo Branded Report</h2>

        <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">Tiêu đề Report</label>
        <input id="rpt-title" type="text" placeholder="VD: Monthly Social Report" class="rpt-input" style="width:100%;margin-bottom:12px;">

        <div style="display:flex;gap:12px;margin-bottom:12px;">
            <div style="flex:1;">
                <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">Tên Agency/Công ty</label>
                <input id="rpt-company" type="text" placeholder="Your Agency Name" class="rpt-input" style="width:100%;">
            </div>
            <div style="flex:1;">
                <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">Tên Khách hàng</label>
                <input id="rpt-client" type="text" placeholder="Client Name" class="rpt-input" style="width:100%;">
            </div>
        </div>

        <div style="display:flex;gap:12px;margin-bottom:12px;">
            <div style="flex:1;">
                <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">Màu chủ đạo</label>
                <input id="rpt-color" type="color" value="#1e3a5f" style="width:100%;height:36px;border:none;border-radius:8px;cursor:pointer;">
            </div>
            <div style="flex:1;">
                <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">Màu Accent</label>
                <input id="rpt-accent" type="color" value="#38bdf8" style="width:100%;height:36px;border:none;border-radius:8px;cursor:pointer;">
            </div>
            <div style="flex:1;">
                <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">Khoảng thời gian</label>
                <select id="rpt-range" class="rpt-input" style="width:100%;">
                    <option value="7">7 ngày</option>
                    <option value="30" selected>30 ngày</option>
                    <option value="90">90 ngày</option>
                </select>
            </div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:20px;">
            <button id="cancel-rpt" class="rpt-btn rpt-btn-ghost">Hủy</button>
            <button id="save-rpt" class="rpt-btn rpt-btn-amber">📄 Tạo Report</button>
        </div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#cancel-rpt').onclick = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#save-rpt').onclick = async () => {
        try {
            const res = await api.post('/reports/generate', {
                title: overlay.querySelector('#rpt-title').value || 'Social Media Report',
                companyName: overlay.querySelector('#rpt-company').value || 'SocialHub',
                clientName: overlay.querySelector('#rpt-client').value || '',
                primaryColor: overlay.querySelector('#rpt-color').value,
                accentColor: overlay.querySelector('#rpt-accent').value,
                range: parseInt(overlay.querySelector('#rpt-range').value)
            });
            overlay.remove();
            window.open(`/api/v1/reports/${res.data.id}/html`, '_blank');
            load(container);
            window.Toast?.show('Report đã tạo!', 'success');
        } catch (e) { window.Toast?.show(e.message, 'error'); }
    };
}

function esc(s) { return String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
