// ============================================================
// A/B Test Lab — Theme-Aware UI
// Split-test experiments with real-time results
// ============================================================

import { api } from '../../assets/api-client.js';

export function renderABTestLab(container) {
    container.innerHTML = buildShell();
    loadDashboard(container);
    return () => {};
}

function buildShell() {
    return `
    <div class="ab-lab">
        <div class="ab-header">
            <div>
                <div class="ab-badge">🧪 EXPERIMENT LAB</div>
                <h1 class="ab-title">A/B Testing</h1>
                <p class="ab-subtitle">Split-test bài đăng → tìm variant chiến thắng dựa trên engagement thực</p>
            </div>
            <button id="create-experiment-btn" class="ab-btn ab-btn-pink">➕ Tạo Experiment</button>
        </div>
        <div id="ab-stats" style="margin-bottom:24px;"></div>
        <div id="ab-experiments"></div>
    </div>
    <style>
    .ab-lab { padding:24px;max-width:1200px;margin:0 auto;font-family:var(--font-body,'Satoshi',sans-serif); }
    .ab-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:12px; }
    .ab-title { font-size:26px;font-weight:700;color:var(--color-text);margin:0; }
    .ab-subtitle { color:var(--color-text-muted);font-size:14px;margin-top:4px; }
    .ab-badge { display:inline-block;padding:4px 12px;background:rgba(236,72,153,0.15);color:#ec4899;border-radius:20px;font-size:11px;font-weight:700;margin-bottom:8px; }
    .ab-btn { padding:10px 20px;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;transition:all 150ms; }
    .ab-btn:hover { filter:brightness(1.1);transform:translateY(-1px); }
    .ab-btn-pink { background:#ec4899;color:white; }
    .ab-btn-green { background:#10b981;color:white; }
    .ab-btn-blue { background:#3b82f6;color:white; }
    .ab-btn-red { background:#ef4444;color:white; }
    .ab-btn-ghost { background:var(--color-surface-hover);color:var(--color-text);border:1px solid var(--color-border); }
    .ab-btn-sm { padding:6px 14px;font-size:12px; }
    .ab-stats-grid { display:grid;grid-template-columns:repeat(5,1fr);gap:12px; }
    @media(max-width:768px) { .ab-stats-grid { grid-template-columns:repeat(2,1fr); } }
    .ab-kpi { background:var(--color-surface);border:1px solid var(--color-border);border-radius:12px;padding:16px;text-align:center; }
    .ab-kpi-icon { font-size:20px; }
    .ab-kpi-val { font-size:22px;font-weight:800;margin:6px 0; }
    .ab-kpi-label { font-size:11px;color:var(--color-text-muted); }
    .ab-card { background:var(--color-surface);border:1px solid var(--color-border);border-radius:16px;padding:20px;margin-bottom:16px;transition:box-shadow 200ms;animation:abFadeIn .3s ease; }
    .ab-card:hover { box-shadow:var(--shadow-md); }
    .ab-variant { padding:16px;border-radius:12px;position:relative; }
    .ab-variant-normal { background:var(--color-surface-hover);border:1px solid var(--color-border); }
    .ab-variant-winner { background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3); }
    .ab-confidence { margin-top:12px;padding:10px 16px;background:rgba(59,130,246,0.08);border-radius:10px;display:flex;justify-content:space-between;align-items:center; }
    .ab-empty { text-align:center;padding:60px;color:var(--color-text-muted); }
    .ab-input { padding:10px 16px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:10px;color:var(--color-text);font-size:13px;outline:none; }
    .ab-select { padding:10px 16px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:10px;color:var(--color-text);font-size:13px;outline:none; }
    .ab-textarea { width:100%;padding:12px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:10px;color:var(--color-text);font-size:13px;outline:none;resize:vertical;font-family:inherit; }
    @keyframes abFadeIn { from { opacity:0;transform:translateY(8px); } to { opacity:1;transform:translateY(0); } }
    </style>`;
}

async function loadDashboard(container) {
    try {
        const [statsRes, expsRes] = await Promise.all([
            api.get('/ab-tests/stats'),
            api.get('/ab-tests')
        ]);
        renderStats(container.querySelector('#ab-stats'), statsRes.data);
        renderExperimentsList(container.querySelector('#ab-experiments'), expsRes.data, container);
    } catch (e) {
        container.querySelector('#ab-experiments').innerHTML = `<div style="padding:16px;background:rgba(239,68,68,0.1);border-radius:10px;color:#f87171;">❌ ${e.message}</div>`;
    }
    container.querySelector('#create-experiment-btn').onclick = () => showCreateModal(container);
}

function renderStats(el, stats) {
    el.innerHTML = `<div class="ab-stats-grid">
        ${kpi('🧪', 'Experiments', stats.total)}
        ${kpi('📝', 'Draft', stats.draft)}
        ${kpi('▶️', 'Running', stats.running, '#10b981')}
        ${kpi('✅', 'Completed', stats.completed, '#3b82f6')}
        ${kpi('📈', 'Avg Confidence', stats.avgConfidence + '%', '#f59e0b')}
    </div>`;
}

function kpi(icon, label, value, color = 'var(--color-text)') {
    return `<div class="ab-kpi"><div class="ab-kpi-icon">${icon}</div><div class="ab-kpi-val" style="color:${color};">${value}</div><div class="ab-kpi-label">${label}</div></div>`;
}

function renderExperimentsList(el, experiments, container) {
    if (!experiments.length) {
        el.innerHTML = `<div class="ab-empty"><div style="font-size:48px;margin-bottom:16px;">🧪</div><div style="font-size:16px;font-weight:600;margin-bottom:8px;">Chưa có Experiment nào</div><div style="font-size:13px;">Tạo A/B test đầu tiên để bắt đầu tối ưu nội dung</div></div>`;
        return;
    }

    const statusColors = { draft: '#6b7280', running: '#10b981', completed: '#3b82f6', archived: '#64748b' };
    const statusIcons = { draft: '📝', running: '▶️', completed: '✅', archived: '📦' };

    el.innerHTML = experiments.map(exp => {
        return `
        <div class="ab-card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
                <div>
                    <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${statusColors[exp.status]}22;color:${statusColors[exp.status]};">${statusIcons[exp.status]} ${exp.status.toUpperCase()}</span>
                    <h3 style="margin:8px 0 0;font-size:16px;color:var(--color-text);">${esc(exp.name)}</h3>
                    <div style="font-size:12px;color:var(--color-text-muted);margin-top:4px;">Goal: <b>${exp.goal}</b> · Platform: <b>${exp.platform}</b> · Duration: <b>${exp.duration}h</b></div>
                </div>
                <div style="display:flex;gap:8px;">
                    ${exp.status === 'draft' ? `<button onclick="window._startExp('${exp.id}')" class="ab-btn ab-btn-green ab-btn-sm">▶️ Start</button>` : ''}
                    ${exp.status === 'running' ? `<button onclick="window._completeExp('${exp.id}')" class="ab-btn ab-btn-blue ab-btn-sm">🏁 End</button>` : ''}
                    <button onclick="window._deleteExp('${exp.id}')" class="ab-btn ab-btn-red ab-btn-sm">🗑️</button>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(${exp.variants.length},1fr);gap:12px;">
                ${exp.variants.map(v => `
                    <div class="ab-variant ${v.isWinner ? 'ab-variant-winner' : 'ab-variant-normal'}">
                        ${v.isWinner ? '<div style="position:absolute;top:-8px;right:12px;background:#10b981;color:white;padding:2px 10px;border-radius:10px;font-size:10px;font-weight:700;">🏆 WINNER</div>' : ''}
                        <div style="font-size:14px;font-weight:700;color:${v.isWinner ? '#10b981' : 'var(--color-text)'};margin-bottom:10px;">${esc(v.label)}</div>
                        <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:12px;line-height:1.5;max-height:60px;overflow:hidden;">${esc(v.content) || '<i>No content</i>'}</div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;color:var(--color-text-muted);">
                            <div>👁️ <b style="color:var(--color-text);">${v.metrics.impressions.toLocaleString()}</b></div>
                            <div>👍 <b style="color:var(--color-text);">${v.metrics.likes}</b></div>
                            <div>💬 <b style="color:var(--color-text);">${v.metrics.comments}</b></div>
                            <div>🔄 <b style="color:var(--color-text);">${v.metrics.shares}</b></div>
                            <div>📊 ER: <b style="color:${v.metrics.engagementRate > 5 ? '#10b981' : 'var(--color-text)'};">${v.metrics.engagementRate}%</b></div>
                            <div>🖱️ CTR: <b style="color:var(--color-text);">${v.metrics.ctr}%</b></div>
                        </div>
                    </div>
                `).join('')}
            </div>

            ${exp.confidence > 0 ? `
                <div class="ab-confidence">
                    <span style="font-size:12px;color:var(--color-text-muted);">Statistical Confidence</span>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div style="width:120px;height:6px;background:var(--color-surface-hover);border-radius:3px;overflow:hidden;">
                            <div style="width:${exp.confidence}%;height:100%;background:${exp.confidence >= 95 ? '#10b981' : exp.confidence >= 80 ? '#f59e0b' : '#ef4444'};border-radius:3px;"></div>
                        </div>
                        <span style="font-size:13px;font-weight:700;color:${exp.confidence >= 95 ? '#10b981' : '#f59e0b'};">${exp.confidence}%</span>
                    </div>
                </div>
            ` : ''}
        </div>`;
    }).join('');

    window._startExp = async (id) => {
        try { await api.post(`/ab-tests/${id}/start`); loadDashboard(container); window.Toast?.show('Experiment started!', 'success'); } catch (e) { window.Toast?.show(e.message, 'error'); }
    };
    window._completeExp = async (id) => {
        try { await api.post(`/ab-tests/${id}/complete`); loadDashboard(container); window.Toast?.show('Experiment completed!', 'success'); } catch (e) { window.Toast?.show(e.message, 'error'); }
    };
    window._deleteExp = async (id) => {
        if (confirm('Xóa experiment này?')) {
            try { await api.delete(`/ab-tests/${id}`); loadDashboard(container); } catch (e) { window.Toast?.show(e.message, 'error'); }
        }
    };
}

function showCreateModal(container) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
    overlay.innerHTML = `
    <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:20px;width:560px;max-height:90vh;overflow-y:auto;padding:28px;">
        <h2 style="margin:0 0 20px;color:var(--color-text);font-size:20px;">🧪 Tạo A/B Experiment</h2>
        
        <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">Tên experiment</label>
        <input id="exp-name" type="text" placeholder="VD: Test CTA mạnh vs nhẹ" class="ab-input" style="width:100%;margin-bottom:16px;">

        <div style="display:flex;gap:12px;margin-bottom:16px;">
            <div style="flex:1;">
                <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">Platform</label>
                <select id="exp-platform" class="ab-select" style="width:100%;">
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="tiktok">TikTok</option>
                </select>
            </div>
            <div style="flex:1;">
                <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">Goal</label>
                <select id="exp-goal" class="ab-select" style="width:100%;">
                    <option value="engagement">Engagement Rate</option>
                    <option value="clicks">Click-Through Rate</option>
                    <option value="reach">Reach</option>
                </select>
            </div>
            <div style="flex:1;">
                <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">Duration (giờ)</label>
                <input id="exp-duration" type="number" value="72" class="ab-input" style="width:100%;">
            </div>
        </div>

        <div style="margin-bottom:12px;">
            <label style="font-size:13px;font-weight:700;color:#60a5fa;display:block;margin-bottom:8px;">Variant A</label>
            <textarea id="exp-va" placeholder="Nội dung variant A..." class="ab-textarea" style="min-height:80px;"></textarea>
        </div>
        <div style="margin-bottom:20px;">
            <label style="font-size:13px;font-weight:700;color:#ec4899;display:block;margin-bottom:8px;">Variant B</label>
            <textarea id="exp-vb" placeholder="Nội dung variant B..." class="ab-textarea" style="min-height:80px;"></textarea>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:12px;">
            <button id="cancel-exp" class="ab-btn ab-btn-ghost">Hủy</button>
            <button id="save-exp" class="ab-btn ab-btn-pink">🧪 Tạo Experiment</button>
        </div>
    </div>`;

    document.body.appendChild(overlay);
    overlay.querySelector('#cancel-exp').onclick = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#save-exp').onclick = async () => {
        const va = overlay.querySelector('#exp-va').value.trim();
        const vb = overlay.querySelector('#exp-vb').value.trim();
        if (!va || !vb) { window.Toast?.show('Nhập nội dung cho cả 2 variant!', 'warning'); return; }
        try {
            await api.post('/ab-tests', {
                name: overlay.querySelector('#exp-name').value || 'A/B Test',
                platform: overlay.querySelector('#exp-platform').value,
                goal: overlay.querySelector('#exp-goal').value,
                duration: parseInt(overlay.querySelector('#exp-duration').value) || 72,
                variants: [{ label: 'Variant A', content: va }, { label: 'Variant B', content: vb }]
            });
            overlay.remove();
            loadDashboard(container);
            window.Toast?.show('Experiment đã tạo!', 'success');
        } catch (e) { window.Toast?.show(e.message, 'error'); }
    };
}

function esc(s) { return String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
