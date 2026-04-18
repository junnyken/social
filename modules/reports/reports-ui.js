// ============================================================
// White-Label Reports UI — Ω4
// ============================================================

import { api } from '../../assets/api-client.js';

export function renderReportsUI(container) {
    container.innerHTML = shell();
    load(container);
}

function shell() {
    return `
    <div style="padding:24px;max-width:1200px;margin:0 auto;font-family:'Satoshi',sans-serif;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;">
            <div>
                <div style="display:inline-block;padding:4px 12px;background:rgba(245,158,11,0.15);color:#f59e0b;border-radius:20px;font-size:11px;font-weight:700;margin-bottom:8px;">📄 WHITE-LABEL</div>
                <h1 style="font-size:26px;font-weight:700;color:#f1f5f9;margin:0;">Branded Reports</h1>
                <p style="color:#94a3b8;font-size:14px;margin-top:4px;">Tạo báo cáo PDF branded gửi khách hàng agency</p>
            </div>
            <button id="gen-report-btn" style="padding:10px 20px;background:#f59e0b;color:white;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;">📄 Tạo Report Mới</button>
        </div>
        <div id="rpt-list"></div>
    </div>`;
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
        el.innerHTML = `<div style="text-align:center;padding:60px;color:#94a3b8;"><div style="font-size:48px;margin-bottom:16px;">📄</div><div style="font-size:16px;font-weight:600;">Chưa có Report nào</div><div style="font-size:13px;margin-top:4px;">Tạo report mới có branding riêng cho agency/client</div></div>`;
        return;
    }

    el.innerHTML = reports.map(r => `
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:20px;margin-bottom:12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;">
            <div>
                <h3 style="margin:0;font-size:15px;color:#f1f5f9;">${r.title}</h3>
                <div style="font-size:12px;color:#64748b;margin-top:4px;">
                    🏢 ${r.branding.companyName} ${r.branding.clientName ? `→ 👤 ${r.branding.clientName}` : ''}
                    · 📅 ${r.period.from} → ${r.period.to}
                </div>
            </div>
            <div style="display:flex;gap:8px;">
                <a href="/api/v1/reports/${r.id}/html" target="_blank" style="padding:6px 14px;background:#3b82f6;color:white;border:none;border-radius:8px;font-size:12px;cursor:pointer;text-decoration:none;display:inline-block;">🖨️ View & Print</a>
                <button onclick="window._delRpt('${r.id}')" style="padding:6px 14px;background:#ef4444;color:white;border:none;border-radius:8px;font-size:12px;cursor:pointer;">🗑️</button>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-top:14px;">
            ${miniKpi('📝', r.summary.totalPosts, 'Posts')}
            ${miniKpi('👍', r.summary.totalLikes, 'Likes')}
            ${miniKpi('💬', r.summary.totalComments, 'Comments')}
            ${miniKpi('🔄', r.summary.totalShares, 'Shares')}
            ${miniKpi('👁️', r.summary.totalReach, 'Reach')}
            ${miniKpi('📊', r.summary.avgEngagement + '%', 'ER')}
        </div>
    </div>`).join('');

    window._delRpt = async (id) => { if(confirm('Xóa report?')){try{await api.delete(`/reports/${id}`);load(container);}catch(e){alert(e.message);}} };
}

function miniKpi(icon, value, label) {
    return `<div style="text-align:center;padding:8px;background:rgba(255,255,255,0.02);border-radius:8px;"><div style="font-size:14px;">${icon}</div><div style="font-size:14px;font-weight:700;color:#f1f5f9;">${value}</div><div style="font-size:10px;color:#64748b;">${label}</div></div>`;
}

function showGenerateModal(container) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
    overlay.innerHTML = `
    <div style="background:#1a1d24;border:1px solid rgba(255,255,255,0.1);border-radius:20px;width:500px;max-height:90vh;overflow-y:auto;padding:28px;">
        <h2 style="margin:0 0 20px;color:#f1f5f9;font-size:20px;">📄 Tạo Branded Report</h2>

        <label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px;">Tiêu đề Report</label>
        <input id="rpt-title" type="text" placeholder="VD: Monthly Social Report" style="${inputStyle()};width:100%;margin-bottom:12px;">

        <div style="display:flex;gap:12px;margin-bottom:12px;">
            <div style="flex:1;"><label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px;">Tên Agency/Công ty</label>
                <input id="rpt-company" type="text" placeholder="Your Agency Name" style="${inputStyle()};width:100%;"></div>
            <div style="flex:1;"><label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px;">Tên Khách hàng</label>
                <input id="rpt-client" type="text" placeholder="Client Name" style="${inputStyle()};width:100%;"></div>
        </div>

        <div style="display:flex;gap:12px;margin-bottom:12px;">
            <div style="flex:1;"><label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px;">Màu chủ đạo</label>
                <input id="rpt-color" type="color" value="#1e3a5f" style="width:100%;height:36px;border:none;border-radius:8px;cursor:pointer;"></div>
            <div style="flex:1;"><label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px;">Màu Accent</label>
                <input id="rpt-accent" type="color" value="#38bdf8" style="width:100%;height:36px;border:none;border-radius:8px;cursor:pointer;"></div>
            <div style="flex:1;"><label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px;">Khoảng thời gian</label>
                <select id="rpt-range" style="${inputStyle()};width:100%;">
                    <option value="7">7 ngày</option><option value="30" selected>30 ngày</option><option value="90">90 ngày</option>
                </select></div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:20px;">
            <button id="cancel-rpt" style="padding:10px 20px;background:#6b7280;color:white;border:none;border-radius:10px;font-size:13px;cursor:pointer;">Hủy</button>
            <button id="save-rpt" style="padding:10px 20px;background:#f59e0b;color:white;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;">📄 Tạo Report</button>
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
            // Open the HTML report in new tab
            window.open(`/api/v1/reports/${res.data.id}/html`, '_blank');
            load(container);
        } catch (e) { alert(e.message); }
    };
}

function inputStyle() { return 'padding:10px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#f1f5f9;font-size:13px;outline:none;'; }
