// ============================================================
// Link-in-Bio Builder UI — Full with Live Preview & Themes
// ============================================================

import { api } from '../../assets/api-client.js';

export function renderLinkInBio(container) {
    container.innerHTML = shell();
    load(container);
}

function shell() {
    return `
    <div class="bio-builder">
        <div class="bio-header">
            <div>
                <div class="bio-badge">🔗 LINK-IN-BIO</div>
                <h1 class="bio-title">Bio Page Builder</h1>
                <p class="bio-subtitle">Tạo landing page cho Instagram/TikTok bio — thay thế Linktree</p>
            </div>
            <button id="create-bio-btn" class="bio-btn bio-btn-purple">➕ Tạo Bio Page</button>
        </div>
        <div id="bio-pages"></div>
    </div>

    <style>
    .bio-builder { padding:24px;max-width:1200px;margin:0 auto;font-family:var(--font-body,'Satoshi',sans-serif); }
    .bio-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:12px; }
    .bio-title { font-size:26px;font-weight:700;color:var(--color-text);margin:0; }
    .bio-subtitle { color:var(--color-text-muted);font-size:14px;margin-top:4px; }
    .bio-badge { display:inline-block;padding:4px 12px;background:rgba(139,92,246,0.15);color:#a78bfa;border-radius:20px;font-size:11px;font-weight:700;margin-bottom:8px; }

    .bio-btn { padding:10px 20px;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;transition:all 150ms; }
    .bio-btn:hover { filter:brightness(1.1);transform:translateY(-1px); }
    .bio-btn-purple { background:#8b5cf6;color:white; }
    .bio-btn-green { background:#10b981;color:white; }
    .bio-btn-red { background:#ef4444;color:white; }
    .bio-btn-ghost { background:var(--color-surface-hover);color:var(--color-text);border:1px solid var(--color-border); }
    .bio-btn-sm { padding:6px 14px;font-size:12px; }

    /* Page card with split layout */
    .bio-page-card { background:var(--color-surface);border:1px solid var(--color-border);border-radius:16px;padding:24px;margin-bottom:20px;transition:box-shadow 200ms; }
    .bio-page-card:hover { box-shadow:var(--shadow-md); }
    .bio-page-top { display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:8px; }
    .bio-page-info h3 { margin:0;font-size:16px;color:var(--color-text); }
    .bio-page-meta { font-size:12px;color:var(--color-text-muted);margin-top:4px; }
    .bio-page-meta a { color:#60a5fa;text-decoration:none; }
    .bio-page-meta a:hover { text-decoration:underline; }

    .bio-split { display:grid;grid-template-columns:1fr 320px;gap:24px;align-items:start; }
    @media(max-width:768px) { .bio-split { grid-template-columns:1fr; } }

    /* Links list */
    .bio-links-list { display:grid;gap:6px; }
    .bio-link-item { display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--color-surface-hover);border-radius:10px;border:1px solid var(--color-border);transition:transform 100ms; }
    .bio-link-item:hover { transform:translateX(4px); }
    .bio-link-icon { font-size:18px; }
    .bio-link-info { flex:1;min-width:0; }
    .bio-link-title { font-size:13px;color:var(--color-text);font-weight:600; }
    .bio-link-url { font-size:11px;color:var(--color-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
    .bio-link-clicks { font-size:12px;color:var(--color-text-muted); }
    .bio-link-del { padding:2px 8px;background:transparent;color:var(--color-text-muted);border:1px solid var(--color-border);border-radius:6px;font-size:11px;cursor:pointer; }
    .bio-link-del:hover { background:rgba(239,68,68,0.1);color:#ef4444;border-color:#ef4444; }

    /* Mobile preview */
    .bio-phone-frame { width:280px;min-height:480px;border-radius:32px;border:3px solid var(--color-border);overflow:hidden;background:#0f172a;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.3); }
    .bio-phone-notch { width:120px;height:24px;background:var(--color-border);border-radius:0 0 16px 16px;margin:0 auto; }
    .bio-phone-screen { padding:20px 16px; }
    .bio-preview-avatar { width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#8b5cf6,#ec4899);margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:24px;color:white; }
    .bio-preview-name { text-align:center;font-size:16px;font-weight:700;color:#f1f5f9;margin-bottom:4px; }
    .bio-preview-desc { text-align:center;font-size:12px;color:#94a3b8;margin-bottom:20px; }
    .bio-preview-link { display:block;padding:12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:12px;color:#f1f5f9;font-size:13px;font-weight:600;text-align:center;margin-bottom:8px;transition:all 150ms;text-decoration:none; }
    .bio-preview-link:hover { background:rgba(255,255,255,0.15);transform:scale(1.02); }
    .bio-preview-socials { display:flex;justify-content:center;gap:12px;margin-top:16px;font-size:18px; }

    /* Theme pills */
    .bio-themes { display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap; }
    .bio-theme-pill { padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;border:2px solid transparent;transition:all 150ms; }
    .bio-theme-pill:hover { transform:scale(1.05); }
    .bio-theme-pill.active { border-color:white;box-shadow:0 0 0 2px rgba(139,92,246,0.5); }

    .bio-empty { text-align:center;padding:60px;color:var(--color-text-muted); }
    .bio-empty-icon { font-size:48px;margin-bottom:16px; }

    @keyframes bioFadeIn { from { opacity:0;transform:translateY(8px); } to { opacity:1;transform:translateY(0); } }
    .bio-page-card { animation: bioFadeIn .3s ease; }
    </style>`;
}

async function load(container) {
    try {
        const res = await api.get('/bio');
        renderPages(container.querySelector('#bio-pages'), res.data || [], container);
    } catch (e) {
        container.querySelector('#bio-pages').innerHTML = `<div style="padding:16px;background:rgba(239,68,68,0.1);border-radius:10px;color:#f87171;">❌ ${e.message}</div>`;
    }
    container.querySelector('#create-bio-btn').onclick = () => showCreateModal(container);
}

const THEMES = {
    default:  { bg: '#0f172a', card: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.12)', text: '#f1f5f9', sub: '#94a3b8', accent: '#8b5cf6', label: '🌑 Dark' },
    light:    { bg: '#f8fafc', card: 'rgba(0,0,0,0.04)', border: 'rgba(0,0,0,0.08)', text: '#1e293b', sub: '#64748b', accent: '#8b5cf6', label: '☀️ Light' },
    gradient: { bg: 'linear-gradient(135deg,#667eea,#764ba2)', card: 'rgba(255,255,255,0.15)', border: 'rgba(255,255,255,0.2)', text: '#fff', sub: 'rgba(255,255,255,0.7)', accent: '#fbbf24', label: '🌈 Gradient' },
    minimal:  { bg: '#ffffff', card: 'rgba(0,0,0,0.03)', border: 'rgba(0,0,0,0.06)', text: '#111827', sub: '#6b7280', accent: '#10b981', label: '✨ Minimal' },
    neon:     { bg: '#0a0a0a', card: 'rgba(0,255,136,0.06)', border: 'rgba(0,255,136,0.2)', text: '#00ff88', sub: '#4ade80', accent: '#00ff88', label: '💚 Neon' },
};

function renderPages(el, pages, container) {
    if (!pages.length) {
        el.innerHTML = `<div class="bio-empty"><div class="bio-empty-icon">🔗</div><div style="font-size:16px;font-weight:600;">Chưa có Bio Page nào</div><div style="font-size:13px;margin-top:4px;">Tạo trang link-in-bio đầu tiên</div></div>`;
        return;
    }

    el.innerHTML = pages.map(p => {
        const theme = THEMES[p.theme] || THEMES.default;
        const bgStyle = theme.bg.includes('gradient') ? `background:${theme.bg}` : `background:${theme.bg}`;

        return `
        <div class="bio-page-card" data-page-id="${p.id}">
            <div class="bio-page-top">
                <div class="bio-page-info">
                    <h3>${esc(p.title)}</h3>
                    <div class="bio-page-meta">
                        🔗 <a href="/api/v1/bio/p/${p.slug}" target="_blank">/bio/p/${p.slug}</a>
                        · 👁️ ${p.analytics?.totalViews || 0} views · 🖱️ ${p.analytics?.totalClicks || 0} clicks
                    </div>
                </div>
                <div style="display:flex;gap:8px;">
                    <a href="/api/v1/bio/p/${p.slug}" target="_blank" class="bio-btn bio-btn-purple bio-btn-sm">👁️ Preview</a>
                    <button onclick="window._addBioLink('${p.id}')" class="bio-btn bio-btn-green bio-btn-sm">+ Link</button>
                    <button onclick="window._delBio('${p.id}')" class="bio-btn bio-btn-red bio-btn-sm">🗑️</button>
                </div>
            </div>

            <!-- Theme selector -->
            <div class="bio-themes">
                ${Object.entries(THEMES).map(([key, t]) => `
                    <div class="bio-theme-pill ${p.theme === key ? 'active' : ''}" style="background:${t.accent}22;color:${t.accent};" onclick="window._changeTheme('${p.id}','${key}')">${t.label}</div>
                `).join('')}
            </div>

            <div class="bio-split">
                <!-- Left: Links Manager -->
                <div>
                    <h4 style="margin:0 0 12px;font-size:14px;color:var(--color-text);">📋 Links (${p.links?.length || 0})</h4>
                    <div class="bio-links-list">
                        ${!p.links?.length ? '<div style="font-size:13px;color:var(--color-text-muted);text-align:center;padding:20px;">Chưa có link. Nhấn \"+ Link\" để thêm.</div>' :
                        p.links.map(l => `
                            <div class="bio-link-item">
                                <span class="bio-link-icon">${l.icon || '🔗'}</span>
                                <div class="bio-link-info">
                                    <div class="bio-link-title">${esc(l.title)}</div>
                                    <div class="bio-link-url">${esc(l.url)}</div>
                                </div>
                                <div class="bio-link-clicks">🖱️ ${l.clicks || 0}</div>
                                <button class="bio-link-del" onclick="window._delBioLink('${p.id}','${l.id}')">✕</button>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Right: Mobile Preview -->
                <div class="bio-phone-frame" style="${bgStyle}">
                    <div class="bio-phone-notch"></div>
                    <div class="bio-phone-screen">
                        <div class="bio-preview-avatar">${(p.title || '?')[0].toUpperCase()}</div>
                        <div class="bio-preview-name" style="color:${theme.text};">${esc(p.title)}</div>
                        <div class="bio-preview-desc" style="color:${theme.sub};">${esc(p.bio || '')}</div>
                        ${(p.links || []).map(l => `
                            <a href="${esc(l.url)}" target="_blank" class="bio-preview-link" style="background:${theme.card};border-color:${theme.border};color:${theme.text};">
                                ${l.icon || '🔗'} ${esc(l.title)}
                            </a>
                        `).join('')}
                        <div class="bio-preview-socials">
                            ${p.socials?.instagram ? '<span>📸</span>' : ''}
                            ${p.socials?.tiktok ? '<span>🎵</span>' : ''}
                            ${p.socials?.facebook ? '<span>📘</span>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');

    // Wire up actions
    window._addBioLink = async (pageId) => {
        showAddLinkModal(pageId, container);
    };
    window._delBioLink = async (pageId, linkId) => {
        if (confirm('Xóa link này?')) {
            try { await api.delete(`/bio/${pageId}/links/${linkId}`); load(container); } catch (e) { window.Toast?.show(e.message, 'error'); }
        }
    };
    window._delBio = async (id) => {
        if (confirm('Xóa trang bio này?')) {
            try { await api.delete(`/bio/${id}`); load(container); } catch (e) { window.Toast?.show(e.message, 'error'); }
        }
    };
    window._changeTheme = async (id, theme) => {
        try {
            await api.put(`/bio/${id}`, { theme });
            load(container);
            window.Toast?.show(`Theme changed to ${THEMES[theme]?.label || theme}`, 'success');
        } catch (e) { window.Toast?.show(e.message, 'error'); }
    };
}

function showAddLinkModal(pageId, container) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
    overlay.innerHTML = `
    <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:20px;width:440px;padding:28px;">
        <h2 style="margin:0 0 20px;color:var(--color-text);font-size:18px;">➕ Thêm Link</h2>
        
        <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">Tên link</label>
        <input id="link-title" type="text" placeholder="VD: Shop của tôi" style="${inputStyle()};width:100%;margin-bottom:12px;">
        
        <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">URL</label>
        <input id="link-url" type="text" placeholder="https://..." style="${inputStyle()};width:100%;margin-bottom:12px;">
        
        <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">Icon (emoji)</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;">
            ${['🔗','🛒','📱','💬','📧','🎵','📸','🌐','📝','❤️'].map(e => `
                <button class="emoji-pick" onclick="this.closest('div').parentNode.querySelector('#link-icon').value='${e}';this.closest('div').querySelectorAll('.emoji-pick').forEach(b=>b.style.outline='none');this.style.outline='2px solid #8b5cf6';" style="font-size:20px;padding:6px 10px;background:var(--color-surface-hover);border:1px solid var(--color-border);border-radius:8px;cursor:pointer;">${e}</button>
            `).join('')}
        </div>
        <input id="link-icon" type="hidden" value="🔗">

        <div style="display:flex;justify-content:flex-end;gap:12px;">
            <button id="cancel-link" class="bio-btn bio-btn-ghost">Hủy</button>
            <button id="save-link" class="bio-btn bio-btn-purple">➕ Thêm</button>
        </div>
    </div>`;

    document.body.appendChild(overlay);
    overlay.querySelector('#cancel-link').onclick = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#save-link').onclick = async () => {
        const title = overlay.querySelector('#link-title').value.trim();
        const url = overlay.querySelector('#link-url').value.trim();
        const icon = overlay.querySelector('#link-icon').value || '🔗';
        if (!title || !url) { window.Toast?.show('Nhập tên và URL!', 'warning'); return; }
        try {
            await api.post(`/bio/${pageId}/links`, { title, url, icon });
            overlay.remove();
            load(container);
            window.Toast?.show('Link đã được thêm!', 'success');
        } catch (e) { window.Toast?.show(e.message, 'error'); }
    };
}

function showCreateModal(container) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
    overlay.innerHTML = `
    <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:20px;width:480px;padding:28px;">
        <h2 style="margin:0 0 20px;color:var(--color-text);font-size:20px;">🔗 Tạo Bio Page</h2>
        
        <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">Title</label>
        <input id="bio-title" type="text" placeholder="VD: @myshop" style="${inputStyle()};width:100%;margin-bottom:12px;">
        
        <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">Bio text</label>
        <input id="bio-text" type="text" placeholder="Mô tả ngắn..." style="${inputStyle()};width:100%;margin-bottom:12px;">
        
        <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">Slug (URL path)</label>
        <input id="bio-slug" type="text" placeholder="myshop" style="${inputStyle()};width:100%;margin-bottom:16px;">

        <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:8px;">Theme</label>
        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
            ${Object.entries(THEMES).map(([key, t]) => `
                <label style="display:flex;align-items:center;gap:6px;padding:6px 14px;background:${t.accent}22;border:1px solid var(--color-border);border-radius:10px;cursor:pointer;font-size:12px;color:var(--color-text);">
                    <input type="radio" name="bio-theme" value="${key}" ${key === 'default' ? 'checked' : ''}> ${t.label}
                </label>
            `).join('')}
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
            <div><label style="font-size:12px;color:var(--color-text-muted);">Instagram</label><input id="bio-ig" type="text" placeholder="@username" style="${inputStyle()};width:100%;"></div>
            <div><label style="font-size:12px;color:var(--color-text-muted);">TikTok</label><input id="bio-tt" type="text" placeholder="@username" style="${inputStyle()};width:100%;"></div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:12px;">
            <button id="cancel-bio" class="bio-btn bio-btn-ghost">Hủy</button>
            <button id="save-bio" class="bio-btn bio-btn-purple">🔗 Tạo Page</button>
        </div>
    </div>`;

    document.body.appendChild(overlay);
    overlay.querySelector('#cancel-bio').onclick = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#save-bio').onclick = async () => {
        const theme = overlay.querySelector('input[name="bio-theme"]:checked')?.value || 'default';
        try {
            await api.post('/bio', {
                title: overlay.querySelector('#bio-title').value || 'My Links',
                bio: overlay.querySelector('#bio-text').value || '',
                slug: overlay.querySelector('#bio-slug').value || '',
                theme,
                instagram: overlay.querySelector('#bio-ig').value || '',
                tiktok: overlay.querySelector('#bio-tt').value || ''
            });
            overlay.remove();
            load(container);
            window.Toast?.show('Bio Page đã được tạo!', 'success');
        } catch (e) { window.Toast?.show(e.message, 'error'); }
    };
}

function inputStyle() { return 'padding:10px 16px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:10px;color:var(--color-text);font-size:13px;outline:none;'; }
function esc(str) { return String(str || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
