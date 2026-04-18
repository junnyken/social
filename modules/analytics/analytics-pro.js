// ============================================================
// Analytics Pro Dashboard — Phase X
// Unified dashboard for Competitor Benchmarking, UTM Tracking, and Content Heatmap
// ============================================================

import { api } from '../../assets/api-client.js';

export function renderAnalyticsPro(container) {
    container.innerHTML = buildHTML();
    bindEvents(container);
    return () => {}; // cleanup
}

function buildHTML() {
    return `
    <div style="padding:24px;max-width:1200px;margin:0 auto;font-family:'Satoshi',sans-serif;">
        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;">
            <div>
                <div style="display:inline-block;padding:4px 12px;background:rgba(139,92,246,0.15);color:#a78bfa;border-radius:20px;font-size:11px;font-weight:700;margin-bottom:8px;">★ PRO FEATURE</div>
                <h1 style="font-size:26px;font-weight:700;color:#f1f5f9;margin:0;">
                    Advanced Analytics
                </h1>
                <p style="color:#94a3b8;font-size:14px;margin-top:4px;">Competitor Benchmarking, UTM Tracking & Content Heatmaps</p>
            </div>
        </div>

        <!-- Pro Tabs -->
        <div id="analytics-tabs" style="display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap;">
            <button class="analytics-tab active" data-tab="heatmap" style="${tabStyle(true)}">🔥 Content Heatmap</button>
            <button class="analytics-tab" data-tab="competitors" style="${tabStyle(false)}">🏆 Competitor Benchmarking</button>
            <button class="analytics-tab" data-tab="utm" style="${tabStyle(false)}">🔗 UTM Link Tracking</button>
        </div>

        <!-- Tab Contents -->
        <div id="analytics-tab-content">
            ${loadingHTML('Đang tải dữ liệu...')}
        </div>
    </div>`;
}

function tabStyle(active) {
    return `
        padding:10px 20px;border-radius:10px;border:1px solid ${active ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.08)'};
        background:${active ? 'linear-gradient(135deg,rgba(139,92,246,0.2),rgba(59,130,246,0.2))' : 'rgba(255,255,255,0.03)'};
        color:${active ? '#c4b5fd' : '#94a3b8'};font-size:13px;font-weight:600;cursor:pointer;
        transition:all 0.2s ease;
    `.replace(/\n/g, '');
}

// ═══════════════════════════════════════════════════════════════
// TABS RENDERERS
// ═══════════════════════════════════════════════════════════════

async function initHeatmapTab(container) {
    try {
        const [heatmapRes, topPostsRes, typesRes] = await Promise.all([
            api.get('/analytics/heatmap'),
            api.get('/analytics/top-posts?limit=5'),
            api.get('/analytics/content-types')
        ]);

        container.innerHTML = `
        <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;">
            <div style="${cardStyle()}">
                <h3 style="margin:0 0 16px;color:#f1f5f9;">🔥 Hiệu suất Đăng bài (Engagement Heatmap)</h3>
                ${renderHeatmap(heatmapRes.data.heatmap)}
            </div>
            <div style="${cardStyle()}">
                <h3 style="margin:0 0 16px;color:#f1f5f9;">📊 Hiệu suất theo Định dạng</h3>
                ${renderContentTypes(typesRes.data)}
            </div>
        </div>
        <div style="${cardStyle()};margin-top:20px;">
            <h3 style="margin:0 0 16px;color:#f1f5f9;">⭐ Top 5 Bài viết Tốt nhất</h3>
            ${renderTopPosts(topPostsRes.data)}
        </div>`;
    } catch (e) {
        container.innerHTML = errorHTML('Lỗi tải dữ liệu heatmap: ' + e.message);
    }
}

async function initCompetitorsTab(container) {
    try {
        const [competitorsRes, benchmarkRes] = await Promise.all([
            api.get('/competitors'),
            api.get('/competitors/benchmark')
        ]);

        container.innerHTML = `
        <div style="display:flex;justify-content:flex-end;margin-bottom:16px;">
            <button id="add-competitor-btn" style="${btnStyle()}">➕ Thêm Đối thủ</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
            <div style="${cardStyle()}">
                <h3 style="margin:0 0 16px;color:#f1f5f9;">🏆 Bảng Xếp Hạng</h3>
                ${renderRankings(benchmarkRes.data.benchmark?.rankings || [])}
            </div>
            <div style="${cardStyle()}">
                <h3 style="margin:0 0 16px;color:#f1f5f9;">Radar Analytics</h3>
                <div style="color:#94a3b8;font-size:13px;">(Cần tích hợp Chart.js Radar mode)</div>
                <pre style="font-size:11px;color:#a78bfa;background:rgba(0,0,0,0.2);padding:10px;border-radius:8px;">${JSON.stringify(benchmarkRes.data.radarData, null, 2)}</pre>
            </div>
        </div>
        <div style="${cardStyle()}">
            <h3 style="margin:0 0 16px;color:#f1f5f9;">Bảng thông số chi tiết</h3>
            ${renderCompetitorTable(competitorsRes.data)}
        </div>`;

        // Mock add button behavior
        container.querySelector('#add-competitor-btn').onclick = async () => {
            const name = prompt('Nhập tên Page đối thủ:');
            if (name) {
                await api.post('/competitors', { name, followers: Math.floor(Math.random()*10000), engagementRate: 2 + Math.random()*3 });
                initCompetitorsTab(container);
            }
        };
    } catch (e) {
        container.innerHTML = errorHTML('Lỗi tải dữ liệu đối thủ: ' + e.message);
    }
}

async function initUtmTab(container) {
    try {
        const analyticsRes = await api.get('/utm/analytics');
        const data = analyticsRes.data;

        container.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px;">
            <div style="${kpiStyle()}">
                <div class="kpi-label">Tổng Clicks</div>
                <div class="kpi-value">${data.totalClicks || 0}</div>
            </div>
            <div style="${kpiStyle()}">
                <div class="kpi-label">Tổng Links</div>
                <div class="kpi-value">${data.totalLinks || 0}</div>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 2fr;gap:20px;margin-bottom:20px;">
            <div style="${cardStyle()}">
                <h3 style="margin:0 0 16px;color:#f1f5f9;">Thêm UTM Link Mới</h3>
                <input id="utm-url" placeholder="Original URL (https://...)" style="${inputStyle()};margin-bottom:12px;width:100%;"><br>
                <input id="utm-campaign" placeholder="Campaign (vd: tet_2026)" style="${inputStyle()};margin-bottom:12px;width:100%;"><br>
                <button id="create-utm-btn" style="${btnStyle('#10b981')}">Tạo Link Tracking</button>
            </div>
            <div style="${cardStyle()}">
                <h3 style="margin:0 0 16px;color:#f1f5f9;">Top Performing Links</h3>
                ${renderUtmTable(data.topLinks || [])}
            </div>
        </div>`;

        container.querySelector('#create-utm-btn').onclick = async () => {
            const url = container.querySelector('#utm-url').value;
            const campaign = container.querySelector('#utm-campaign').value;
            if (url) {
                await api.post('/utm', { url, campaign, source: 'socialhub' });
                initUtmTab(container);
            }
        };
    } catch (e) {
        container.innerHTML = errorHTML('Lỗi tải UTM: ' + e.message);
    }
}

// ═══════════════════════════════════════════════════════════════
// EVENT BINDING & UI HELPERS
// ═══════════════════════════════════════════════════════════════

function bindEvents(container) {
    const tabContent = container.querySelector('#analytics-tab-content');
    
    const loadTab = (tabId) => {
        tabContent.innerHTML = loadingHTML('Đang tải dữ liệu...');
        if (tabId === 'heatmap') initHeatmapTab(tabContent);
        if (tabId === 'competitors') initCompetitorsTab(tabContent);
        if (tabId === 'utm') initUtmTab(tabContent);
    };

    container.querySelectorAll('.analytics-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            container.querySelectorAll('.analytics-tab').forEach(t => { t.style.cssText = tabStyle(false); });
            tab.style.cssText = tabStyle(true);
            loadTab(tab.dataset.tab);
        });
    });

    // Load default
    loadTab('heatmap');
}

function renderHeatmap(heatmapData) {
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    
    let html = '<div style="overflow-x:auto;"><div style="display:grid;grid-template-columns:30px repeat(24,1fr);gap:2px;min-width:600px;">';
    html += '<div></div>';
    for (let h = 0; h < 24; h++) html += `<div style="font-size:9px;color:#64748b;text-align:center;">${h}</div>`;
    
    days.forEach((day, i) => {
        html += `<div style="font-size:11px;color:#94a3b8;display:flex;align-items:center;">${dayLabels[i]}</div>`;
        const vals = heatmapData[day] || Array(24).fill(0);
        vals.forEach(v => {
            const intensity = Math.min(1, v / 100);
            const b = intensity === 0 ? 'rgba(255,255,255,0.03)' : `rgba(239, 68, 68, ${intensity * 0.9})`;
            html += `<div style="width:100%;aspect-ratio:1;background:${b};border-radius:2px;" title="Tương tác: ${v}%"></div>`;
        });
    });
    return html + '</div></div>';
}

function renderContentTypes(types) {
    if (!types.length) return '<div style="color:#94a3b8;font-size:13px;">Chưa có dữ liệu.</div>';
    const icons = { image: '🖼️', video: '🎥', link: '🔗', text: '📝' };
    return types.map(t => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
            <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-size:20px;">${icons[t.type] || '📄'}</span>
                <div>
                    <div style="color:#f1f5f9;font-size:13px;text-transform:capitalize;">${t.type}</div>
                    <div style="color:#94a3b8;font-size:11px;">${t.count} posts (${t.percentage}%)</div>
                </div>
            </div>
            <div style="text-align:right;">
                <div style="color:#10b981;font-size:14px;font-weight:700;">${t.avgEngagement}</div>
                <div style="color:#64748b;font-size:11px;">Avg. Engagement</div>
            </div>
        </div>
    `).join('');
}

function renderTopPosts(posts) {
    if (!posts.length) return '<div style="color:#94a3b8;font-size:13px;">Chưa có dữ liệu đăng bài.</div>';
    return `<div style="display:grid;gap:10px;">` + posts.map((p, i) => `
        <div style="display:flex;gap:16px;align-items:center;padding:12px;background:rgba(255,255,255,0.03);border-radius:10px;">
            <div style="font-size:24px;font-weight:800;color:rgba(255,255,255,0.1);width:30px;text-align:center;">#${i+1}</div>
            <div style="flex:1;">
                <div style="color:#e2e8f0;font-size:13px;margin-bottom:6px;">${p.content || '<i>[Bài đăng không có văn bản]</i>'}</div>
                <div style="display:flex;gap:12px;font-size:11px;color:#94a3b8;">
                    <span>👍 ${p.likes}</span>
                    <span>💬 ${p.comments}</span>
                    <span>🔗 ${p.shares}</span>
                    <span>👁️ ${p.reach} Reach</span>
                </div>
            </div>
            <div style="text-align:right;background:rgba(59,130,246,0.1);padding:6px 12px;border-radius:8px;">
                <div style="color:#60a5fa;font-size:16px;font-weight:800;">${p.engagement}</div>
                <div style="color:#94a3b8;font-size:10px;">Score</div>
            </div>
        </div>
    `).join('') + `</div>`;
}

function renderRankings(rankings) {
    if (!rankings.length) return '<div style="color:#94a3b8;font-size:13px;">Chưa có đối thủ nào.</div>';
    return `<div style="display:grid;gap:8px;">` + rankings.map((r, i) => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:${i===0?'rgba(245,158,11,0.1)':'rgba(255,255,255,0.03)'};border-radius:10px;">
            <div style="display:flex;align-items:center;gap:12px;">
                <div style="font-size:18px;">${i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)}</div>
                <div style="color:${i===0?'#f59e0b':'#f1f5f9'};font-size:14px;font-weight:600;">${r.name}</div>
            </div>
            <div style="text-align:right;">
                <div style="color:#10b981;font-size:14px;font-weight:700;">${r.score}</div>
                <div style="color:#94a3b8;font-size:10px;">Index Score</div>
            </div>
        </div>
    `).join('') + `</div>`;
}

function renderCompetitorTable(competitors) {
    if (!competitors.length) return '';
    return `
    <table style="width:100%;border-collapse:collapse;font-size:13px;text-align:left;">
        <thead>
            <tr style="color:#94a3b8;border-bottom:1px solid rgba(255,255,255,0.1);">
                <th style="padding:10px;">Tên Đối thủ</th>
                <th style="padding:10px;">Followers</th>
                <th style="padding:10px;">Engagement Rate</th>
                <th style="padding:10px;">Avg Likes</th>
                <th style="padding:10px;">Tần suất đăng</th>
            </tr>
        </thead>
        <tbody>
            ${competitors.map(c => `
                <tr style="border-bottom:1px solid rgba(255,255,255,0.05);color:#e2e8f0;">
                    <td style="padding:12px 10px;font-weight:600;">${c.name}</td>
                    <td style="padding:12px 10px;">${c.metrics?.followers?.toLocaleString()||0}</td>
                    <td style="padding:12px 10px;color:#10b981;">${c.metrics?.engagementRate||0}%</td>
                    <td style="padding:12px 10px;">${c.metrics?.avgLikes||0}</td>
                    <td style="padding:12px 10px;">${c.metrics?.postingFrequency||0} bài/tuần</td>
                </tr>
            `).join('')}
        </tbody>
    </table>`;
}

function renderUtmTable(links) {
    if (!links.length) return '<div style="color:#94a3b8;font-size:13px;">Chưa có UTM link nào.</div>';
    return `<div style="display:grid;gap:8px;">` + links.map(l => `
        <div style="padding:12px;background:rgba(255,255,255,0.03);border-radius:10px;display:flex;justify-content:space-between;align-items:center;">
            <div>
                <div style="color:#f1f5f9;font-size:13px;margin-bottom:4px;word-break:break-all;">${l.url}</div>
                <div style="color:#3b82f6;font-size:11px;">/api/utm/redirect/${l.shortCode} <span style="color:#94a3b8;margin-left:8px;">[${l.campaign || 'no-campaign'}]</span></div>
            </div>
            <div style="text-align:right;min-width:60px;">
                <div style="color:#10b981;font-size:18px;font-weight:800;">${l.clicks}</div>
                <div style="color:#94a3b8;font-size:10px;">Clicks</div>
            </div>
        </div>
    `).join('') + `</div>`;
}

// ═══════════════════════════════════════════════════════════════
// STYLE HELPERS
// ═══════════════════════════════════════════════════════════════
function cardStyle() { return 'background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:20px;'; }
function kpiStyle() { return 'background:linear-gradient(135deg,rgba(59,130,246,0.1),rgba(139,92,246,0.1));border:1px solid rgba(139,92,246,0.2);border-radius:12px;padding:16px;text-align:center;'; }
function inputStyle() { return 'padding:10px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#f1f5f9;font-size:13px;outline:none;'; }
function btnStyle(color = '#8b5cf6') { return `padding:10px 20px;background:${color};color:white;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;`; }
function loadingHTML(msg) { return `<div style="text-align:center;padding:40px;color:#94a3b8;"><div style="font-size:28px;margin-bottom:12px;animation:pulse 1.5s infinite;">🧮</div><div style="font-size:14px;">${msg}</div></div>`; }
function errorHTML(msg) { return `<div style="padding:16px;background:rgba(239,68,68,0.1);border-radius:10px;color:#f87171;font-size:13px;">❌ ${msg}</div>`; }
