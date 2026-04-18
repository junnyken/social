// ============================================================
// A/B Test Lab — Phase Y Frontend
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
    <div style="padding:24px;max-width:1200px;margin:0 auto;font-family:'Satoshi',sans-serif;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;">
            <div>
                <div style="display:inline-block;padding:4px 12px;background:rgba(236,72,153,0.15);color:#ec4899;border-radius:20px;font-size:11px;font-weight:700;margin-bottom:8px;">🧪 EXPERIMENT LAB</div>
                <h1 style="font-size:26px;font-weight:700;color:#f1f5f9;margin:0;">A/B Testing</h1>
                <p style="color:#94a3b8;font-size:14px;margin-top:4px;">Split-test bài đăng → tìm variant chiến thắng dựa trên engagement thực</p>
            </div>
            <button id="create-experiment-btn" style="${btnStyle()}">➕ Tạo Experiment</button>
        </div>
        <div id="ab-stats" style="margin-bottom:24px;"></div>
        <div id="ab-experiments"></div>
    </div>`;
}

async function loadDashboard(container) {
    try {
        const [statsRes, expsRes] = await Promise.all([
            api.get('/ab-tests/stats'),
            api.get('/ab-tests')
        ]);
        renderStats(container.querySelector('#ab-stats'), statsRes.data);
        renderExperimentsList(container.querySelector('#ab-experiments'), expsRes.data);
    } catch (e) {
        container.querySelector('#ab-experiments').innerHTML = errorHTML(e.message);
    }

    container.querySelector('#create-experiment-btn').onclick = () => showCreateModal(container);
}

function renderStats(el, stats) {
    el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;">
        ${kpi('🧪', 'Experiments', stats.total)}
        ${kpi('📝', 'Draft', stats.draft)}
        ${kpi('▶️', 'Running', stats.running, '#10b981')}
        ${kpi('✅', 'Completed', stats.completed, '#3b82f6')}
        ${kpi('📈', 'Avg Confidence', stats.avgConfidence + '%', '#f59e0b')}
    </div>`;
}

function kpi(icon, label, value, color = '#94a3b8') {
    return `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:20px;">${icon}</div>
        <div style="font-size:22px;font-weight:800;color:${color};margin:6px 0;">${value}</div>
        <div style="font-size:11px;color:#64748b;">${label}</div>
    </div>`;
}

function renderExperimentsList(el, experiments) {
    if (!experiments.length) {
        el.innerHTML = `<div style="text-align:center;padding:60px;color:#94a3b8;">
            <div style="font-size:48px;margin-bottom:16px;">🧪</div>
            <div style="font-size:16px;font-weight:600;margin-bottom:8px;">Chưa có Experiment nào</div>
            <div style="font-size:13px;">Tạo A/B test đầu tiên để bắt đầu tối ưu nội dung</div>
        </div>`;
        return;
    }

    el.innerHTML = experiments.map(exp => {
        const statusColors = { draft: '#6b7280', running: '#10b981', completed: '#3b82f6', archived: '#64748b' };
        const statusIcons = { draft: '📝', running: '▶️', completed: '✅', archived: '📦' };
        const winner = exp.variants.find(v => v.isWinner);

        return `
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:20px;margin-bottom:16px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
                <div>
                    <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${statusColors[exp.status]}22;color:${statusColors[exp.status]};">${statusIcons[exp.status]} ${exp.status.toUpperCase()}</span>
                    <h3 style="margin:8px 0 0;font-size:16px;color:#f1f5f9;">${exp.name}</h3>
                    <div style="font-size:12px;color:#64748b;margin-top:4px;">Goal: <b style="color:#94a3b8;">${exp.goal}</b> · Platform: <b style="color:#94a3b8;">${exp.platform}</b> · Duration: <b style="color:#94a3b8;">${exp.duration}h</b></div>
                </div>
                <div style="display:flex;gap:8px;">
                    ${exp.status === 'draft' ? `<button onclick="window._startExp('${exp.id}')" style="${btnStyle('#10b981','sm')}">▶️ Start</button>` : ''}
                    ${exp.status === 'running' ? `<button onclick="window._completeExp('${exp.id}')" style="${btnStyle('#3b82f6','sm')}">🏁 End</button>` : ''}
                    <button onclick="window._deleteExp('${exp.id}')" style="${btnStyle('#ef4444','sm')}">🗑️</button>
                </div>
            </div>

            <!-- Variants -->
            <div style="display:grid;grid-template-columns:repeat(${exp.variants.length},1fr);gap:12px;">
                ${exp.variants.map(v => `
                    <div style="padding:16px;background:${v.isWinner ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.02)'};border:1px solid ${v.isWinner ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.05)'};border-radius:12px;position:relative;">
                        ${v.isWinner ? '<div style="position:absolute;top:-8px;right:12px;background:#10b981;color:white;padding:2px 10px;border-radius:10px;font-size:10px;font-weight:700;">🏆 WINNER</div>' : ''}
                        <div style="font-size:14px;font-weight:700;color:${v.isWinner ? '#10b981' : '#f1f5f9'};margin-bottom:10px;">${v.label}</div>
                        <div style="font-size:12px;color:#94a3b8;margin-bottom:12px;line-height:1.5;max-height:60px;overflow:hidden;">${v.content || '<i>No content</i>'}</div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;color:#64748b;">
                            <div>👁️ <b style="color:#f1f5f9;">${v.metrics.impressions.toLocaleString()}</b></div>
                            <div>👍 <b style="color:#f1f5f9;">${v.metrics.likes}</b></div>
                            <div>💬 <b style="color:#f1f5f9;">${v.metrics.comments}</b></div>
                            <div>🔄 <b style="color:#f1f5f9;">${v.metrics.shares}</b></div>
                            <div>📊 ER: <b style="color:${v.metrics.engagementRate > 5 ? '#10b981' : '#f1f5f9'};">${v.metrics.engagementRate}%</b></div>
                            <div>🖱️ CTR: <b style="color:#f1f5f9;">${v.metrics.ctr}%</b></div>
                        </div>
                    </div>
                `).join('')}
            </div>

            ${exp.confidence > 0 ? `
                <div style="margin-top:12px;padding:10px 16px;background:rgba(59,130,246,0.08);border-radius:10px;display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:12px;color:#94a3b8;">Statistical Confidence</span>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div style="width:120px;height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;">
                            <div style="width:${exp.confidence}%;height:100%;background:${exp.confidence >= 95 ? '#10b981' : exp.confidence >= 80 ? '#f59e0b' : '#ef4444'};border-radius:3px;"></div>
                        </div>
                        <span style="font-size:13px;font-weight:700;color:${exp.confidence >= 95 ? '#10b981' : '#f59e0b'};">${exp.confidence}%</span>
                    </div>
                </div>
            ` : ''}
        </div>`;
    }).join('');

    // Global action handlers
    window._startExp = async (id) => {
        try { await api.post(`/ab-tests/${id}/start`); location.reload(); } catch (e) { alert(e.message); }
    };
    window._completeExp = async (id) => {
        try { await api.post(`/ab-tests/${id}/complete`); location.reload(); } catch (e) { alert(e.message); }
    };
    window._deleteExp = async (id) => {
        if (confirm('Xóa experiment này?')) {
            try { await api.delete(`/ab-tests/${id}`); location.reload(); } catch (e) { alert(e.message); }
        }
    };
}

function showCreateModal(container) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
    overlay.innerHTML = `
    <div style="background:#1a1d24;border:1px solid rgba(255,255,255,0.1);border-radius:20px;width:560px;max-height:90vh;overflow-y:auto;padding:28px;">
        <h2 style="margin:0 0 20px;color:#f1f5f9;font-size:20px;">🧪 Tạo A/B Experiment</h2>
        
        <label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px;">Tên experiment</label>
        <input id="exp-name" type="text" placeholder="VD: Test CTA mạnh vs nhẹ" style="${inputStyle()};width:100%;margin-bottom:16px;">

        <div style="display:flex;gap:12px;margin-bottom:16px;">
            <div style="flex:1;">
                <label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px;">Platform</label>
                <select id="exp-platform" style="${selectStyle()};width:100%;">
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                </select>
            </div>
            <div style="flex:1;">
                <label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px;">Goal</label>
                <select id="exp-goal" style="${selectStyle()};width:100%;">
                    <option value="engagement">Engagement Rate</option>
                    <option value="clicks">Click-Through Rate</option>
                    <option value="reach">Reach</option>
                </select>
            </div>
            <div style="flex:1;">
                <label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px;">Duration (giờ)</label>
                <input id="exp-duration" type="number" value="72" style="${inputStyle()};width:100%;">
            </div>
        </div>

        <div style="margin-bottom:12px;">
            <label style="font-size:13px;font-weight:700;color:#60a5fa;display:block;margin-bottom:8px;">Variant A</label>
            <textarea id="exp-va" placeholder="Nội dung variant A..." style="${textareaStyle()};min-height:80px;"></textarea>
        </div>
        <div style="margin-bottom:20px;">
            <label style="font-size:13px;font-weight:700;color:#ec4899;display:block;margin-bottom:8px;">Variant B</label>
            <textarea id="exp-vb" placeholder="Nội dung variant B..." style="${textareaStyle()};min-height:80px;"></textarea>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:12px;">
            <button id="cancel-exp" style="${btnStyle('#6b7280')}">Hủy</button>
            <button id="save-exp" style="${btnStyle('#ec4899')}">🧪 Tạo Experiment</button>
        </div>
    </div>`;

    document.body.appendChild(overlay);

    overlay.querySelector('#cancel-exp').onclick = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#save-exp').onclick = async () => {
        const name = overlay.querySelector('#exp-name').value.trim();
        const platform = overlay.querySelector('#exp-platform').value;
        const goal = overlay.querySelector('#exp-goal').value;
        const duration = parseInt(overlay.querySelector('#exp-duration').value) || 72;
        const va = overlay.querySelector('#exp-va').value.trim();
        const vb = overlay.querySelector('#exp-vb').value.trim();

        if (!va || !vb) { alert('Nhập nội dung cho cả 2 variant!'); return; }

        try {
            await api.post('/ab-tests', {
                name: name || 'A/B Test',
                platform, goal, duration,
                variants: [
                    { label: 'Variant A', content: va },
                    { label: 'Variant B', content: vb }
                ]
            });
            overlay.remove();
            loadDashboard(container);
        } catch (e) { alert(e.message); }
    };
}

// Style helpers
function btnStyle(color = '#ec4899', size = 'md') {
    const p = size === 'sm' ? '6px 14px' : '10px 20px';
    const f = size === 'sm' ? '12px' : '13px';
    return `padding:${p};background:${color};color:white;border:none;border-radius:10px;font-size:${f};font-weight:600;cursor:pointer;`;
}
function inputStyle() { return 'padding:10px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#f1f5f9;font-size:13px;outline:none;'; }
function selectStyle() { return 'padding:10px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#f1f5f9;font-size:13px;outline:none;'; }
function textareaStyle() { return 'width:100%;padding:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#f1f5f9;font-size:13px;outline:none;resize:vertical;font-family:inherit;'; }
function errorHTML(msg) { return `<div style="padding:16px;background:rgba(239,68,68,0.1);border-radius:10px;color:#f87171;font-size:13px;">❌ ${msg}</div>`; }
