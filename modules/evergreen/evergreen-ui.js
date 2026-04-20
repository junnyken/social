// ============================================================
// Evergreen Content Recycler UI — Theme-Aware
// ============================================================

import { api } from '../../assets/api-client.js';

export function renderEvergreen(container) {
    container.innerHTML = shell();
    load(container);
}

function shell() {
    return `
    <div class="eg-recycler">
        <div class="eg-header">
            <div>
                <div class="eg-badge">♻️ EVERGREEN ENGINE</div>
                <h1 class="eg-title">Content Recycling</h1>
                <p class="eg-subtitle">Tự động tái đăng bài viết top-performing theo lịch tuần hoàn</p>
            </div>
            <button id="create-queue-btn" class="eg-btn eg-btn-green">➕ Tạo Queue</button>
        </div>
        <div id="eg-stats" style="margin-bottom:20px;"></div>
        <div id="eg-suggest" style="margin-bottom:20px;"></div>
        <div id="eg-queues"></div>
    </div>
    <style>
    .eg-recycler { padding:24px;max-width:1200px;margin:0 auto;font-family:var(--font-body,'Satoshi',sans-serif); }
    .eg-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:12px; }
    .eg-title { font-size:26px;font-weight:700;color:var(--color-text);margin:0; }
    .eg-subtitle { color:var(--color-text-muted);font-size:14px;margin-top:4px; }
    .eg-badge { display:inline-block;padding:4px 12px;background:rgba(16,185,129,0.15);color:#10b981;border-radius:20px;font-size:11px;font-weight:700;margin-bottom:8px; }
    .eg-btn { padding:10px 20px;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;transition:all 150ms; }
    .eg-btn:hover { filter:brightness(1.1);transform:translateY(-1px); }
    .eg-btn-green { background:#10b981;color:white; }
    .eg-btn-yellow { background:#f59e0b;color:white; }
    .eg-btn-red { background:#ef4444;color:white; }
    .eg-btn-sm { padding:6px 14px;font-size:12px; }
    .eg-btn-ghost { background:var(--color-surface-hover);color:var(--color-text);border:1px solid var(--color-border); }
    .eg-stats-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:12px; }
    @media(max-width:768px) { .eg-stats-grid { grid-template-columns:repeat(2,1fr); } }
    .eg-kpi { background:var(--color-surface);border:1px solid var(--color-border);border-radius:12px;padding:16px;text-align:center; }
    .eg-card { background:var(--color-surface);border:1px solid var(--color-border);border-radius:16px;padding:20px;margin-bottom:16px;transition:box-shadow 200ms;animation:egFadeIn .3s ease; }
    .eg-card:hover { box-shadow:var(--shadow-md); }
    .eg-suggest-box { background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:14px;padding:16px; }
    .eg-post-item { display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--color-surface-hover);border-radius:10px;border:1px solid var(--color-border);transition:transform 100ms; }
    .eg-post-item:hover { transform:translateX(4px); }
    .eg-empty { text-align:center;padding:60px;color:var(--color-text-muted); }
    .eg-input { padding:10px 16px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:10px;color:var(--color-text);font-size:13px;outline:none; }
    @keyframes egFadeIn { from { opacity:0;transform:translateY(8px); } to { opacity:1;transform:translateY(0); } }
    </style>`;
}

async function load(container) {
    try {
        const [statsRes, queuesRes, suggestRes] = await Promise.all([
            api.get('/evergreen/stats'),
            api.get('/evergreen'),
            api.get('/evergreen/suggest?minER=1&limit=5')
        ]);
        renderStats(container.querySelector('#eg-stats'), statsRes.data);
        renderSuggestions(container.querySelector('#eg-suggest'), suggestRes.data, queuesRes.data, container);
        renderQueues(container.querySelector('#eg-queues'), queuesRes.data, container);
    } catch (e) {
        container.querySelector('#eg-queues').innerHTML = `<div style="padding:16px;background:rgba(239,68,68,0.1);border-radius:10px;color:#f87171;">❌ ${e.message}</div>`;
    }
    container.querySelector('#create-queue-btn').onclick = () => showCreateQueueModal(container);
}

function renderStats(el, s) {
    el.innerHTML = `<div class="eg-stats-grid">
        ${kpi('📦', 'Queues', s.totalQueues)} ${kpi('📝', 'Posts', s.totalPosts)}
        ${kpi('♻️', 'Recycled', s.totalRecycled, '#10b981')} ${kpi('✅', 'Active', s.activePosts, '#3b82f6')}
    </div>`;
}

function kpi(icon, label, value, color = 'var(--color-text)') {
    return `<div class="eg-kpi"><div style="font-size:20px;">${icon}</div><div style="font-size:22px;font-weight:800;color:${color};margin:6px 0;">${value}</div><div style="font-size:11px;color:var(--color-text-muted);">${label}</div></div>`;
}

function renderSuggestions(el, posts, queues, container) {
    if (!posts.length) { el.innerHTML = ''; return; }
    el.innerHTML = `
    <div class="eg-suggest-box">
        <h3 style="margin:0 0 12px;font-size:14px;color:#10b981;">🤖 AI Gợi ý bài viết nên Evergreen</h3>
        <div style="display:grid;gap:8px;">
            ${posts.map(p => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--color-surface-hover);border-radius:10px;">
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:13px;color:var(--color-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(p.content || 'No content')}</div>
                        <div style="font-size:11px;color:var(--color-text-muted);margin-top:2px;">ER: <b style="color:#10b981;">${p.engagementRate}%</b> · 👍${p.likes} 💬${p.comments}</div>
                    </div>
                    ${queues.length ? `<button onclick="window._addToQueue('${queues[0].id}','${encodeURIComponent(p.content)}',${p.engagementRate})" class="eg-btn eg-btn-green eg-btn-sm" style="margin-left:8px;">+ Add</button>` : ''}
                </div>
            `).join('')}
        </div>
    </div>`;

    window._addToQueue = async (queueId, content, er) => {
        try {
            await api.post(`/evergreen/${queueId}/posts`, { content: decodeURIComponent(content), engagementRate: er });
            load(container);
            window.Toast?.show('Added to queue!', 'success');
        } catch (e) { window.Toast?.show(e.message, 'error'); }
    };
}

function renderQueues(el, queues, container) {
    if (!queues.length) {
        el.innerHTML = `<div class="eg-empty"><div style="font-size:48px;margin-bottom:16px;">♻️</div><div style="font-size:16px;font-weight:600;">Chưa có Evergreen Queue</div><div style="font-size:13px;margin-top:4px;">Tạo queue đầu tiên để bắt đầu tái sử dụng content hiệu quả</div></div>`;
        return;
    }

    el.innerHTML = queues.map(q => `
    <div class="eg-card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
            <div>
                <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${q.status==='active'?'rgba(16,185,129,0.15)':'rgba(107,114,128,0.15)'};color:${q.status==='active'?'#10b981':'#6b7280'};">${q.status==='active'?'▶️ Active':'⏸ Paused'}</span>
                <h3 style="margin:8px 0 0;font-size:16px;color:var(--color-text);">${esc(q.name)}</h3>
                <div style="font-size:12px;color:var(--color-text-muted);margin-top:4px;">📅 ${q.schedule?.frequency || 'daily'} · 🔄 Max ${q.rules?.maxRecycles || 5} recycles · ⏳ ${q.rules?.minDaysSinceLastPost || 30}d cooldown</div>
            </div>
            <div style="display:flex;gap:8px;">
                <button onclick="window._toggleQ('${q.id}')" class="eg-btn ${q.status==='active'?'eg-btn-yellow':'eg-btn-green'} eg-btn-sm">${q.status==='active'?'⏸ Pause':'▶️ Resume'}</button>
                <button onclick="window._deleteQ('${q.id}')" class="eg-btn eg-btn-red eg-btn-sm">🗑️</button>
            </div>
        </div>
        <div style="display:grid;gap:6px;">
            ${q.posts?.length === 0 ? '<div style="font-size:13px;color:var(--color-text-muted);text-align:center;padding:16px;">Chưa có bài viết trong queue này</div>' :
            (q.posts || []).map(p => `
                <div class="eg-post-item">
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:13px;color:var(--color-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(p.content || '-')}</div>
                        <div style="font-size:11px;color:var(--color-text-muted);margin-top:2px;">♻️ ${p.recycleCount}x · ER: ${p.originalMetrics?.engagementRate || 0}% · ${p.status}</div>
                    </div>
                    <button onclick="window._recycleP('${q.id}','${p.id}')" class="eg-btn eg-btn-green eg-btn-sm" ${p.status!=='active'?'disabled':''}>♻️ Recycle</button>
                </div>
            `).join('')}
        </div>
    </div>
    `).join('');

    window._toggleQ = async (id) => { try { await api.post(`/evergreen/${id}/toggle`); load(container); window.Toast?.show('Queue toggled!', 'success'); } catch(e) { window.Toast?.show(e.message, 'error'); } };
    window._deleteQ = async (id) => { if(confirm('Xóa queue?')) { try{await api.delete(`/evergreen/${id}`);load(container);}catch(e){window.Toast?.show(e.message,'error');}} };
    window._recycleP = async (qid,pid) => { try{await api.post(`/evergreen/${qid}/posts/${pid}/recycle`);load(container);window.Toast?.show('♻️ Đã recycle!','success');}catch(e){window.Toast?.show(e.message,'error');} };
}

function showCreateQueueModal(container) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
    overlay.innerHTML = `
    <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:20px;width:480px;padding:28px;">
        <h2 style="margin:0 0 20px;color:var(--color-text);font-size:20px;">♻️ Tạo Evergreen Queue</h2>
        
        <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">Tên Queue</label>
        <input id="eq-name" type="text" placeholder="VD: Quotes, Tips, Promotions..." class="eg-input" style="width:100%;margin-bottom:12px;">

        <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:8px;">Platforms</label>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
            ${['facebook','instagram','linkedin','tiktok'].map(p => `
                <label style="display:flex;align-items:center;gap:6px;padding:8px 14px;background:var(--color-surface-hover);border:1px solid var(--color-border);border-radius:10px;cursor:pointer;font-size:13px;color:var(--color-text);">
                    <input type="checkbox" value="${p}" class="eq-platform" ${p==='facebook'?'checked':''}>
                    ${{ facebook:'📘',instagram:'📸',linkedin:'💼',tiktok:'🎵' }[p]} ${p}
                </label>
            `).join('')}
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
            <div><label style="font-size:12px;color:var(--color-text-muted);">Max Recycles</label><input id="eq-max" type="number" value="5" class="eg-input" style="width:100%;"></div>
            <div><label style="font-size:12px;color:var(--color-text-muted);">Cooldown (ngày)</label><input id="eq-cool" type="number" value="30" class="eg-input" style="width:100%;"></div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:12px;">
            <button id="cancel-eq" class="eg-btn eg-btn-ghost">Hủy</button>
            <button id="save-eq" class="eg-btn eg-btn-green">♻️ Tạo Queue</button>
        </div>
    </div>`;

    document.body.appendChild(overlay);
    overlay.querySelector('#cancel-eq').onclick = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#save-eq').onclick = async () => {
        const name = overlay.querySelector('#eq-name').value.trim();
        const platforms = [...overlay.querySelectorAll('.eq-platform:checked')].map(c => c.value);
        if (!name) { window.Toast?.show('Nhập tên queue!', 'warning'); return; }
        try {
            await api.post('/evergreen', {
                name,
                platforms,
                rules: {
                    maxRecycles: parseInt(overlay.querySelector('#eq-max').value) || 5,
                    minDaysSinceLastPost: parseInt(overlay.querySelector('#eq-cool').value) || 30
                }
            });
            overlay.remove();
            load(container);
            window.Toast?.show('Queue đã tạo!', 'success');
        } catch (e) { window.Toast?.show(e.message, 'error'); }
    };
}

function esc(s) { return String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
