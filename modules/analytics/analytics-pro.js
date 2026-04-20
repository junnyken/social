// ============================================================
// Analytics Pro Dashboard — Phase 2
// Premium dashboard: Heatmap, Demographics, Growth, Competitors, UTM
// ============================================================

import { api } from '../../assets/api-client.js';
import { renderPageSelector, getSelectedPageId } from '../../assets/components/page-selector.js';

export function renderAnalyticsPro(container) {
    container.innerHTML = buildHTML();
    renderPageSelector('analytics-pro-page-selector', { style: 'font-size:13px;' });
    bindEvents(container);
    return () => {};
}

function buildHTML() {
    return `
    <div style="padding:24px;max-width:1400px;margin:0 auto;font-family:'Satoshi',sans-serif;">
        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:12px;">
            <div>
                <div style="display:inline-block;padding:4px 14px;background:linear-gradient(135deg,rgba(139,92,246,0.2),rgba(236,72,153,0.2));color:#c084fc;border-radius:20px;font-size:11px;font-weight:700;margin-bottom:8px;letter-spacing:0.5px;">★ PRO ANALYTICS</div>
                <h1 style="font-size:28px;font-weight:800;color:#f1f5f9;margin:0;background:linear-gradient(135deg,#f1f5f9,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">
                    Advanced Analytics
                </h1>
                <p style="color:#94a3b8;font-size:14px;margin-top:4px;">Phân tích chuyên sâu · Heatmap · Demographics · Growth · Competitor</p>
            </div>
            <div id="analytics-pro-page-selector"></div>
        </div>

        <!-- Pro Tabs -->
        <div id="pro-tabs" style="display:flex;gap:6px;margin-bottom:24px;flex-wrap:wrap;background:rgba(255,255,255,0.02);padding:6px;border-radius:14px;border:1px solid rgba(255,255,255,0.05);">
            <button class="pro-tab active" data-tab="heatmap" style="${tabStyle(true)}">🔥 Heatmap & Best Time</button>
            <button class="pro-tab" data-tab="demographics" style="${tabStyle(false)}">👥 Demographics</button>
            <button class="pro-tab" data-tab="growth" style="${tabStyle(false)}">📈 Growth</button>
            <button class="pro-tab" data-tab="competitors" style="${tabStyle(false)}">🏆 Competitors</button>
            <button class="pro-tab" data-tab="utm" style="${tabStyle(false)}">🔗 UTM Tracking</button>
        </div>

        <!-- Tab Content -->
        <div id="pro-tab-content">
            ${loadingHTML('Đang tải dữ liệu phân tích...')}
        </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// TAB RENDERERS
// ═══════════════════════════════════════════════════════════════

async function initHeatmapTab(container) {
    try {
        const pageId = getSelectedPageId();
        const [heatmapRes, topPostsRes, typesRes] = await Promise.all([
            api.get(`/analytics-enhanced/best-time?pageId=${pageId}`),
            api.get(`/analytics/top-posts?limit=5`),
            api.get(`/analytics/content-types`)
        ]);

        const data = heatmapRes.data;
        const bestTimes = data.bestTimes || [];

        container.innerHTML = `
        <!-- Best Time Suggestions -->
        ${bestTimes.length > 0 ? `
        <div style="${cardStyle()};margin-bottom:20px;background:linear-gradient(135deg,rgba(16,185,129,0.08),rgba(59,130,246,0.08));border-color:rgba(16,185,129,0.2);">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
                <div style="font-size:22px;">🎯</div>
                <div>
                    <h3 style="margin:0;color:#10b981;font-size:15px;">AI Best Time to Post</h3>
                    <p style="margin:0;color:#64748b;font-size:12px;">Dựa trên phân tích ${data.totalPostsAnalyzed || 0} bài viết gần nhất</p>
                </div>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
                ${bestTimes.map((t, i) => `
                    <div style="padding:10px 16px;background:rgba(16,185,129,0.12);border-radius:10px;border:1px solid rgba(16,185,129,0.2);text-align:center;">
                        <div style="font-size:10px;color:#64748b;text-transform:capitalize;">${t.day}</div>
                        <div style="font-size:18px;font-weight:800;color:#10b981;">${String(t.hour).padStart(2,'0')}:00</div>
                        <div style="font-size:10px;color:#94a3b8;">Score: ${t.score}%</div>
                    </div>
                `).join('')}
            </div>
        </div>` : ''}

        <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;">
            <div style="${cardStyle()}">
                <h3 style="margin:0 0 16px;color:#f1f5f9;font-size:15px;">🔥 Engagement Heatmap</h3>
                ${renderHeatmap(data.heatmap || {})}
            </div>
            <div style="${cardStyle()}">
                <h3 style="margin:0 0 16px;color:#f1f5f9;font-size:15px;">📊 Hiệu suất theo Định dạng</h3>
                ${renderContentTypes(typesRes.data || [])}
            </div>
        </div>
        <div style="${cardStyle()};margin-top:20px;">
            <h3 style="margin:0 0 16px;color:#f1f5f9;font-size:15px;">⭐ Top 5 Bài viết Tốt nhất</h3>
            ${renderTopPosts(topPostsRes.data || [])}
        </div>`;
    } catch (e) {
        container.innerHTML = errorHTML('Lỗi tải heatmap: ' + e.message);
    }
}

async function initDemographicsTab(container) {
    try {
        const pageId = getSelectedPageId();
        const res = await api.get(`/analytics-enhanced/demographics?pageId=${pageId}`);
        const data = res.data;

        const hasData = Object.keys(data.ageGender?.male || {}).length > 0 ||
                        Object.keys(data.ageGender?.female || {}).length > 0;

        if (!hasData) {
            container.innerHTML = `
            <div style="${cardStyle()};text-align:center;padding:60px 40px;">
                <div style="font-size:48px;margin-bottom:16px;">👥</div>
                <h3 style="color:#f1f5f9;margin:0 0 8px;">Chưa có dữ liệu Demographics</h3>
                <p style="color:#94a3b8;font-size:13px;max-width:400px;margin:0 auto;">
                    ${data.note || 'Facebook yêu cầu Page phải có ít nhất 100 followers để cung cấp dữ liệu nhân khẩu học. Hãy kết nối Facebook Page để xem dữ liệu.'}
                </p>
            </div>`;
            return;
        }

        // Process age/gender data for chart
        const ageRanges = new Set();
        ['male','female'].forEach(g => Object.keys(data.ageGender[g] || {}).forEach(a => ageRanges.add(a)));
        const sortedAgeRanges = [...ageRanges].sort();
        const maleData = sortedAgeRanges.map(a => data.ageGender.male?.[a] || 0);
        const femaleData = sortedAgeRanges.map(a => data.ageGender.female?.[a] || 0);
        const totalFollowers = [...maleData, ...femaleData].reduce((a,b) => a+b, 0);

        // Top countries
        const topCountries = Object.entries(data.countries || {}).sort((a,b) => b[1]-a[1]).slice(0, 8);
        // Top cities
        const topCities = Object.entries(data.cities || {}).sort((a,b) => b[1]-a[1]).slice(0, 8);

        container.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
            <!-- Age/Gender Chart -->
            <div style="${cardStyle()}">
                <h3 style="margin:0 0 16px;color:#f1f5f9;font-size:15px;">📊 Phân bổ Độ tuổi & Giới tính</h3>
                <div style="display:grid;gap:8px;">
                    ${sortedAgeRanges.map(age => {
                        const m = data.ageGender.male?.[age] || 0;
                        const f = data.ageGender.female?.[age] || 0;
                        const mPct = totalFollowers > 0 ? Math.round((m / totalFollowers) * 100) : 0;
                        const fPct = totalFollowers > 0 ? Math.round((f / totalFollowers) * 100) : 0;
                        return `<div style="display:grid;grid-template-columns:60px 1fr 1fr;gap:8px;align-items:center;">
                            <div style="color:#94a3b8;font-size:12px;font-weight:600;">${age}</div>
                            <div style="position:relative;height:24px;background:rgba(255,255,255,0.03);border-radius:6px;overflow:hidden;">
                                <div style="position:absolute;right:0;top:0;height:100%;width:${mPct * 2}%;background:linear-gradient(90deg,rgba(59,130,246,0.6),rgba(59,130,246,0.3));border-radius:6px;"></div>
                                <span style="position:absolute;right:4px;top:3px;font-size:10px;color:#93c5fd;">${m.toLocaleString()} (${mPct}%)</span>
                            </div>
                            <div style="position:relative;height:24px;background:rgba(255,255,255,0.03);border-radius:6px;overflow:hidden;">
                                <div style="position:absolute;left:0;top:0;height:100%;width:${fPct * 2}%;background:linear-gradient(90deg,rgba(236,72,153,0.3),rgba(236,72,153,0.6));border-radius:6px;"></div>
                                <span style="position:absolute;left:4px;top:3px;font-size:10px;color:#f9a8d4;">${f.toLocaleString()} (${fPct}%)</span>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
                <div style="display:flex;gap:16px;margin-top:12px;justify-content:center;">
                    <span style="font-size:11px;color:#93c5fd;">🔵 Nam</span>
                    <span style="font-size:11px;color:#f9a8d4;">🟣 Nữ</span>
                </div>
            </div>

            <!-- Top Countries + Cities -->
            <div style="display:grid;gap:20px;">
                <div style="${cardStyle()}">
                    <h3 style="margin:0 0 12px;color:#f1f5f9;font-size:15px;">🌍 Top Quốc gia</h3>
                    ${topCountries.length > 0 ? topCountries.map(([country, count], i) => `
                        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
                            <div style="display:flex;align-items:center;gap:8px;">
                                <span style="color:#94a3b8;font-size:12px;width:20px;">${i+1}.</span>
                                <span style="color:#e2e8f0;font-size:13px;">${country}</span>
                            </div>
                            <span style="color:#a78bfa;font-size:13px;font-weight:600;">${count.toLocaleString()}</span>
                        </div>
                    `).join('') : '<p style="color:#64748b;font-size:12px;">Chưa có dữ liệu</p>'}
                </div>
                <div style="${cardStyle()}">
                    <h3 style="margin:0 0 12px;color:#f1f5f9;font-size:15px;">🏙️ Top Thành phố</h3>
                    ${topCities.length > 0 ? topCities.map(([city, count], i) => `
                        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
                            <div style="display:flex;align-items:center;gap:8px;">
                                <span style="color:#94a3b8;font-size:12px;width:20px;">${i+1}.</span>
                                <span style="color:#e2e8f0;font-size:13px;">${city}</span>
                            </div>
                            <span style="color:#10b981;font-size:13px;font-weight:600;">${count.toLocaleString()}</span>
                        </div>
                    `).join('') : '<p style="color:#64748b;font-size:12px;">Chưa có dữ liệu</p>'}
                </div>
            </div>
        </div>`;
    } catch (e) {
        container.innerHTML = errorHTML('Lỗi tải demographics: ' + e.message);
    }
}

async function initGrowthTab(container) {
    try {
        const pageId = getSelectedPageId();
        const res = await api.get(`/analytics-enhanced/growth?pageId=${pageId}`);
        const data = res.data;

        if (!data.dates?.length || data.dates.length === 0) {
            container.innerHTML = `
            <div style="${cardStyle()};text-align:center;padding:60px 40px;">
                <div style="font-size:48px;margin-bottom:16px;">📈</div>
                <h3 style="color:#f1f5f9;margin:0 0 8px;">Chưa có dữ liệu tăng trưởng</h3>
                <p style="color:#94a3b8;font-size:13px;">Kết nối Facebook Page để theo dõi tăng trưởng followers theo ngày.</p>
            </div>`;
            return;
        }

        const totalAdds = data.adds.reduce((a,b) => a+b, 0);
        const totalRemoves = data.removes.reduce((a,b) => a+b, 0);
        const totalNet = totalAdds - totalRemoves;
        const currentFans = data.totalFans[data.totalFans.length - 1] || 0;
        const growthPct = currentFans > 0 ? ((totalNet / currentFans) * 100).toFixed(2) : 0;

        container.innerHTML = `
        <!-- KPIs -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;">
            ${kpiCard('👥 Followers', currentFans.toLocaleString(), '#f1f5f9')}
            ${kpiCard('📈 Đã theo dõi', `+${totalAdds}`, '#10b981')}
            ${kpiCard('📉 Bỏ theo dõi', `-${totalRemoves}`, '#ef4444')}
            ${kpiCard('📊 Net Growth', `${totalNet >= 0 ? '+' : ''}${totalNet} (${growthPct}%)`, totalNet >= 0 ? '#10b981' : '#ef4444')}
        </div>

        <!-- Growth Chart (CSS-based bar chart) -->
        <div style="${cardStyle()}">
            <h3 style="margin:0 0 16px;color:#f1f5f9;font-size:15px;">📈 Biểu đồ Tăng trưởng Followers</h3>
            <div style="display:flex;align-items:flex-end;gap:3px;height:200px;overflow-x:auto;padding-bottom:30px;position:relative;">
                ${data.dates.map((date, i) => {
                    const maxAdd = Math.max(...data.adds, 1);
                    const addH = Math.round((data.adds[i] / maxAdd) * 150);
                    const removeH = Math.round((data.removes[i] / maxAdd) * 150);
                    const label = date.slice(5); // MM-DD
                    return `<div style="display:flex;flex-direction:column;align-items:center;min-width:24px;position:relative;">
                        <div style="width:10px;height:${addH}px;background:linear-gradient(180deg,#10b981,#059669);border-radius:3px 3px 0 0;margin-bottom:2px;" title="+${data.adds[i]} follows"></div>
                        ${data.removes[i] > 0 ? `<div style="width:10px;height:${removeH}px;background:linear-gradient(180deg,#ef4444,#dc2626);border-radius:0 0 3px 3px;" title="-${data.removes[i]} unfollows"></div>` : ''}
                        <div style="position:absolute;bottom:-22px;font-size:8px;color:#64748b;transform:rotate(-45deg);white-space:nowrap;">${label}</div>
                    </div>`;
                }).join('')}
            </div>
            <div style="display:flex;gap:16px;margin-top:8px;">
                <span style="font-size:11px;color:#10b981;">🟩 Theo dõi mới</span>
                <span style="font-size:11px;color:#ef4444;">🟥 Bỏ theo dõi</span>
            </div>
        </div>`;
    } catch (e) {
        container.innerHTML = errorHTML('Lỗi tải growth: ' + e.message);
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
                <h3 style="margin:0 0 16px;color:#f1f5f9;font-size:15px;">🏆 Bảng Xếp Hạng</h3>
                ${renderRankings(benchmarkRes.data.benchmark?.rankings || [])}
            </div>
            <div style="${cardStyle()}">
                <h3 style="margin:0 0 16px;color:#f1f5f9;font-size:15px;">📊 Radar Comparison</h3>
                ${renderRadarText(benchmarkRes.data.radarData)}
            </div>
        </div>
        <div style="${cardStyle()}">
            <h3 style="margin:0 0 16px;color:#f1f5f9;font-size:15px;">📋 Chi tiết Đối thủ</h3>
            ${renderCompetitorTable(competitorsRes.data)}
        </div>`;

        container.querySelector('#add-competitor-btn').onclick = async () => {
            const name = prompt('Nhập tên Page đối thủ:');
            if (name) {
                await api.post('/competitors', { name, followers: 0, engagementRate: 0 });
                initCompetitorsTab(container);
            }
        };
    } catch (e) {
        container.innerHTML = errorHTML('Lỗi tải competitors: ' + e.message);
    }
}

async function initUtmTab(container) {
    try {
        const analyticsRes = await api.get('/utm/analytics');
        const data = analyticsRes.data;

        container.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px;">
            ${kpiCard('🔗 Tổng Links', data.totalLinks || 0, '#3b82f6')}
            ${kpiCard('👆 Tổng Clicks', data.totalClicks || 0, '#10b981')}
            ${kpiCard('📊 CTR Trung bình', (data.totalLinks > 0 ? (data.totalClicks / data.totalLinks).toFixed(1) : 0) + '%', '#f59e0b')}
        </div>
        <div style="display:grid;grid-template-columns:1fr 2fr;gap:20px;">
            <div style="${cardStyle()}">
                <h3 style="margin:0 0 16px;color:#f1f5f9;font-size:15px;">➕ Tạo UTM Link</h3>
                <input id="utm-url" placeholder="URL gốc (https://...)" style="${inputStyle()};margin-bottom:12px;width:100%;box-sizing:border-box;"><br>
                <input id="utm-campaign" placeholder="Campaign (vd: tet_2026)" style="${inputStyle()};margin-bottom:12px;width:100%;box-sizing:border-box;"><br>
                <button id="create-utm-btn" style="${btnStyle('#10b981')};width:100%;">🔗 Tạo Link Tracking</button>
            </div>
            <div style="${cardStyle()}">
                <h3 style="margin:0 0 16px;color:#f1f5f9;font-size:15px;">🏆 Top Performing Links</h3>
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
// EVENT BINDING
// ═══════════════════════════════════════════════════════════════

function bindEvents(container) {
    const tabContent = container.querySelector('#pro-tab-content');

    const TAB_MAP = {
        heatmap: initHeatmapTab,
        demographics: initDemographicsTab,
        growth: initGrowthTab,
        competitors: initCompetitorsTab,
        utm: initUtmTab
    };

    const loadTab = (tabId) => {
        tabContent.innerHTML = loadingHTML('Đang tải dữ liệu...');
        if (TAB_MAP[tabId]) TAB_MAP[tabId](tabContent);
    };

    container.querySelectorAll('.pro-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            container.querySelectorAll('.pro-tab').forEach(t => { t.style.cssText = tabStyle(false); t.classList.remove('active'); });
            tab.style.cssText = tabStyle(true);
            tab.classList.add('active');
            loadTab(tab.dataset.tab);
        });
    });

    // Reload on page filter change
    container.querySelector('#analytics-pro-page-selector')?.addEventListener('change', () => {
        const activeTab = container.querySelector('.pro-tab.active');
        if (activeTab) loadTab(activeTab.dataset.tab);
    });

    // Load default
    loadTab('heatmap');
}

// ═══════════════════════════════════════════════════════════════
// RENDER HELPERS
// ═══════════════════════════════════════════════════════════════

function renderHeatmap(heatmapData) {
    if (!heatmapData || Object.keys(heatmapData).length === 0) {
        return '<div style="color:#64748b;font-size:13px;text-align:center;padding:40px;">Chưa có dữ liệu heatmap. Kết nối Page và đăng bài để tạo dữ liệu.</div>';
    }
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
            const color = intensity === 0 ? 'rgba(255,255,255,0.02)' :
                intensity < 0.3 ? `rgba(59,130,246,${intensity})` :
                intensity < 0.6 ? `rgba(245,158,11,${intensity})` :
                `rgba(239,68,68,${intensity * 0.9})`;
            html += `<div style="width:100%;aspect-ratio:1;background:${color};border-radius:3px;cursor:pointer;transition:transform 0.1s;" title="Score: ${v}%" onmouseover="this.style.transform='scale(1.3)'" onmouseout="this.style.transform='scale(1)'"></div>`;
        });
    });
    return html + '</div></div>';
}

function renderContentTypes(types) {
    if (!types?.length) return '<div style="color:#64748b;font-size:13px;">Chưa có dữ liệu.</div>';
    const icons = { image: '🖼️', video: '🎥', link: '🔗', text: '📝' };
    return types.map(t => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
            <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-size:20px;">${icons[t.type] || '📄'}</span>
                <div>
                    <div style="color:#f1f5f9;font-size:13px;text-transform:capitalize;">${t.type}</div>
                    <div style="color:#94a3b8;font-size:11px;">${t.count} posts (${t.percentage}%)</div>
                </div>
            </div>
            <div style="text-align:right;">
                <div style="color:#10b981;font-size:14px;font-weight:700;">${t.avgEngagement}</div>
                <div style="color:#64748b;font-size:10px;">Avg. Engagement</div>
            </div>
        </div>
    `).join('');
}

function renderTopPosts(posts) {
    if (!posts?.length) return '<div style="color:#64748b;font-size:13px;">Chưa có dữ liệu bài đăng.</div>';
    return `<div style="display:grid;gap:10px;">` + posts.map((p, i) => `
        <div style="display:flex;gap:16px;align-items:center;padding:14px;background:rgba(255,255,255,0.03);border-radius:12px;border:1px solid rgba(255,255,255,0.04);transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'">
            <div style="font-size:24px;font-weight:800;color:rgba(255,255,255,0.08);width:30px;text-align:center;">#${i+1}</div>
            <div style="flex:1;">
                <div style="color:#e2e8f0;font-size:13px;margin-bottom:6px;">${p.content || '<i>[Bài đăng không có văn bản]</i>'}</div>
                <div style="display:flex;gap:12px;font-size:11px;color:#94a3b8;">
                    <span>👍 ${p.likes}</span>
                    <span>💬 ${p.comments}</span>
                    <span>🔗 ${p.shares}</span>
                    <span>👁️ ${p.reach} Reach</span>
                </div>
            </div>
            <div style="text-align:right;background:linear-gradient(135deg,rgba(59,130,246,0.1),rgba(139,92,246,0.1));padding:8px 14px;border-radius:10px;">
                <div style="color:#818cf8;font-size:18px;font-weight:800;">${p.engagement}</div>
                <div style="color:#94a3b8;font-size:10px;">Score</div>
            </div>
        </div>
    `).join('') + `</div>`;
}

function renderRankings(rankings) {
    if (!rankings?.length) return '<div style="color:#64748b;font-size:13px;">Chưa có đối thủ nào. Bấm "Thêm Đối thủ" để bắt đầu.</div>';
    const medals = ['🥇','🥈','🥉'];
    return `<div style="display:grid;gap:8px;">` + rankings.map((r, i) => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:${i===0?'rgba(245,158,11,0.08)':'rgba(255,255,255,0.02)'};border-radius:10px;border:1px solid ${i===0?'rgba(245,158,11,0.15)':'rgba(255,255,255,0.04)'};">
            <div style="display:flex;align-items:center;gap:12px;">
                <div style="font-size:18px;">${medals[i] || (i+1)}</div>
                <div style="color:${i===0?'#f59e0b':'#f1f5f9'};font-size:14px;font-weight:600;">${r.name}</div>
            </div>
            <div style="color:#10b981;font-size:16px;font-weight:700;">${r.score}</div>
        </div>
    `).join('') + `</div>`;
}

function renderRadarText(radarData) {
    if (!radarData) return '<div style="color:#64748b;font-size:13px;">Chưa có dữ liệu radar.</div>';
    return `<pre style="font-size:11px;color:#a78bfa;background:rgba(0,0,0,0.2);padding:12px;border-radius:10px;overflow:auto;max-height:200px;">${JSON.stringify(radarData, null, 2)}</pre>`;
}

function renderCompetitorTable(competitors) {
    if (!competitors?.length) return '<div style="color:#64748b;font-size:13px;">Chưa có đối thủ.</div>';
    return `
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
            <tr style="color:#94a3b8;border-bottom:1px solid rgba(255,255,255,0.08);">
                <th style="padding:10px;text-align:left;">Đối thủ</th>
                <th style="padding:10px;text-align:right;">Followers</th>
                <th style="padding:10px;text-align:right;">ER</th>
                <th style="padding:10px;text-align:right;">Avg Likes</th>
                <th style="padding:10px;text-align:right;">Bài/tuần</th>
            </tr>
        </thead>
        <tbody>
            ${competitors.map(c => `
                <tr style="border-bottom:1px solid rgba(255,255,255,0.04);color:#e2e8f0;">
                    <td style="padding:12px 10px;font-weight:600;">${c.name}</td>
                    <td style="padding:12px 10px;text-align:right;">${(c.metrics?.followers || c.followers || 0).toLocaleString()}</td>
                    <td style="padding:12px 10px;text-align:right;color:#10b981;">${c.metrics?.engagementRate || c.engagementRate || 0}%</td>
                    <td style="padding:12px 10px;text-align:right;">${c.metrics?.avgLikes || 0}</td>
                    <td style="padding:12px 10px;text-align:right;">${c.metrics?.postingFrequency || 0}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>`;
}

function renderUtmTable(links) {
    if (!links?.length) return '<div style="color:#64748b;font-size:13px;">Chưa có UTM link nào.</div>';
    return `<div style="display:grid;gap:8px;">` + links.map(l => `
        <div style="padding:12px;background:rgba(255,255,255,0.03);border-radius:10px;display:flex;justify-content:space-between;align-items:center;">
            <div>
                <div style="color:#f1f5f9;font-size:13px;margin-bottom:4px;word-break:break-all;">${l.url}</div>
                <div style="color:#3b82f6;font-size:11px;">${l.shortCode || 'N/A'} <span style="color:#94a3b8;margin-left:8px;">[${l.campaign || 'no-campaign'}]</span></div>
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

function tabStyle(active) {
    return `padding:10px 18px;border-radius:10px;border:1px solid ${active ? 'rgba(139,92,246,0.4)' : 'transparent'};background:${active ? 'linear-gradient(135deg,rgba(139,92,246,0.15),rgba(59,130,246,0.15))' : 'transparent'};color:${active ? '#c4b5fd' : '#94a3b8'};font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s ease;`.replace(/\n/g, '');
}

function cardStyle() { return 'background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:20px;'; }
function inputStyle() { return 'padding:10px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#f1f5f9;font-size:13px;outline:none;'; }
function btnStyle(color = '#8b5cf6') { return `padding:10px 20px;background:${color};color:white;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;transition:opacity 0.2s;`; }
function loadingHTML(msg) { return `<div style="text-align:center;padding:60px;color:#94a3b8;"><div style="font-size:32px;margin-bottom:12px;animation:pulse 1.5s infinite;">🧮</div><div style="font-size:14px;">${msg}</div></div>`; }
function errorHTML(msg) { return `<div style="padding:16px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:12px;color:#f87171;font-size:13px;">❌ ${msg}</div>`; }
function kpiCard(label, value, color) {
    return `<div style="background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:18px;text-align:center;">
        <div style="color:#94a3b8;font-size:12px;margin-bottom:6px;">${label}</div>
        <div style="color:${color};font-size:22px;font-weight:800;">${value}</div>
    </div>`;
}
