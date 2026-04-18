// ============================================================
// AI Command Center — Phase W Frontend UI
// Unified dashboard for all 5 AI Powerhouse features
// ============================================================

import { geminiApi } from '../api-client.js';

export function renderAICommandCenter(container) {
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
                <h1 style="font-size:26px;font-weight:700;color:#f1f5f9;margin:0;">
                    🧠 AI Command Center
                </h1>
                <p style="color:#94a3b8;font-size:14px;margin-top:4px;">Powered by Gemini 2.0 Flash — 5 công cụ AI cho Social Media</p>
            </div>
        </div>

        <!-- AI Tool Tabs -->
        <div id="ai-tabs" style="display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap;">
            <button class="ai-tab active" data-tab="predict" style="${tabStyle(true)}">📊 Predict Score</button>
            <button class="ai-tab" data-tab="hashtag" style="${tabStyle(false)}">🏷️ Hashtag AI</button>
            <button class="ai-tab" data-tab="besttime" style="${tabStyle(false)}">🕐 Best Time</button>
            <button class="ai-tab" data-tab="autoreply" style="${tabStyle(false)}">🤖 Auto Reply</button>
            <button class="ai-tab" data-tab="report" style="${tabStyle(false)}">📈 AI Report</button>
        </div>

        <!-- Tab Contents -->
        <div id="ai-tab-content">
            ${renderPredictTab()}
        </div>
    </div>`;
}

function tabStyle(active) {
    return `
        padding:10px 20px;border-radius:10px;border:1px solid ${active ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.08)'};
        background:${active ? 'linear-gradient(135deg,rgba(59,130,246,0.2),rgba(139,92,246,0.2))' : 'rgba(255,255,255,0.03)'};
        color:${active ? '#60a5fa' : '#94a3b8'};font-size:13px;font-weight:600;cursor:pointer;
        transition:all 0.2s ease;
    `.replace(/\n/g, '');
}

// ═══════════════════════════════════════════════════════════════
// TAB 1: CONTENT PERFORMANCE PREDICTOR
// ═══════════════════════════════════════════════════════════════
function renderPredictTab() {
    return `
    <div id="tab-predict" class="ai-panel" style="${panelStyle()}">
        <h2 style="font-size:18px;font-weight:700;color:#f1f5f9;margin-bottom:16px;">📊 Dự Đoán Hiệu Quả Bài Đăng</h2>
        <p style="color:#94a3b8;font-size:13px;margin-bottom:20px;">Dán nội dung bài đăng → AI sẽ chấm điểm 6 chiều và gợi ý cải thiện</p>
        
        <textarea id="predict-input" placeholder="Dán nội dung bài đăng vào đây..." 
            style="${textareaStyle()}"></textarea>
        
        <div style="display:flex;gap:12px;margin-top:12px;">
            <select id="predict-platform" style="${selectStyle()}">
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="linkedin">LinkedIn</option>
            </select>
            <button id="predict-btn" style="${btnStyle()}">🔮 Phân tích ngay</button>
        </div>

        <div id="predict-result" style="margin-top:24px;"></div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// TAB 2: HASHTAG SUGGESTER
// ═══════════════════════════════════════════════════════════════
function renderHashtagTab() {
    return `
    <div id="tab-hashtag" class="ai-panel" style="${panelStyle()}">
        <h2 style="font-size:18px;font-weight:700;color:#f1f5f9;margin-bottom:16px;">🏷️ AI Hashtag & Keyword Suggester</h2>
        <p style="color:#94a3b8;font-size:13px;margin-bottom:20px;">AI phân tích nội dung và đề xuất hashtag tối ưu để tăng reach</p>

        <textarea id="hashtag-input" placeholder="Nhập nội dung bài viết..." 
            style="${textareaStyle()}"></textarea>
        
        <div style="display:flex;gap:12px;margin-top:12px;">
            <select id="hashtag-platform" style="${selectStyle()}">
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="linkedin">LinkedIn</option>
            </select>
            <button id="hashtag-btn" style="${btnStyle()}">🏷️ Gợi ý Hashtag</button>
        </div>

        <div id="hashtag-result" style="margin-top:24px;"></div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// TAB 3: BEST TIME TO POST
// ═══════════════════════════════════════════════════════════════
function renderBestTimeTab() {
    return `
    <div id="tab-besttime" class="ai-panel" style="${panelStyle()}">
        <h2 style="font-size:18px;font-weight:700;color:#f1f5f9;margin-bottom:16px;">🕐 AI Best Time to Post</h2>
        <p style="color:#94a3b8;font-size:13px;margin-bottom:20px;">Phân tích engagement pattern và đề xuất khung giờ đăng bài tối ưu</p>
        
        <div style="display:flex;gap:12px;margin-bottom:20px;">
            <select id="besttime-platform" style="${selectStyle()}">
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
            </select>
            <button id="besttime-btn" style="${btnStyle()}">🔍 Phân tích</button>
        </div>

        <div id="besttime-result" style="margin-top:16px;"></div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// TAB 4: AUTO REPLY
// ═══════════════════════════════════════════════════════════════
function renderAutoReplyTab() {
    return `
    <div id="tab-autoreply" class="ai-panel" style="${panelStyle()}">
        <h2 style="font-size:18px;font-weight:700;color:#f1f5f9;margin-bottom:16px;">🤖 AI Auto-Reply Agent</h2>
        <p style="color:#94a3b8;font-size:13px;margin-bottom:20px;">Test AI trả lời tự động — Phân loại tin nhắn + Sinh câu trả lời theo Brand Voice</p>

        <textarea id="autoreply-input" placeholder='Ví dụ: "Sản phẩm này giá bao nhiêu vậy shop?"' 
            style="${textareaStyle()}"></textarea>

        <div style="display:flex;gap:12px;margin-top:12px;">
            <button id="classify-btn" style="${btnStyle('#f59e0b')}">🏷️ Phân loại</button>
            <button id="autoreply-btn" style="${btnStyle('#10b981')}">🤖 Auto Reply</button>
        </div>

        <div style="display:flex;gap:16px;margin-top:24px;">
            <div id="classify-result" style="flex:1;"></div>
            <div id="autoreply-result" style="flex:1;"></div>
        </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// TAB 5: AI REPORT
// ═══════════════════════════════════════════════════════════════
function renderReportTab() {
    return `
    <div id="tab-report" class="ai-panel" style="${panelStyle()}">
        <h2 style="font-size:18px;font-weight:700;color:#f1f5f9;margin-bottom:16px;">📈 AI Analytics Report Generator</h2>
        <p style="color:#94a3b8;font-size:13px;margin-bottom:20px;">AI tự viết báo cáo executive summary từ dữ liệu analytics</p>

        <div style="display:flex;gap:12px;margin-bottom:20px;">
            <input id="report-brand" type="text" placeholder="Tên thương hiệu" value="SocialHub" style="${inputStyle()}">
            <select id="report-period" style="${selectStyle()}">
                <option value="7 ngày">7 ngày qua</option>
                <option value="30 ngày">30 ngày qua</option>
                <option value="quý">Quý này</option>
            </select>
            <button id="report-btn" style="${btnStyle('#8b5cf6')}">📈 Tạo báo cáo AI</button>
        </div>

        <div id="report-result" style="margin-top:16px;"></div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// EVENT BINDING
// ═══════════════════════════════════════════════════════════════
function bindEvents(container) {
    // Tab switching
    container.querySelectorAll('.ai-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            container.querySelectorAll('.ai-tab').forEach(t => { t.style.cssText = tabStyle(false); });
            tab.style.cssText = tabStyle(true);
            const tabId = tab.dataset.tab;
            const content = container.querySelector('#ai-tab-content');
            const tabs = { predict: renderPredictTab, hashtag: renderHashtagTab, besttime: renderBestTimeTab, autoreply: renderAutoReplyTab, report: renderReportTab };
            content.innerHTML = tabs[tabId]();
            bindTabEvents(container, tabId);
        });
    });

    // Bind first tab
    bindTabEvents(container, 'predict');
}

function bindTabEvents(container, tabId) {
    if (tabId === 'predict') {
        container.querySelector('#predict-btn')?.addEventListener('click', async () => {
            const content = container.querySelector('#predict-input').value.trim();
            const platform = container.querySelector('#predict-platform').value;
            if (!content) return;
            const resultDiv = container.querySelector('#predict-result');
            resultDiv.innerHTML = loadingHTML('Đang phân tích bài viết...');
            try {
                const res = await geminiApi.predict(content, platform);
                resultDiv.innerHTML = renderPredictResult(res.data || res);
            } catch (e) { resultDiv.innerHTML = errorHTML(e.message); }
        });
    }

    if (tabId === 'hashtag') {
        container.querySelector('#hashtag-btn')?.addEventListener('click', async () => {
            const content = container.querySelector('#hashtag-input').value.trim();
            const platform = container.querySelector('#hashtag-platform').value;
            if (!content) return;
            const resultDiv = container.querySelector('#hashtag-result');
            resultDiv.innerHTML = loadingHTML('AI đang phân tích nội dung...');
            try {
                const res = await geminiApi.hashtags(content, platform);
                resultDiv.innerHTML = renderHashtagResult(res.data || res);
            } catch (e) { resultDiv.innerHTML = errorHTML(e.message); }
        });
    }

    if (tabId === 'besttime') {
        container.querySelector('#besttime-btn')?.addEventListener('click', async () => {
            const platform = container.querySelector('#besttime-platform').value;
            const resultDiv = container.querySelector('#besttime-result');
            resultDiv.innerHTML = loadingHTML('Đang phân tích engagement patterns...');
            try {
                const res = await geminiApi.bestTime(platform);
                resultDiv.innerHTML = renderBestTimeResult(res.data || res);
            } catch (e) { resultDiv.innerHTML = errorHTML(e.message); }
        });
    }

    if (tabId === 'autoreply') {
        container.querySelector('#classify-btn')?.addEventListener('click', async () => {
            const msg = container.querySelector('#autoreply-input').value.trim();
            if (!msg) return;
            const resultDiv = container.querySelector('#classify-result');
            resultDiv.innerHTML = loadingHTML('Đang phân loại...');
            try {
                const res = await geminiApi.classify(msg);
                resultDiv.innerHTML = renderClassifyResult(res.data || res);
            } catch (e) { resultDiv.innerHTML = errorHTML(e.message); }
        });
        container.querySelector('#autoreply-btn')?.addEventListener('click', async () => {
            const msg = container.querySelector('#autoreply-input').value.trim();
            if (!msg) return;
            const resultDiv = container.querySelector('#autoreply-result');
            resultDiv.innerHTML = loadingHTML('AI đang soạn trả lời...');
            try {
                const res = await geminiApi.autoReply(msg);
                resultDiv.innerHTML = renderAutoReplyResult(res.data || res);
            } catch (e) { resultDiv.innerHTML = errorHTML(e.message); }
        });
    }

    if (tabId === 'report') {
        container.querySelector('#report-btn')?.addEventListener('click', async () => {
            const brand = container.querySelector('#report-brand').value || 'SocialHub';
            const period = container.querySelector('#report-period').value;
            const resultDiv = container.querySelector('#report-result');
            resultDiv.innerHTML = loadingHTML('AI đang viết báo cáo executive...');
            try {
                const res = await geminiApi.report({}, period, brand);
                resultDiv.innerHTML = renderReportResult(res.data || res);
            } catch (e) { resultDiv.innerHTML = errorHTML(e.message); }
        });
    }
}

// ═══════════════════════════════════════════════════════════════
// RESULT RENDERERS
// ═══════════════════════════════════════════════════════════════

function renderPredictResult(data) {
    const scoreColor = data.overallScore >= 80 ? '#10b981' : data.overallScore >= 60 ? '#f59e0b' : '#ef4444';
    const viralColors = { low: '#6b7280', medium: '#f59e0b', high: '#10b981', viral: '#ec4899' };
    
    let scoresHTML = '';
    if (data.scores) {
        Object.entries(data.scores).forEach(([key, val]) => {
            const labels = { hook: '🎣 Hook', clarity: '🔍 Rõ ràng', emotion: '❤️ Cảm xúc', cta: '📢 CTA', hashtags: '🏷️ Hashtags', length: '📏 Độ dài' };
            scoresHTML += `
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                    <span style="width:100px;font-size:12px;color:#94a3b8;">${labels[key] || key}</span>
                    <div style="flex:1;height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;">
                        <div style="width:${val.score}%;height:100%;background:${val.score >= 80 ? '#10b981' : val.score >= 60 ? '#f59e0b' : '#ef4444'};border-radius:4px;transition:width 0.5s ease;"></div>
                    </div>
                    <span style="font-size:12px;font-weight:700;color:#f1f5f9;width:32px;text-align:right;">${val.score}</span>
                </div>`;
        });
    }

    let improvementsHTML = (data.improvements || []).map(imp => `
        <div style="display:flex;gap:10px;padding:10px 14px;background:rgba(255,255,255,0.03);border-radius:8px;margin-bottom:6px;border-left:3px solid ${imp.priority === 'high' ? '#ef4444' : imp.priority === 'medium' ? '#f59e0b' : '#3b82f6'};">
            <div style="flex:1;">
                <div style="font-size:13px;color:#f1f5f9;">${imp.suggestion}</div>
                <div style="font-size:11px;color:#10b981;margin-top:2px;">${imp.impact}</div>
            </div>
        </div>
    `).join('');

    return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <div style="${cardStyle()}">
            <div style="text-align:center;margin-bottom:20px;">
                <div style="font-size:48px;font-weight:800;color:${scoreColor};line-height:1;">${data.overallScore}</div>
                <div style="font-size:12px;color:#94a3b8;margin-top:4px;">Overall Score</div>
                <div style="margin-top:8px;display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;background:${viralColors[data.viralPotential] || '#6b7280'}22;color:${viralColors[data.viralPotential] || '#6b7280'};">
                    🔥 Viral: ${(data.viralPotential || 'N/A').toUpperCase()}
                </div>
            </div>
            ${scoresHTML}
            ${data.predictedEngagement ? `
                <div style="margin-top:16px;padding:12px;background:rgba(59,130,246,0.08);border-radius:10px;">
                    <div style="font-size:12px;font-weight:700;color:#60a5fa;margin-bottom:8px;">📊 Dự đoán Engagement</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;color:#94a3b8;">
                        <div>👍 Likes: <b style="color:#f1f5f9;">${data.predictedEngagement.likes}</b></div>
                        <div>💬 Comments: <b style="color:#f1f5f9;">${data.predictedEngagement.comments}</b></div>
                        <div>🔄 Shares: <b style="color:#f1f5f9;">${data.predictedEngagement.shares}</b></div>
                        <div>👁️ Reach: <b style="color:#f1f5f9;">${data.predictedEngagement.reach}</b></div>
                    </div>
                </div>
            ` : ''}
        </div>
        <div style="${cardStyle()}">
            <div style="font-size:14px;font-weight:700;color:#f1f5f9;margin-bottom:12px;">💡 Gợi ý cải thiện</div>
            ${improvementsHTML}
            ${data.summary ? `<div style="margin-top:16px;padding:12px;background:rgba(139,92,246,0.08);border-radius:10px;font-size:13px;color:#c4b5fd;line-height:1.5;">${data.summary}</div>` : ''}
            ${data.bestTimeToPost ? `<div style="margin-top:12px;font-size:12px;color:#94a3b8;">⏰ Giờ đăng tốt nhất: <b style="color:#10b981;">${data.bestTimeToPost}</b></div>` : ''}
        </div>
    </div>`;
}

function renderHashtagResult(data) {
    const tagHTML = (tags, color) => (tags || []).map(t => `<span style="display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;margin:3px;background:${color}22;color:${color};cursor:pointer;" onclick="navigator.clipboard.writeText('${t}')">${t}</span>`).join('');

    return `
    <div style="${cardStyle()}">
        <div style="margin-bottom:16px;">
            <div style="font-size:13px;font-weight:700;color:#10b981;margin-bottom:8px;">🎯 Primary Hashtags</div>
            ${tagHTML(data.primary, '#10b981')}
        </div>
        <div style="margin-bottom:16px;">
            <div style="font-size:13px;font-weight:700;color:#3b82f6;margin-bottom:8px;">📌 Secondary</div>
            ${tagHTML(data.secondary, '#3b82f6')}
        </div>
        <div style="margin-bottom:16px;">
            <div style="font-size:13px;font-weight:700;color:#ec4899;margin-bottom:8px;">🔥 Trending</div>
            ${tagHTML(data.trending, '#ec4899')}
        </div>
        <div style="margin-bottom:16px;">
            <div style="font-size:13px;font-weight:700;color:#f59e0b;margin-bottom:8px;">🔑 SEO Keywords</div>
            ${tagHTML(data.keywords, '#f59e0b')}
        </div>
        ${data.tips ? `<div style="padding:12px;background:rgba(59,130,246,0.08);border-radius:10px;font-size:13px;color:#94a3b8;line-height:1.5;">💡 ${data.tips}</div>` : ''}
        <div style="margin-top:12px;text-align:right;">
            <button onclick="navigator.clipboard.writeText('${[...(data.primary || []), ...(data.secondary || []), ...(data.trending || [])].join(' ')}')" style="padding:8px 16px;background:rgba(59,130,246,0.2);color:#60a5fa;border:none;border-radius:8px;font-size:12px;cursor:pointer;">📋 Copy tất cả</button>
        </div>
    </div>`;
}

function renderBestTimeResult(data) {
    // Heatmap render
    const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const dayLabels = { monday:'T2', tuesday:'T3', wednesday:'T4', thursday:'T5', friday:'T6', saturday:'T7', sunday:'CN' };
    
    let heatmapHTML = '<div style="overflow-x:auto;">';
    heatmapHTML += '<div style="display:grid;grid-template-columns:40px repeat(24,1fr);gap:2px;min-width:600px;">';
    // Hours header
    heatmapHTML += '<div></div>';
    for (let h = 0; h < 24; h++) {
        heatmapHTML += `<div style="font-size:9px;color:#64748b;text-align:center;">${h}</div>`;
    }
    // Data rows
    days.forEach(day => {
        heatmapHTML += `<div style="font-size:11px;color:#94a3b8;display:flex;align-items:center;">${dayLabels[day]}</div>`;
        const vals = data.heatmap?.[day] || Array(24).fill(0);
        vals.forEach(v => {
            const intensity = Math.min(1, v / 100);
            const bg = `rgba(59, 130, 246, ${intensity * 0.9})`;
            heatmapHTML += `<div style="width:100%;aspect-ratio:1;background:${bg};border-radius:3px;" title="${v}%"></div>`;
        });
    });
    heatmapHTML += '</div></div>';

    // Best times cards
    let bestHTML = (data.bestTimes || []).slice(0, 4).map(bt => `
        <div style="padding:12px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid rgba(255,255,255,0.06);">
            <div style="font-size:13px;font-weight:700;color:#f1f5f9;text-transform:capitalize;">${dayLabels[bt.day] || bt.day}</div>
            <div style="font-size:20px;font-weight:800;color:#60a5fa;margin:6px 0;">${(bt.hours || []).map(h => h + ':00').join(', ')}</div>
            <div style="font-size:11px;color:#94a3b8;">${bt.reason || ''}</div>
            <div style="margin-top:6px;display:inline-block;padding:2px 8px;border-radius:10px;background:rgba(16,185,129,0.15);color:#10b981;font-size:11px;font-weight:700;">Score: ${bt.score}</div>
        </div>
    `).join('');

    let insightsHTML = (data.insights || []).map(i => `<div style="font-size:13px;color:#94a3b8;margin-bottom:6px;line-height:1.5;">${i}</div>`).join('');

    return `
    <div style="${cardStyle()}">
        <div style="font-size:14px;font-weight:700;color:#f1f5f9;margin-bottom:16px;">📊 Engagement Heatmap (24h x 7 ngày)</div>
        ${heatmapHTML}
        
        <div style="margin-top:24px;font-size:14px;font-weight:700;color:#f1f5f9;margin-bottom:12px;">⭐ Khung giờ vàng</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">${bestHTML}</div>
        
        ${data.insights ? `
            <div style="margin-top:24px;padding:16px;background:rgba(139,92,246,0.08);border-radius:12px;">
                <div style="font-size:13px;font-weight:700;color:#a78bfa;margin-bottom:10px;">💡 Insights</div>
                ${insightsHTML}
            </div>
        ` : ''}
        ${data.summary ? `<div style="margin-top:16px;font-size:13px;color:#94a3b8;line-height:1.6;padding:12px;background:rgba(255,255,255,0.03);border-radius:10px;">${data.summary}</div>` : ''}
    </div>`;
}

function renderClassifyResult(data) {
    const catLabels = { hoi_gia: '💰 Hỏi giá', khieu_nai: '😠 Khiếu nại', feedback_tot: '😊 Feedback tốt', hoi_san_pham: '📦 Hỏi sản phẩm', dat_hang: '🛒 Đặt hàng', spam: '🚫 Spam', khac: '❓ Khác' };
    const urgencyColors = { low: '#6b7280', medium: '#f59e0b', high: '#ef4444', critical: '#dc2626' };
    const sentimentColors = { positive: '#10b981', neutral: '#6b7280', negative: '#ef4444' };

    return `
    <div style="${cardStyle()}">
        <div style="font-size:13px;font-weight:700;color:#f59e0b;margin-bottom:12px;">🏷️ Phân loại</div>
        <div style="font-size:20px;margin-bottom:12px;">${catLabels[data.category] || data.category}</div>
        <div style="font-size:12px;color:#94a3b8;margin-bottom:4px;">Confidence: <b style="color:#f1f5f9;">${Math.round((data.confidence || 0) * 100)}%</b></div>
        <div style="font-size:12px;color:#94a3b8;margin-bottom:4px;">Sentiment: <b style="color:${sentimentColors[data.sentiment] || '#6b7280'};">${data.sentiment}</b></div>
        <div style="font-size:12px;color:#94a3b8;">Urgency: <b style="color:${urgencyColors[data.urgency] || '#6b7280'};">${(data.urgency || '').toUpperCase()}</b></div>
        ${data.intent ? `<div style="margin-top:10px;padding:8px 12px;background:rgba(255,255,255,0.03);border-radius:8px;font-size:12px;color:#94a3b8;">${data.intent}</div>` : ''}
    </div>`;
}

function renderAutoReplyResult(data) {
    return `
    <div style="${cardStyle()}">
        <div style="font-size:13px;font-weight:700;color:#10b981;margin-bottom:12px;">🤖 AI Auto Reply</div>
        <div style="padding:14px;background:rgba(16,185,129,0.08);border-radius:10px;border-left:3px solid #10b981;font-size:14px;color:#f1f5f9;line-height:1.6;">
            "${data.reply || 'N/A'}"
        </div>
        <div style="margin-top:12px;display:flex;gap:12px;font-size:12px;color:#94a3b8;">
            <span>Confidence: <b style="color:${(data.confidence || 0) >= 0.8 ? '#10b981' : '#f59e0b'}">${Math.round((data.confidence || 0) * 100)}%</b></span>
            <span>Review: <b style="color:${data.needsHumanReview ? '#f59e0b' : '#10b981'}">${data.needsHumanReview ? '⚠️ Cần duyệt' : '✅ Tự động'}</b></span>
        </div>
        ${(data.tags || []).length ? `<div style="margin-top:8px;">${(data.tags || []).map(t => `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;background:rgba(59,130,246,0.15);color:#60a5fa;margin:2px;">${t}</span>`).join('')}</div>` : ''}
    </div>`;
}

function renderReportResult(data) {
    let highlightsHTML = (data.highlights || []).map(h => `
        <div style="padding:14px;background:rgba(255,255,255,0.03);border-radius:10px;text-align:center;">
            <div style="font-size:24px;">${h.icon}</div>
            <div style="font-size:12px;color:#94a3b8;margin:4px 0;">${h.metric}</div>
            <div style="font-size:20px;font-weight:800;color:${h.trend === 'up' ? '#10b981' : h.trend === 'down' ? '#ef4444' : '#f1f5f9'};">${h.value}</div>
            <div style="font-size:11px;color:#64748b;margin-top:4px;">${h.insight || ''}</div>
        </div>
    `).join('');

    let recsHTML = (data.recommendations || []).map(r => `
        <div style="display:flex;gap:10px;padding:10px 14px;background:rgba(255,255,255,0.03);border-radius:8px;margin-bottom:6px;border-left:3px solid ${r.priority === 'high' ? '#ef4444' : r.priority === 'medium' ? '#f59e0b' : '#3b82f6'};">
            <div style="flex:1;font-size:13px;color:#f1f5f9;">${r.action}</div>
            <div style="font-size:11px;color:#10b981;white-space:nowrap;">${r.expectedImpact}</div>
        </div>
    `).join('');

    return `
    <div style="${cardStyle()}">
        <div style="text-align:center;margin-bottom:24px;">
            <div style="font-size:18px;font-weight:800;color:#f1f5f9;">${data.title || 'Báo cáo AI'}</div>
            <div style="font-size:12px;color:#94a3b8;">Giai đoạn: ${data.period || 'N/A'}</div>
        </div>

        ${data.executiveSummary ? `
            <div style="padding:16px;background:linear-gradient(135deg,rgba(59,130,246,0.08),rgba(139,92,246,0.08));border-radius:12px;margin-bottom:20px;">
                <div style="font-size:12px;font-weight:700;color:#a78bfa;margin-bottom:8px;">📝 Executive Summary</div>
                <div style="font-size:14px;color:#e2e8f0;line-height:1.7;">${data.executiveSummary}</div>
            </div>
        ` : ''}

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px;">
            ${highlightsHTML}
        </div>

        ${recsHTML ? `
            <div style="margin-bottom:20px;">
                <div style="font-size:14px;font-weight:700;color:#f1f5f9;margin-bottom:12px;">🎯 Khuyến nghị</div>
                ${recsHTML}
            </div>
        ` : ''}

        ${data.nextSteps ? `
            <div style="padding:14px;background:rgba(16,185,129,0.08);border-radius:10px;border-left:3px solid #10b981;">
                <div style="font-size:12px;font-weight:700;color:#10b981;margin-bottom:6px;">🚀 Bước tiếp theo</div>
                <div style="font-size:13px;color:#e2e8f0;line-height:1.6;">${data.nextSteps}</div>
            </div>
        ` : ''}
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// STYLE HELPERS
// ═══════════════════════════════════════════════════════════════
function panelStyle() { return 'animation:fadeIn 0.3s ease;'; }
function cardStyle() { return 'background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:20px;'; }
function textareaStyle() { return 'width:100%;min-height:100px;padding:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#f1f5f9;font-size:14px;font-family:inherit;resize:vertical;outline:none;'; }
function selectStyle() { return 'padding:10px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#f1f5f9;font-size:13px;outline:none;cursor:pointer;'; }
function inputStyle() { return 'padding:10px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#f1f5f9;font-size:13px;outline:none;flex:1;'; }
function btnStyle(color = '#3b82f6') { return `padding:10px 20px;background:${color};color:white;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s ease;box-shadow:0 2px 8px ${color}44;`; }
function loadingHTML(msg) { return `<div style="text-align:center;padding:40px;color:#94a3b8;"><div style="font-size:28px;margin-bottom:12px;animation:pulse 1.5s infinite;">🧠</div><div style="font-size:14px;">${msg}</div></div>`; }
function errorHTML(msg) { return `<div style="padding:16px;background:rgba(239,68,68,0.1);border-radius:10px;color:#f87171;font-size:13px;">❌ ${msg}</div>`; }
