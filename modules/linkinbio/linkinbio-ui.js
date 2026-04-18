// ============================================================
// Link-in-Bio Builder UI — Ω2
// ============================================================

import { api } from '../../assets/api-client.js';

export function renderLinkInBio(container) {
    container.innerHTML = shell();
    load(container);
}

function shell() {
    return `
    <div style="padding:24px;max-width:1200px;margin:0 auto;font-family:'Satoshi',sans-serif;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;">
            <div>
                <div style="display:inline-block;padding:4px 12px;background:rgba(139,92,246,0.15);color:#a78bfa;border-radius:20px;font-size:11px;font-weight:700;margin-bottom:8px;">🔗 LINK-IN-BIO</div>
                <h1 style="font-size:26px;font-weight:700;color:#f1f5f9;margin:0;">Bio Page Builder</h1>
                <p style="color:#94a3b8;font-size:14px;margin-top:4px;">Tạo landing page cho Instagram/TikTok bio — thay thế Linktree</p>
            </div>
            <button id="create-bio-btn" style="padding:10px 20px;background:#8b5cf6;color:white;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;">➕ Tạo Bio Page</button>
        </div>
        <div id="bio-pages"></div>
    </div>`;
}

async function load(container) {
    try {
        const res = await api.get('/bio');
        renderPages(container.querySelector('#bio-pages'), res.data, container);
    } catch (e) {
        container.querySelector('#bio-pages').innerHTML = `<div style="padding:16px;background:rgba(239,68,68,0.1);border-radius:10px;color:#f87171;">❌ ${e.message}</div>`;
    }
    container.querySelector('#create-bio-btn').onclick = () => showCreateModal(container);
}

function renderPages(el, pages, container) {
    if (!pages.length) {
        el.innerHTML = `<div style="text-align:center;padding:60px;color:#94a3b8;"><div style="font-size:48px;margin-bottom:16px;">🔗</div><div style="font-size:16px;font-weight:600;">Chưa có Bio Page nào</div><div style="font-size:13px;margin-top:4px;">Tạo trang link-in-bio đầu tiên</div></div>`;
        return;
    }

    el.innerHTML = pages.map(p => `
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:20px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <div>
                <h3 style="margin:0;font-size:16px;color:#f1f5f9;">${p.title}</h3>
                <div style="font-size:12px;color:#64748b;margin-top:4px;">
                    🔗 <a href="/api/v1/bio/p/${p.slug}" target="_blank" style="color:#60a5fa;text-decoration:none;">/bio/p/${p.slug}</a>
                    · 👁️ ${p.analytics.totalViews} views · 🖱️ ${p.analytics.totalClicks} clicks
                </div>
            </div>
            <div style="display:flex;gap:8px;">
                <a href="/api/v1/bio/p/${p.slug}" target="_blank" style="padding:6px 14px;background:#8b5cf6;color:white;border:none;border-radius:8px;font-size:12px;cursor:pointer;text-decoration:none;">👁️ Preview</a>
                <button onclick="window._addBioLink('${p.id}')" style="padding:6px 14px;background:#10b981;color:white;border:none;border-radius:8px;font-size:12px;cursor:pointer;">+ Link</button>
                <button onclick="window._delBio('${p.id}')" style="padding:6px 14px;background:#ef4444;color:white;border:none;border-radius:8px;font-size:12px;cursor:pointer;">🗑️</button>
            </div>
        </div>
        
        <!-- Links list -->
        <div style="display:grid;gap:6px;">
            ${p.links.length === 0 ? '<div style="font-size:13px;color:#64748b;text-align:center;padding:12px;">Chưa có link. Nhấn "+ Link" để thêm.</div>' :
            p.links.map(l => `
                <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(255,255,255,0.02);border-radius:10px;border:1px solid rgba(255,255,255,0.04);">
                    <span style="font-size:18px;">${l.icon}</span>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:13px;color:#f1f5f9;font-weight:600;">${l.title}</div>
                        <div style="font-size:11px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${l.url}</div>
                    </div>
                    <div style="font-size:12px;color:#94a3b8;">🖱️ ${l.clicks}</div>
                    <button onclick="window._delBioLink('${p.id}','${l.id}')" style="padding:2px 8px;background:transparent;color:#94a3b8;border:1px solid rgba(255,255,255,0.1);border-radius:6px;font-size:11px;cursor:pointer;">✕</button>
                </div>
            `).join('')}
        </div>
    </div>`).join('');

    window._addBioLink = async (pageId) => {
        const title = prompt('Tên link:');
        if (!title) return;
        const url = prompt('URL:');
        if (!url) return;
        const icon = prompt('Icon (emoji):', '🔗') || '🔗';
        try { await api.post(`/bio/${pageId}/links`, { title, url, icon }); load(container); } catch(e){alert(e.message);}
    };
    window._delBioLink = async (pageId, linkId) => {
        if(confirm('Xóa link này?')){ try{await api.delete(`/bio/${pageId}/links/${linkId}`);load(container);}catch(e){alert(e.message);}}
    };
    window._delBio = async (id) => {
        if(confirm('Xóa trang bio này?')){ try{await api.delete(`/bio/${id}`);load(container);}catch(e){alert(e.message);}}
    };
}

function showCreateModal(container) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
    overlay.innerHTML = `
    <div style="background:#1a1d24;border:1px solid rgba(255,255,255,0.1);border-radius:20px;width:480px;padding:28px;">
        <h2 style="margin:0 0 20px;color:#f1f5f9;font-size:20px;">🔗 Tạo Bio Page</h2>
        
        <label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px;">Title</label>
        <input id="bio-title" type="text" placeholder="VD: @myshop" style="${inputStyle()};width:100%;margin-bottom:12px;">
        
        <label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px;">Bio text</label>
        <input id="bio-text" type="text" placeholder="Mô tả ngắn..." style="${inputStyle()};width:100%;margin-bottom:12px;">
        
        <label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px;">Slug (URL path)</label>
        <input id="bio-slug" type="text" placeholder="myshop" style="${inputStyle()};width:100%;margin-bottom:16px;">

        <div style="display:flex;gap:12px;margin-bottom:16px;">
            <div><label style="font-size:12px;color:#94a3b8;">Instagram</label><input id="bio-ig" type="text" placeholder="@username" style="${inputStyle()};width:100%;"></div>
            <div><label style="font-size:12px;color:#94a3b8;">TikTok</label><input id="bio-tt" type="text" placeholder="@username" style="${inputStyle()};width:100%;"></div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:12px;">
            <button id="cancel-bio" style="padding:10px 20px;background:#6b7280;color:white;border:none;border-radius:10px;font-size:13px;cursor:pointer;">Hủy</button>
            <button id="save-bio" style="padding:10px 20px;background:#8b5cf6;color:white;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;">🔗 Tạo Page</button>
        </div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#cancel-bio').onclick = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#save-bio').onclick = async () => {
        try {
            await api.post('/bio', {
                title: overlay.querySelector('#bio-title').value || 'My Links',
                bio: overlay.querySelector('#bio-text').value || '',
                slug: overlay.querySelector('#bio-slug').value || '',
                instagram: overlay.querySelector('#bio-ig').value || '',
                tiktok: overlay.querySelector('#bio-tt').value || ''
            });
            overlay.remove();
            load(container);
        } catch (e) { alert(e.message); }
    };
}

function inputStyle() { return 'padding:10px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#f1f5f9;font-size:13px;outline:none;'; }
