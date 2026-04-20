// ============================================================
// Multi-Platform Bulk Publisher — Full UI with CSV Upload
// ============================================================

import { api } from '../../assets/api-client.js';

export function renderBulkPublisher(container) {
    container.innerHTML = buildShell();
    loadCampaigns(container);
    return () => {};
}

function buildShell() {
    return `
    <div class="bulk-publisher">
        <div class="bulk-header">
            <div>
                <div class="badge badge-blue">🚀 MULTI-PLATFORM</div>
                <h1 class="bulk-title">Bulk Publisher</h1>
                <p class="bulk-subtitle">Đăng bài đồng thời lên nhiều nền tảng — Hỗ trợ upload CSV</p>
            </div>
            <div style="display:flex;gap:10px;">
                <button id="upload-csv-btn" class="bulk-btn bulk-btn-green">📄 Upload CSV</button>
                <button id="create-campaign-btn" class="bulk-btn bulk-btn-primary">➕ Tạo Campaign</button>
            </div>
        </div>

        <div id="bulk-stats"></div>

        <!-- CSV Drop Zone (hidden by default) -->
        <div id="csv-zone" class="csv-zone" style="display:none;">
            <div class="csv-droparea" id="csv-droparea">
                <div class="csv-drop-icon">📄</div>
                <div class="csv-drop-text">Kéo thả file CSV/Excel vào đây</div>
                <div class="csv-drop-hint">hoặc click để chọn file</div>
                <input type="file" id="csv-file-input" accept=".csv,.txt" style="display:none;">
            </div>
            <div id="csv-preview" style="display:none;">
                <div class="csv-preview-header">
                    <h3>📊 Preview bài đăng từ CSV</h3>
                    <div style="display:flex;gap:8px;">
                        <button id="csv-cancel" class="bulk-btn bulk-btn-ghost">Hủy</button>
                        <button id="csv-submit" class="bulk-btn bulk-btn-primary">🚀 Tạo tất cả Campaigns</button>
                    </div>
                </div>
                <div id="csv-table-wrap"></div>
            </div>
        </div>

        <div id="bulk-campaigns"></div>
    </div>

    <style>
    .bulk-publisher { padding:24px;max-width:1200px;margin:0 auto;font-family:var(--font-body,'Satoshi',sans-serif); }
    .bulk-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:12px; }
    .bulk-title { font-size:26px;font-weight:700;color:var(--color-text);margin:0; }
    .bulk-subtitle { color:var(--color-text-muted);font-size:14px;margin-top:4px; }
    .badge { display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;margin-bottom:8px; }
    .badge-blue { background:rgba(59,130,246,0.15);color:#60a5fa; }

    .bulk-btn { padding:10px 20px;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;transition:all 150ms; }
    .bulk-btn:hover { filter:brightness(1.1);transform:translateY(-1px); }
    .bulk-btn-primary { background:#3b82f6;color:white; }
    .bulk-btn-green { background:#10b981;color:white; }
    .bulk-btn-red { background:#ef4444;color:white; }
    .bulk-btn-ghost { background:var(--color-surface-hover);color:var(--color-text);border:1px solid var(--color-border); }
    .bulk-btn-sm { padding:6px 14px;font-size:12px; }

    .bulk-stats-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px; }
    @media(max-width:768px) { .bulk-stats-grid { grid-template-columns:repeat(2,1fr); } }
    .bulk-kpi { background:var(--color-surface);border:1px solid var(--color-border);border-radius:12px;padding:16px;text-align:center; }
    .bulk-kpi-icon { font-size:20px; }
    .bulk-kpi-val { font-size:22px;font-weight:800;margin:6px 0; }
    .bulk-kpi-label { font-size:11px;color:var(--color-text-muted); }

    /* CSV Zone */
    .csv-zone { margin-bottom:24px;animation:fadeIn .3s ease; }
    .csv-droparea { border:2px dashed var(--color-border);border-radius:16px;padding:48px 24px;text-align:center;cursor:pointer;transition:all 200ms; }
    .csv-droparea:hover,.csv-droparea.dragover { border-color:#3b82f6;background:rgba(59,130,246,0.05); }
    .csv-drop-icon { font-size:48px;margin-bottom:12px; }
    .csv-drop-text { font-size:16px;font-weight:600;color:var(--color-text);margin-bottom:4px; }
    .csv-drop-hint { font-size:12px;color:var(--color-text-muted); }
    .csv-preview-header { display:flex;align-items:center;justify-content:space-between;margin:16px 0 12px;flex-wrap:wrap;gap:12px; }
    .csv-preview-header h3 { margin:0;font-size:16px;color:var(--color-text); }
    .csv-table { width:100%;border-collapse:collapse;font-size:13px;border-radius:12px;overflow:hidden; }
    .csv-table th { background:var(--color-surface);color:var(--color-text);padding:10px 12px;text-align:left;font-weight:600;border-bottom:1px solid var(--color-border); }
    .csv-table td { padding:10px 12px;border-bottom:1px solid var(--color-border);color:var(--color-text); }
    .csv-table td input { background:transparent;border:1px solid var(--color-border);border-radius:6px;padding:4px 8px;color:var(--color-text);font-size:12px;width:100%; }

    /* Campaign cards */
    .camp-card { background:var(--color-surface);border:1px solid var(--color-border);border-radius:16px;padding:20px;margin-bottom:12px;transition:box-shadow 200ms; }
    .camp-card:hover { box-shadow:var(--shadow-md); }
    .camp-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px; }
    .camp-left { display:flex;align-items:center;gap:12px; }
    .camp-status { padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700; }
    .camp-name { margin:0;font-size:15px;color:var(--color-text); }
    .camp-content { font-size:13px;color:var(--color-text-muted);margin-bottom:12px;line-height:1.6;max-height:50px;overflow:hidden; }
    .platform-badge { padding:4px 10px;background:var(--color-surface-hover);border-radius:8px;font-size:12px;color:var(--color-text); }
    .result-chip { padding:10px;border-radius:8px;font-size:12px;font-weight:700; }
    .result-ok { background:rgba(16,185,129,0.08);color:#10b981; }
    .result-fail { background:rgba(239,68,68,0.08);color:#ef4444; }

    .camp-empty { text-align:center;padding:60px;color:var(--color-text-muted); }
    .camp-empty-icon { font-size:48px;margin-bottom:16px; }

    @keyframes fadeIn { from { opacity:0;transform:translateY(8px); } to { opacity:1;transform:translateY(0); } }
    </style>`;
}

// ── Load Campaigns ───────────────────────────────────────────
async function loadCampaigns(container) {
    try {
        const [statsRes, campsRes] = await Promise.all([
            api.get('/bulk-publish/stats'),
            api.get('/bulk-publish')
        ]);
        renderStats(container.querySelector('#bulk-stats'), statsRes.data);
        renderCampaigns(container.querySelector('#bulk-campaigns'), campsRes.data, container);
    } catch (e) {
        container.querySelector('#bulk-campaigns').innerHTML = `<div style="padding:16px;background:rgba(239,68,68,0.1);border-radius:10px;color:#f87171;">❌ ${e.message}</div>`;
    }

    container.querySelector('#create-campaign-btn').onclick = () => showCreateModal(container);
    setupCSVUpload(container);
}

// ── Stats KPI ────────────────────────────────────────────────
function renderStats(el, stats) {
    const platforms = Object.entries(stats.platformCounts || {});
    const platformBadges = platforms.map(([p, c]) => {
        const colors = { facebook: '#1877F2', instagram: '#E4405F', linkedin: '#0A66C2', tiktok: '#000', youtube: '#FF0000' };
        return `<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;background:${colors[p] || '#6b7280'}22;color:${colors[p] || 'var(--color-text-muted)'};margin-right:4px;">${p}: ${c}</span>`;
    }).join('');

    el.innerHTML = `
    <div class="bulk-stats-grid">
        ${kpi('📦', 'Total Campaigns', stats.total)}
        ${kpi('✅', 'Published', stats.published, '#10b981')}
        ${kpi('📝', 'Draft', stats.draft)}
        ${kpi('📊', 'Total Posts', stats.totalPosts, '#3b82f6')}
    </div>
    ${platforms.length ? `<div style="padding:10px 16px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:10px;font-size:12px;color:var(--color-text-muted);margin-bottom:20px;">Platforms: ${platformBadges}</div>` : ''}`;
}

function kpi(icon, label, value, color = 'var(--color-text)') {
    return `<div class="bulk-kpi">
        <div class="bulk-kpi-icon">${icon}</div>
        <div class="bulk-kpi-val" style="color:${color};">${value}</div>
        <div class="bulk-kpi-label">${label}</div>
    </div>`;
}

// ── CSV Upload ───────────────────────────────────────────────
function setupCSVUpload(container) {
    const btn = container.querySelector('#upload-csv-btn');
    const zone = container.querySelector('#csv-zone');
    const droparea = container.querySelector('#csv-droparea');
    const fileInput = container.querySelector('#csv-file-input');
    const preview = container.querySelector('#csv-preview');
    const tableWrap = container.querySelector('#csv-table-wrap');
    let parsedRows = [];

    btn.onclick = () => {
        zone.style.display = zone.style.display === 'none' ? 'block' : 'none';
    };

    // Drag events
    droparea.addEventListener('dragover', e => { e.preventDefault(); droparea.classList.add('dragover'); });
    droparea.addEventListener('dragleave', () => droparea.classList.remove('dragover'));
    droparea.addEventListener('drop', e => {
        e.preventDefault();
        droparea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) processCSV(file);
    });
    droparea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => {
        if (e.target.files[0]) processCSV(e.target.files[0]);
    });

    function processCSV(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            parsedRows = parseCSV(text);
            if (parsedRows.length === 0) {
                window.Toast?.show('CSV rỗng hoặc không đúng format', 'error');
                return;
            }
            droparea.style.display = 'none';
            preview.style.display = 'block';
            renderCSVPreview(tableWrap, parsedRows);
            window.Toast?.show(`Đã đọc ${parsedRows.length} bài đăng từ CSV`, 'success');
        };
        reader.readAsText(file);
    }

    container.querySelector('#csv-cancel').onclick = () => {
        preview.style.display = 'none';
        droparea.style.display = '';
        parsedRows = [];
    };

    container.querySelector('#csv-submit').onclick = async () => {
        if (!parsedRows.length) return;
        try {
            const csvData = parsedRows.map(r => `${r.name || 'Campaign'},${r.text},${r.platforms}`).join('\n');
            await api.post('/bulk-publish/upload-csv', { csvData: `name,text,platforms\n${csvData}` });
            preview.style.display = 'none';
            droparea.style.display = '';
            zone.style.display = 'none';
            parsedRows = [];
            loadCampaigns(container);
            window.Toast?.show('Đã tạo campaigns từ CSV thành công!', 'success');
        } catch (e) {
            window.Toast?.show(e.message, 'error');
        }
    };
}

function parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const nameIdx = headers.indexOf('name');
    const textIdx = headers.indexOf('text');
    const platIdx = headers.indexOf('platforms');

    return lines.slice(1).filter(l => l.trim()).map(line => {
        const cols = line.split(',').map(c => c.trim());
        return {
            name: nameIdx >= 0 ? cols[nameIdx] : 'Campaign',
            text: textIdx >= 0 ? cols[textIdx] : cols[0],
            platforms: platIdx >= 0 ? cols[platIdx] : 'facebook'
        };
    });
}

function renderCSVPreview(wrap, rows) {
    wrap.innerHTML = `
    <table class="csv-table">
        <thead><tr><th>#</th><th>Tên</th><th>Nội dung</th><th>Platforms</th></tr></thead>
        <tbody>
            ${rows.map((r, i) => `
            <tr>
                <td>${i + 1}</td>
                <td><input value="${escHTML(r.name)}" data-idx="${i}" data-field="name"></td>
                <td><input value="${escHTML(r.text)}" data-idx="${i}" data-field="text" style="min-width:200px;"></td>
                <td><input value="${escHTML(r.platforms)}" data-idx="${i}" data-field="platforms"></td>
            </tr>`).join('')}
        </tbody>
    </table>
    <div style="margin-top:8px;font-size:12px;color:var(--color-text-muted);">💡 Chỉnh sửa trực tiếp trên bảng trước khi tạo campaigns</div>`;

    wrap.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('input', () => {
            const idx = parseInt(inp.dataset.idx);
            const field = inp.dataset.field;
            rows[idx][field] = inp.value;
        });
    });
}

// ── Campaign List ────────────────────────────────────────────
function renderCampaigns(el, campaigns, container) {
    if (!campaigns.length) {
        el.innerHTML = `<div class="camp-empty">
            <div class="camp-empty-icon">🚀</div>
            <div style="font-size:16px;font-weight:600;margin-bottom:8px;">Chưa có Campaign nào</div>
            <div style="font-size:13px;">Tạo campaign mới hoặc upload CSV để bắt đầu</div>
        </div>`;
        return;
    }

    const pIcons = { facebook: '📘', instagram: '📸', twitter: '🐦', linkedin: '💼', tiktok: '🎵', youtube: '📺' };
    const sts = {
        draft:      { bg: '#6b7280', label: '📝 Draft' },
        scheduled:  { bg: '#f59e0b', label: '📅 Scheduled' },
        publishing: { bg: '#8b5cf6', label: '⏳ Publishing...' },
        completed:  { bg: '#10b981', label: '✅ Done' },
        partial:    { bg: '#f59e0b', label: '⚠️ Partial' },
        failed:     { bg: '#ef4444', label: '❌ Failed' }
    };

    el.innerHTML = campaigns.map(camp => {
        const st = sts[camp.status] || sts.draft;
        return `
        <div class="camp-card">
            <div class="camp-header">
                <div class="camp-left">
                    <span class="camp-status" style="background:${st.bg}22;color:${st.bg};">${st.label}</span>
                    <h3 class="camp-name">${camp.name}</h3>
                </div>
                <div style="display:flex;gap:8px;">
                    ${camp.status === 'draft' ? `<button onclick="window._publishCamp('${camp.id}')" class="bulk-btn bulk-btn-green bulk-btn-sm">🚀 Publish</button>` : ''}
                    <button onclick="window._deleteCamp('${camp.id}')" class="bulk-btn bulk-btn-red bulk-btn-sm">🗑️</button>
                </div>
            </div>
            <div class="camp-content">${camp.content?.text || '<i>No content</i>'}</div>
            <div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;">
                ${(camp.platforms || []).map(p => `<span class="platform-badge">${pIcons[p] || '📱'} ${p}</span>`).join('')}
            </div>
            ${camp.results?.length ? `
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;">
                    ${camp.results.map(r => `
                        <div class="result-chip ${r.status === 'success' ? 'result-ok' : 'result-fail'}">
                            ${pIcons[r.platform] || '📱'} ${r.platform} — ${r.status === 'success' ? '✅' : '❌'}
                            ${r.error ? `<div style="font-size:10px;margin-top:2px;">${r.error}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>`;
    }).join('');

    window._publishCamp = async (id) => {
        try { await api.post(`/bulk-publish/${id}/publish`); loadCampaigns(container); window.Toast?.show('Campaign published!', 'success'); } catch (e) { window.Toast?.show(e.message, 'error'); }
    };
    window._deleteCamp = async (id) => {
        if (confirm('Xóa campaign này?')) {
            try { await api.delete(`/bulk-publish/${id}`); loadCampaigns(container); } catch (e) { window.Toast?.show(e.message, 'error'); }
        }
    };
}

// ── Create Campaign Modal ────────────────────────────────────
function showCreateModal(container) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
    overlay.innerHTML = `
    <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:20px;width:560px;max-height:90vh;overflow-y:auto;padding:28px;">
        <h2 style="margin:0 0 20px;color:var(--color-text);font-size:20px;">🚀 Tạo Campaign đa nền tảng</h2>
        
        <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">Tên Campaign</label>
        <input id="camp-name" type="text" placeholder="VD: Promo Tháng 5" class="bulk-input" style="width:100%;margin-bottom:16px;">

        <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">Nội dung chính</label>
        <textarea id="camp-text" placeholder="Nội dung bài đăng..." class="bulk-textarea" style="min-height:100px;margin-bottom:16px;"></textarea>

        <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">URL hình ảnh (tuỳ chọn)</label>
        <input id="camp-image" type="text" placeholder="https://example.com/image.jpg" class="bulk-input" style="width:100%;margin-bottom:16px;">

        <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:8px;">Chọn nền tảng</label>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;">
            ${['facebook','instagram','linkedin','tiktok'].map(p => `
                <label class="platform-check">
                    <input type="checkbox" value="${p}" class="camp-platform" ${p === 'facebook' ? 'checked' : ''}>
                    ${{ facebook: '📘', instagram: '📸', linkedin: '💼', tiktok: '🎵' }[p]} ${p}
                </label>
            `).join('')}
        </div>

        <div style="display:flex;justify-content:flex-end;gap:12px;">
            <button id="cancel-camp" class="bulk-btn bulk-btn-ghost">Hủy</button>
            <button id="save-camp" class="bulk-btn bulk-btn-primary">🚀 Tạo Campaign</button>
        </div>
    </div>
    <style>
    .bulk-input { padding:10px 16px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:10px;color:var(--color-text);font-size:13px;outline:none; }
    .bulk-textarea { width:100%;padding:12px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:10px;color:var(--color-text);font-size:13px;outline:none;resize:vertical;font-family:inherit; }
    .platform-check { display:flex;align-items:center;gap:6px;padding:8px 14px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:10px;cursor:pointer;font-size:13px;color:var(--color-text); }
    </style>`;

    document.body.appendChild(overlay);
    overlay.querySelector('#cancel-camp').onclick = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#save-camp').onclick = async () => {
        const name = overlay.querySelector('#camp-name').value.trim();
        const text = overlay.querySelector('#camp-text').value.trim();
        const imageUrl = overlay.querySelector('#camp-image').value.trim();
        const platforms = [...overlay.querySelectorAll('.camp-platform:checked')].map(c => c.value);

        if (!text) { window.Toast?.show('Nhập nội dung bài đăng!', 'warning'); return; }
        if (!platforms.length) { window.Toast?.show('Chọn ít nhất 1 nền tảng!', 'warning'); return; }

        try {
            await api.post('/bulk-publish', { name: name || 'Campaign', text, imageUrl, platforms });
            overlay.remove();
            loadCampaigns(container);
            window.Toast?.show('Campaign đã được tạo!', 'success');
        } catch (e) { window.Toast?.show(e.message, 'error'); }
    };
}

function escHTML(str) { return String(str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
