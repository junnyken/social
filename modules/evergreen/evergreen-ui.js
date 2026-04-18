// ============================================================
// Evergreen Content Recycler UI — Ω1
// ============================================================

import { api } from '../../assets/api-client.js';

export function renderEvergreen(container) {
    container.innerHTML = shell();
    load(container);
}

function shell() {
    return `
    <div style="padding:24px;max-width:1200px;margin:0 auto;font-family:'Satoshi',sans-serif;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;">
            <div>
                <div style="display:inline-block;padding:4px 12px;background:rgba(16,185,129,0.15);color:#10b981;border-radius:20px;font-size:11px;font-weight:700;margin-bottom:8px;">♻️ EVERGREEN ENGINE</div>
                <h1 style="font-size:26px;font-weight:700;color:#f1f5f9;margin:0;">Content Recycling</h1>
                <p style="color:#94a3b8;font-size:14px;margin-top:4px;">Tự động tái đăng bài viết top-performing theo lịch tuần hoàn</p>
            </div>
            <button id="create-queue-btn" style="padding:10px 20px;background:#10b981;color:white;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;">➕ Tạo Queue</button>
        </div>
        <div id="eg-stats" style="margin-bottom:20px;"></div>
        <div id="eg-suggest" style="margin-bottom:20px;"></div>
        <div id="eg-queues"></div>
    </div>`;
}

async function load(container) {
    try {
        const [statsRes, queuesRes, suggestRes] = await Promise.all([
            api.get('/evergreen/stats'),
            api.get('/evergreen'),
            api.get('/evergreen/suggest?minER=1&limit=5')
        ]);
        renderStats(container.querySelector('#eg-stats'), statsRes.data);
        renderSuggestions(container.querySelector('#eg-suggest'), suggestRes.data, queuesRes.data);
        renderQueues(container.querySelector('#eg-queues'), queuesRes.data, container);
    } catch (e) {
        container.querySelector('#eg-queues').innerHTML = `<div style="padding:16px;background:rgba(239,68,68,0.1);border-radius:10px;color:#f87171;">❌ ${e.message}</div>`;
    }
    container.querySelector('#create-queue-btn').onclick = () => createQueue(container);
}

function renderStats(el, s) {
    el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
        ${kpi('📦', 'Queues', s.totalQueues)} ${kpi('📝', 'Posts', s.totalPosts)}
        ${kpi('♻️', 'Recycled', s.totalRecycled, '#10b981')} ${kpi('✅', 'Active', s.activePosts, '#3b82f6')}
    </div>`;
}

function renderSuggestions(el, posts, queues) {
    if (!posts.length) { el.innerHTML = ''; return; }
    el.innerHTML = `
    <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:14px;padding:16px;">
        <h3 style="margin:0 0 12px;font-size:14px;color:#10b981;">🤖 AI Gợi ý bài viết nên Evergreen</h3>
        <div style="display:grid;gap:8px;">
            ${posts.map(p => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(255,255,255,0.03);border-radius:10px;">
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:13px;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.content || 'No content'}</div>
                        <div style="font-size:11px;color:#64748b;margin-top:2px;">ER: <b style="color:#10b981;">${p.engagementRate}%</b> · 👍${p.likes} 💬${p.comments}</div>
                    </div>
                    ${queues.length ? `<button onclick="window._addToQueue('${queues[0].id}','${encodeURIComponent(p.content)}',${p.engagementRate})" style="padding:4px 12px;background:#10b981;color:white;border:none;border-radius:8px;font-size:11px;cursor:pointer;margin-left:8px;">+ Add</button>` : ''}
                </div>
            `).join('')}
        </div>
    </div>`;

    window._addToQueue = async (queueId, content, er) => {
        try {
            await api.post(`/evergreen/${queueId}/posts`, { content: decodeURIComponent(content), engagementRate: er });
            load(el.closest('[style*="padding:24px"]'));
        } catch (e) { alert(e.message); }
    };
}

function renderQueues(el, queues, container) {
    if (!queues.length) {
        el.innerHTML = `<div style="text-align:center;padding:60px;color:#94a3b8;"><div style="font-size:48px;margin-bottom:16px;">♻️</div><div style="font-size:16px;font-weight:600;">Chưa có Evergreen Queue</div><div style="font-size:13px;margin-top:4px;">Tạo queue đầu tiên để bắt đầu tái sử dụng content hiệu quả</div></div>`;
        return;
    }
    el.innerHTML = queues.map(q => `
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:20px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <div>
                <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${q.status==='active'?'rgba(16,185,129,0.15)':'rgba(107,114,128,0.15)'};color:${q.status==='active'?'#10b981':'#6b7280'};">${q.status==='active'?'▶️ Active':'⏸ Paused'}</span>
                <h3 style="margin:8px 0 0;font-size:16px;color:#f1f5f9;">${q.name}</h3>
                <div style="font-size:12px;color:#64748b;margin-top:4px;">📅 ${q.schedule.frequency} · 🔄 Max ${q.rules.maxRecycles} recycles · ⏳ ${q.rules.minDaysSinceLastPost}d cooldown</div>
            </div>
            <div style="display:flex;gap:8px;">
                <button onclick="window._toggleQ('${q.id}')" style="padding:6px 14px;background:${q.status==='active'?'#f59e0b':'#10b981'};color:white;border:none;border-radius:8px;font-size:12px;cursor:pointer;">${q.status==='active'?'⏸ Pause':'▶️ Resume'}</button>
                <button onclick="window._deleteQ('${q.id}')" style="padding:6px 14px;background:#ef4444;color:white;border:none;border-radius:8px;font-size:12px;cursor:pointer;">🗑️</button>
            </div>
        </div>
        <div style="display:grid;gap:6px;">
            ${q.posts.length === 0 ? '<div style="font-size:13px;color:#64748b;text-align:center;padding:16px;">Chưa có bài viết trong queue này</div>' :
            q.posts.map(p => `
                <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:rgba(255,255,255,0.02);border-radius:10px;border:1px solid rgba(255,255,255,0.04);">
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:13px;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.content || '-'}</div>
                        <div style="font-size:11px;color:#64748b;margin-top:2px;">♻️ ${p.recycleCount}x · ER: ${p.originalMetrics?.engagementRate || 0}% · ${p.status}</div>
                    </div>
                    <button onclick="window._recycleP('${q.id}','${p.id}')" style="padding:4px 10px;background:#10b981;color:white;border:none;border-radius:6px;font-size:11px;cursor:pointer;" ${p.status!=='active'?'disabled':''}>♻️ Recycle</button>
                </div>
            `).join('')}
        </div>
    </div>
    `).join('');

    window._toggleQ = async (id) => { try { await api.post(`/evergreen/${id}/toggle`); load(container); } catch(e){alert(e.message);} };
    window._deleteQ = async (id) => { if(confirm('Xóa queue?')) { try{await api.delete(`/evergreen/${id}`);load(container);}catch(e){alert(e.message);}} };
    window._recycleP = async (qid,pid) => { try{await api.post(`/evergreen/${qid}/posts/${pid}/recycle`);load(container);alert('♻️ Đã recycle!');}catch(e){alert(e.message);} };
}

async function createQueue(container) {
    const name = prompt('Tên Evergreen Queue:');
    if (!name) return;
    try {
        await api.post('/evergreen', { name, platforms: ['facebook','instagram'] });
        load(container);
    } catch (e) { alert(e.message); }
}

function kpi(icon, label, value, color='#94a3b8') {
    return `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;text-align:center;"><div style="font-size:20px;">${icon}</div><div style="font-size:22px;font-weight:800;color:${color};margin:6px 0;">${value}</div><div style="font-size:11px;color:#64748b;">${label}</div></div>`;
}
