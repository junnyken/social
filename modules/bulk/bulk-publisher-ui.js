// ============================================================
// Multi-Platform Bulk Publisher — Phase Y Frontend
// ============================================================

import { api } from '../../assets/api-client.js';

export function renderBulkPublisher(container) {
    container.innerHTML = buildShell();
    loadCampaigns(container);
    return () => {};
}

function buildShell() {
    return `
    <div style="padding:24px;max-width:1200px;margin:0 auto;font-family:'Satoshi',sans-serif;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;">
            <div>
                <div style="display:inline-block;padding:4px 12px;background:rgba(59,130,246,0.15);color:#60a5fa;border-radius:20px;font-size:11px;font-weight:700;margin-bottom:8px;">🚀 MULTI-PLATFORM</div>
                <h1 style="font-size:26px;font-weight:700;color:#f1f5f9;margin:0;">Bulk Publisher</h1>
                <p style="color:#94a3b8;font-size:14px;margin-top:4px;">Đăng bài đồng thời lên nhiều nền tảng với nội dung tuỳ chỉnh riêng</p>
            </div>
            <button id="create-campaign-btn" style="${btnStyle('#3b82f6')}">➕ Tạo Campaign</button>
        </div>

        <div id="bulk-stats" style="margin-bottom:24px;"></div>
        <div id="bulk-campaigns"></div>
    </div>`;
}

async function loadCampaigns(container) {
    try {
        const [statsRes, campsRes] = await Promise.all([
            api.get('/bulk-publish/stats'),
            api.get('/bulk-publish')
        ]);
        renderBulkStats(container.querySelector('#bulk-stats'), statsRes.data);
        renderCampaignsList(container.querySelector('#bulk-campaigns'), campsRes.data, container);
    } catch (e) {
        container.querySelector('#bulk-campaigns').innerHTML = errorHTML(e.message);
    }

    container.querySelector('#create-campaign-btn').onclick = () => showCreateCampaignModal(container);
}

function renderBulkStats(el, stats) {
    const platforms = Object.entries(stats.platformCounts || {});
    const platformBadges = platforms.map(([p, c]) => {
        const colors = { facebook: '#1877F2', instagram: '#E4405F', twitter: '#1DA1F2', linkedin: '#0A66C2', tiktok: '#000', youtube: '#FF0000' };
        return `<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;background:${colors[p] || '#6b7280'}22;color:${colors[p] || '#94a3b8'};margin-right:4px;">${p}: ${c}</span>`;
    }).join('');

    el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;">
        ${kpi('📦', 'Total Campaigns', stats.total)}
        ${kpi('✅', 'Published', stats.published, '#10b981')}
        ${kpi('📝', 'Draft', stats.draft)}
        ${kpi('📊', 'Total Posts', stats.totalPosts, '#3b82f6')}
    </div>
    ${platforms.length ? `<div style="padding:10px 16px;background:rgba(255,255,255,0.03);border-radius:10px;font-size:12px;color:#94a3b8;">Platforms: ${platformBadges}</div>` : ''}`;
}

function kpi(icon, label, value, color = '#94a3b8') {
    return `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:20px;">${icon}</div>
        <div style="font-size:22px;font-weight:800;color:${color};margin:6px 0;">${value}</div>
        <div style="font-size:11px;color:#64748b;">${label}</div>
    </div>`;
}

function renderCampaignsList(el, campaigns, container) {
    if (!campaigns.length) {
        el.innerHTML = `<div style="text-align:center;padding:60px;color:#94a3b8;">
            <div style="font-size:48px;margin-bottom:16px;">🚀</div>
            <div style="font-size:16px;font-weight:600;margin-bottom:8px;">Chưa có Campaign nào</div>
            <div style="font-size:13px;">Tạo campaign mới để bắt đầu đăng bài đa nền tảng</div>
        </div>`;
        return;
    }

    const platformIcons = { facebook: '📘', instagram: '📸', twitter: '🐦', linkedin: '💼', tiktok: '🎵', youtube: '📺' };
    const statusStyles = { draft: { bg: '#6b7280', label: '📝 Draft' }, scheduled: { bg: '#f59e0b', label: '📅 Scheduled' }, publishing: { bg: '#8b5cf6', label: '⏳ Publishing...' }, completed: { bg: '#10b981', label: '✅ Done' }, partial: { bg: '#f59e0b', label: '⚠️ Partial' }, failed: { bg: '#ef4444', label: '❌ Failed' } };

    el.innerHTML = campaigns.map(camp => {
        const st = statusStyles[camp.status] || statusStyles.draft;
        return `
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:20px;margin-bottom:12px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${st.bg}22;color:${st.bg};">${st.label}</span>
                    <h3 style="margin:0;font-size:15px;color:#f1f5f9;">${camp.name}</h3>
                </div>
                <div style="display:flex;gap:8px;">
                    ${camp.status === 'draft' ? `<button onclick="window._publishCamp('${camp.id}')" style="${btnStyle('#10b981','sm')}">🚀 Publish Now</button>` : ''}
                    <button onclick="window._deleteCamp('${camp.id}')" style="${btnStyle('#ef4444','sm')}">🗑️</button>
                </div>
            </div>
            <div style="font-size:13px;color:#94a3b8;margin-bottom:12px;line-height:1.6;max-height:50px;overflow:hidden;">${camp.content?.text || '<i>No content</i>'}</div>
            <div style="display:flex;gap:6px;margin-bottom:12px;">
                ${(camp.platforms || []).map(p => `<span style="padding:4px 10px;background:rgba(255,255,255,0.05);border-radius:8px;font-size:12px;color:#f1f5f9;">${platformIcons[p] || '📱'} ${p}</span>`).join('')}
            </div>
            ${camp.results?.length ? `
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;">
                    ${camp.results.map(r => `
                        <div style="padding:10px;background:${r.status === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)'};border-radius:8px;">
                            <div style="font-size:12px;color:${r.status === 'success' ? '#10b981' : '#ef4444'};font-weight:700;">${platformIcons[r.platform] || '📱'} ${r.platform} — ${r.status === 'success' ? '✅' : '❌'}</div>
                            ${r.url ? `<div style="font-size:10px;color:#64748b;margin-top:4px;word-break:break-all;">${r.url}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>`;
    }).join('');

    window._publishCamp = async (id) => {
        try { await api.post(`/bulk-publish/${id}/publish`); loadCampaigns(container); } catch (e) { alert(e.message); }
    };
    window._deleteCamp = async (id) => {
        if (confirm('Xóa campaign này?')) {
            try { await api.delete(`/bulk-publish/${id}`); loadCampaigns(container); } catch (e) { alert(e.message); }
        }
    };
}

function showCreateCampaignModal(container) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
    overlay.innerHTML = `
    <div style="background:#1a1d24;border:1px solid rgba(255,255,255,0.1);border-radius:20px;width:560px;max-height:90vh;overflow-y:auto;padding:28px;">
        <h2 style="margin:0 0 20px;color:#f1f5f9;font-size:20px;">🚀 Tạo Campaign đa nền tảng</h2>
        
        <label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px;">Tên Campaign</label>
        <input id="camp-name" type="text" placeholder="VD: Promo Tháng 5" style="${inputStyle()};width:100%;margin-bottom:16px;">

        <label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px;">Nội dung chính</label>
        <textarea id="camp-text" placeholder="Nội dung bài đăng..." style="${textareaStyle()};min-height:100px;margin-bottom:16px;"></textarea>

        <label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:8px;">Chọn nền tảng</label>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;">
            ${['facebook','instagram','twitter','linkedin','tiktok','youtube'].map(p => `
                <label style="display:flex;align-items:center;gap:6px;padding:8px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;cursor:pointer;font-size:13px;color:#f1f5f9;">
                    <input type="checkbox" value="${p}" class="camp-platform" ${p === 'facebook' ? 'checked' : ''}>
                    ${{ facebook: '📘', instagram: '📸', twitter: '🐦', linkedin: '💼', tiktok: '🎵', youtube: '📺' }[p]} ${p}
                </label>
            `).join('')}
        </div>

        <div style="display:flex;justify-content:flex-end;gap:12px;">
            <button id="cancel-camp" style="${btnStyle('#6b7280')}">Hủy</button>
            <button id="save-camp" style="${btnStyle('#3b82f6')}">🚀 Tạo Campaign</button>
        </div>
    </div>`;

    document.body.appendChild(overlay);

    overlay.querySelector('#cancel-camp').onclick = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#save-camp').onclick = async () => {
        const name = overlay.querySelector('#camp-name').value.trim();
        const text = overlay.querySelector('#camp-text').value.trim();
        const platforms = [...overlay.querySelectorAll('.camp-platform:checked')].map(c => c.value);

        if (!text) { alert('Nhập nội dung bài đăng!'); return; }
        if (!platforms.length) { alert('Chọn ít nhất 1 nền tảng!'); return; }

        try {
            await api.post('/bulk-publish', { name: name || 'Campaign', text, platforms });
            overlay.remove();
            loadCampaigns(container);
        } catch (e) { alert(e.message); }
    };
}

// Style helpers
function btnStyle(color = '#3b82f6', size = 'md') {
    const p = size === 'sm' ? '6px 14px' : '10px 20px';
    const f = size === 'sm' ? '12px' : '13px';
    return `padding:${p};background:${color};color:white;border:none;border-radius:10px;font-size:${f};font-weight:600;cursor:pointer;`;
}
function inputStyle() { return 'padding:10px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#f1f5f9;font-size:13px;outline:none;'; }
function textareaStyle() { return 'width:100%;padding:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#f1f5f9;font-size:13px;outline:none;resize:vertical;font-family:inherit;'; }
function errorHTML(msg) { return `<div style="padding:16px;background:rgba(239,68,68,0.1);border-radius:10px;color:#f87171;font-size:13px;">❌ ${msg}</div>`; }
