// ============================================================
// AI Studio — Phase 2B (Upgraded AI Command Center)
// 7 AI Tools: Predict, Repurpose, Hashtag, Best Time,
//             Auto Reply, Brand Voice, AI Report
// ============================================================

import { geminiApi } from '../api-client.js';

export function renderAICommandCenter(container) {
    container.innerHTML = buildHTML();
    bindEvents(container);
    return () => {};
}

function buildHTML() {
    return `
    <div style="padding:24px;max-width:1400px;margin:0 auto;font-family:'Satoshi',sans-serif;">
        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:12px;">
            <div>
                <div style="display:inline-block;padding:4px 14px;background:linear-gradient(135deg,rgba(59,130,246,0.2),rgba(236,72,153,0.2));color:#60a5fa;border-radius:20px;font-size:11px;font-weight:700;margin-bottom:8px;letter-spacing:0.5px;">🧠 POWERED BY GEMINI 2.5</div>
                <h1 style="font-size:28px;font-weight:800;color:#f1f5f9;margin:0;background:linear-gradient(135deg,#f1f5f9,#60a5fa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">
                    AI Studio
                </h1>
                <p style="color:#94a3b8;font-size:14px;margin-top:4px;">7 công cụ AI mạnh mẽ cho Social Media Marketing</p>
            </div>
        </div>

        <!-- AI Tool Tabs -->
        <div id="ai-tabs" style="display:flex;gap:6px;margin-bottom:24px;flex-wrap:wrap;background:rgba(255,255,255,0.02);padding:6px;border-radius:14px;border:1px solid rgba(255,255,255,0.05);">
            <button class="ai-tab active" data-tab="predict" style="${tabStyle(true)}">📊 Predict</button>
            <button class="ai-tab" data-tab="repurpose" style="${tabStyle(false)}">🔄 Repurpose</button>
            <button class="ai-tab" data-tab="hashtag" style="${tabStyle(false)}">🏷️ Hashtag</button>
            <button class="ai-tab" data-tab="besttime" style="${tabStyle(false)}">🕐 Best Time</button>
            <button class="ai-tab" data-tab="autoreply" style="${tabStyle(false)}">🤖 Auto Reply</button>
            <button class="ai-tab" data-tab="brandvoice" style="${tabStyle(false)}">🎨 Brand Voice</button>
            <button class="ai-tab" data-tab="report" style="${tabStyle(false)}">📈 AI Report</button>
        </div>

        <!-- Tab Content -->
        <div id="ai-tab-content">
            ${renderPredictTab()}
        </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════════════════

function renderPredictTab() {
    return `
    <div class="ai-panel" style="${panelStyle()}">
        <h2 style="${titleStyle()}">📊 Dự Đoán Hiệu Quả Bài Đăng</h2>
        <p style="color:#94a3b8;font-size:13px;margin-bottom:20px;">AI chấm điểm 6 chiều và gợi ý cải thiện trước khi đăng</p>
        
        <textarea id="predict-input" placeholder="Dán nội dung bài đăng vào đây..." style="${textareaStyle()}"></textarea>
        
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

function renderRepurposeTab() {
    return `
    <div class="ai-panel" style="${panelStyle()}">
        <h2 style="${titleStyle()}">🔄 AI Content Repurpose</h2>
        <p style="color:#94a3b8;font-size:13px;margin-bottom:20px;">1 bài viết → AI tự động chuyển đổi cho nhiều nền tảng. Giữ nguyên ý chính, tối ưu format cho từng MXH.</p>

        <textarea id="repurpose-input" placeholder="Dán nội dung bài viết gốc vào đây..." style="${textareaStyle()}"></textarea>

        <div style="display:flex;gap:12px;margin-top:12px;flex-wrap:wrap;align-items:center;">
            <div>
                <label style="font-size:11px;color:#64748b;display:block;margin-bottom:4px;">Nền tảng gốc</label>
                <select id="repurpose-source" style="${selectStyle()}">
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="linkedin">LinkedIn</option>
                </select>
            </div>
            <div style="flex:1;">
                <label style="font-size:11px;color:#64748b;display:block;margin-bottom:4px;">Chuyển sang (chọn nhiều)</label>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <label style="display:flex;align-items:center;gap:4px;font-size:12px;color:#e2e8f0;cursor:pointer;">
                        <input type="checkbox" class="repurpose-target" value="facebook" style="accent-color:#3b82f6;"> FB
                    </label>
                    <label style="display:flex;align-items:center;gap:4px;font-size:12px;color:#e2e8f0;cursor:pointer;">
                        <input type="checkbox" class="repurpose-target" value="instagram" checked style="accent-color:#ec4899;"> IG
                    </label>
                    <label style="display:flex;align-items:center;gap:4px;font-size:12px;color:#e2e8f0;cursor:pointer;">
                        <input type="checkbox" class="repurpose-target" value="tiktok" checked style="accent-color:#10b981;"> TikTok
                    </label>
                    <label style="display:flex;align-items:center;gap:4px;font-size:12px;color:#e2e8f0;cursor:pointer;">
                        <input type="checkbox" class="repurpose-target" value="linkedin" checked style="accent-color:#0ea5e9;"> LinkedIn
                    </label>
                    <label style="display:flex;align-items:center;gap:4px;font-size:12px;color:#e2e8f0;cursor:pointer;">
                        <input type="checkbox" class="repurpose-target" value="threads" style="accent-color:#a78bfa;"> Threads
                    </label>
                </div>
            </div>
            <button id="repurpose-btn" style="${btnStyle('#8b5cf6')}">🔄 Repurpose</button>
        </div>

        <div id="repurpose-result" style="margin-top:24px;"></div>
    </div>`;
}

function renderHashtagTab() {
    return `
    <div class="ai-panel" style="${panelStyle()}">
        <h2 style="${titleStyle()}">🏷️ AI Hashtag & Keyword Suggester</h2>
        <p style="color:#94a3b8;font-size:13px;margin-bottom:20px;">AI phân tích nội dung và đề xuất hashtag tối ưu để tăng reach</p>

        <textarea id="hashtag-input" placeholder="Nhập nội dung bài viết..." style="${textareaStyle()}"></textarea>
        
        <div style="display:flex;gap:12px;margin-top:12px;">
            <select id="hashtag-platform" style="${selectStyle()}">
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="linkedin">LinkedIn</option>
            </select>
            <button id="hashtag-btn" style="${btnStyle('#10b981')}">🏷️ Gợi ý Hashtag</button>
        </div>

        <div id="hashtag-result" style="margin-top:24px;"></div>
    </div>`;
}

function renderBestTimeTab() {
    return `
    <div class="ai-panel" style="${panelStyle()}">
        <h2 style="${titleStyle()}">🕐 AI Best Time to Post</h2>
        <p style="color:#94a3b8;font-size:13px;margin-bottom:20px;">Phân tích engagement pattern và đề xuất khung giờ đăng bài tối ưu</p>
        
        <div style="display:flex;gap:12px;margin-bottom:20px;">
            <select id="besttime-platform" style="${selectStyle()}">
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
            </select>
            <button id="besttime-btn" style="${btnStyle('#f59e0b')}">🔍 Phân tích</button>
        </div>

        <div id="besttime-result" style="margin-top:16px;"></div>
    </div>`;
}

function renderAutoReplyTab() {
    return `
    <div class="ai-panel" style="${panelStyle()}">
        <h2 style="${titleStyle()}">🤖 AI Auto-Reply Agent</h2>
        <p style="color:#94a3b8;font-size:13px;margin-bottom:20px;">Test AI trả lời tự động — Phân loại tin nhắn + Sinh câu trả lời theo Brand Voice</p>

        <textarea id="autoreply-input" placeholder='Ví dụ: "Sản phẩm này giá bao nhiêu vậy shop?"' style="${textareaStyle()}"></textarea>

        <div style="display:flex;gap:12px;margin-top:12px;">
            <button id="classify-btn" style="${btnStyle('#f59e0b')}">🏷️ Phân loại</button>
            <button id="autoreply-btn" style="${btnStyle('#10b981')}">🤖 Auto Reply</button>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:24px;">
            <div id="classify-result"></div>
            <div id="autoreply-result"></div>
        </div>
    </div>`;
}

function renderBrandVoiceTab() {
    return `
    <div class="ai-panel" style="${panelStyle()}">
        <h2 style="${titleStyle()}">🎨 Brand Voice Studio</h2>
        <p style="color:#94a3b8;font-size:13px;margin-bottom:20px;">Cấu hình Brand Voice → AI sẽ tự động áp dụng vào mọi nội dung: Compose, Auto Reply, Repurpose</p>

        <div id="brandvoice-loading" style="text-align:center;padding:20px;color:#94a3b8;">Đang tải Brand Voice...</div>
        <div id="brandvoice-form" style="display:none;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                <div>
                    <label style="${labelStyle()}">Tên thương hiệu</label>
                    <input id="bv-name" placeholder="VD: SocialHub" style="${inputStyle()}">
                </div>
                <div>
                    <label style="${labelStyle()}">Ngành nghề</label>
                    <input id="bv-industry" placeholder="VD: Social Media Marketing" style="${inputStyle()}">
                </div>
            </div>
            <div style="margin-bottom:16px;">
                <label style="${labelStyle()}">Giọng điệu (Tone)</label>
                <input id="bv-tone" placeholder="VD: thân thiện, chuyên nghiệp, hài hước" style="${inputStyle()}">
            </div>
            <div style="margin-bottom:16px;">
                <label style="${labelStyle()}">Đối tượng khách hàng</label>
                <input id="bv-audience" placeholder="VD: Chủ doanh nghiệp vừa và nhỏ, 25-45 tuổi" style="${inputStyle()}">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                <div>
                    <label style="${labelStyle()}">Thông điệp chính (mỗi dòng 1 ý)</label>
                    <textarea id="bv-messages" placeholder="Chất lượng hàng đầu&#10;Giá cả hợp lý&#10;Giao hàng nhanh" style="${textareaStyle()};min-height:80px;"></textarea>
                </div>
                <div>
                    <label style="${labelStyle()}">Từ cần tránh (mỗi dòng 1 từ)</label>
                    <textarea id="bv-avoid" placeholder="rẻ&#10;giảm giá&#10;miễn phí" style="${textareaStyle()};min-height:80px;"></textarea>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr auto;gap:16px;margin-bottom:16px;align-items:end;">
                <div>
                    <label style="${labelStyle()}">Auto-Reply: Ngưỡng tự tin (0.0 - 1.0)</label>
                    <input id="bv-threshold" type="number" step="0.05" min="0" max="1" value="0.8" style="${inputStyle()};max-width:120px;">
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <label style="font-size:12px;color:#94a3b8;">Auto-Reply</label>
                    <input id="bv-autoreply" type="checkbox" style="accent-color:#10b981;width:18px;height:18px;">
                </div>
            </div>

            <div style="display:flex;gap:12px;">
                <button id="bv-save-btn" style="${btnStyle('#10b981')}">💾 Lưu Brand Voice</button>
                <button id="bv-test-btn" style="${btnStyle('#8b5cf6')}">🧪 Test: Viết bài mẫu</button>
            </div>

            <div id="bv-result" style="margin-top:20px;"></div>
        </div>
    </div>`;
}

function renderReportTab() {
    return `
    <div class="ai-panel" style="${panelStyle()}">
        <h2 style="${titleStyle()}">📈 AI Analytics Report Generator</h2>
        <p style="color:#94a3b8;font-size:13px;margin-bottom:20px;">AI tự viết báo cáo executive summary từ dữ liệu analytics</p>

        <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
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
// EVENTS
// ═══════════════════════════════════════════════════════════════

function bindEvents(container) {
    const TAB_RENDER = {
        predict: renderPredictTab,
        repurpose: renderRepurposeTab,
        hashtag: renderHashtagTab,
        besttime: renderBestTimeTab,
        autoreply: renderAutoReplyTab,
        brandvoice: renderBrandVoiceTab,
        report: renderReportTab
    };

    container.querySelectorAll('.ai-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            container.querySelectorAll('.ai-tab').forEach(t => { t.style.cssText = tabStyle(false); t.classList.remove('active'); });
            tab.style.cssText = tabStyle(true);
            tab.classList.add('active');
            const tabId = tab.dataset.tab;
            const content = container.querySelector('#ai-tab-content');
            content.innerHTML = TAB_RENDER[tabId]();
            bindTabEvents(container, tabId);
        });
    });

    bindTabEvents(container, 'predict');
}

function bindTabEvents(container, tabId) {
    if (tabId === 'predict') {
        container.querySelector('#predict-btn')?.addEventListener('click', async () => {
            const content = container.querySelector('#predict-input').value.trim();
            const platform = container.querySelector('#predict-platform').value;
            if (!content) return;
            const resultDiv = container.querySelector('#predict-result');
            resultDiv.innerHTML = loadingHTML('AI đang phân tích bài viết...');
            try {
                const res = await geminiApi.predict(content, platform);
                resultDiv.innerHTML = renderPredictResult(res.data || res);
            } catch (e) { resultDiv.innerHTML = errorHTML(e.message); }
        });
    }

    if (tabId === 'repurpose') {
        container.querySelector('#repurpose-btn')?.addEventListener('click', async () => {
            const text = container.querySelector('#repurpose-input').value.trim();
            const source = container.querySelector('#repurpose-source').value;
            const targets = [...container.querySelectorAll('.repurpose-target:checked')].map(cb => cb.value);
            if (!text || targets.length === 0) return;
            const resultDiv = container.querySelector('#repurpose-result');
            resultDiv.innerHTML = loadingHTML('AI đang chuyển đổi nội dung cho ' + targets.length + ' nền tảng...');
            try {
                const res = await geminiApi.repurpose({ text, source, targets });
                resultDiv.innerHTML = renderRepurposeResult(res.data || res);
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
            resultDiv.innerHTML = loadingHTML('AI đang phân tích engagement patterns...');
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

    if (tabId === 'brandvoice') {
        loadBrandVoice(container);
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
// BRAND VOICE LOGIC
// ═══════════════════════════════════════════════════════════════

async function loadBrandVoice(container) {
    try {
        const res = await geminiApi.getBrandVoice();
        const bv = res.data || res;
        const form = container.querySelector('#brandvoice-form');
        const loading = container.querySelector('#brandvoice-loading');

        if (bv.name) container.querySelector('#bv-name').value = bv.name;
        if (bv.industry) container.querySelector('#bv-industry').value = bv.industry;
        if (bv.tone) container.querySelector('#bv-tone').value = bv.tone;
        if (bv.targetAudience) container.querySelector('#bv-audience').value = bv.targetAudience;
        if (bv.keyMessages?.length) container.querySelector('#bv-messages').value = bv.keyMessages.join('\n');
        if (bv.avoidWords?.length) container.querySelector('#bv-avoid').value = bv.avoidWords.join('\n');
        if (bv.autoReplyConfidenceThreshold) container.querySelector('#bv-threshold').value = bv.autoReplyConfidenceThreshold;
        if (bv.autoReplyEnabled) container.querySelector('#bv-autoreply').checked = true;

        loading.style.display = 'none';
        form.style.display = 'block';

        // Save
        container.querySelector('#bv-save-btn')?.addEventListener('click', async () => {
            const data = getBrandVoiceFormData(container);
            const resultDiv = container.querySelector('#bv-result');
            resultDiv.innerHTML = loadingHTML('Đang lưu...');
            try {
                await geminiApi.saveBrandVoice(data);
                resultDiv.innerHTML = `<div style="padding:12px;background:rgba(16,185,129,0.1);border-radius:10px;color:#10b981;font-size:13px;">✅ Đã lưu Brand Voice thành công!</div>`;
            } catch (e) { resultDiv.innerHTML = errorHTML(e.message); }
        });

        // Test compose
        container.querySelector('#bv-test-btn')?.addEventListener('click', async () => {
            const data = getBrandVoiceFormData(container);
            const resultDiv = container.querySelector('#bv-result');
            resultDiv.innerHTML = loadingHTML('AI đang viết bài mẫu với Brand Voice...');
            try {
                const res = await geminiApi.compose({ topic: 'Giới thiệu thương hiệu', platform: 'facebook', tone: data.tone || 'thân thiện', brandVoice: data });
                const composed = res.data || res;
                resultDiv.innerHTML = `
                <div style="${cardStyle()}">
                    <div style="font-size:13px;font-weight:700;color:#a78bfa;margin-bottom:12px;">🧪 Bài viết mẫu (Brand Voice applied)</div>
                    <div style="padding:14px;background:rgba(255,255,255,0.03);border-radius:10px;font-size:14px;color:#f1f5f9;line-height:1.7;white-space:pre-wrap;">${composed.text || composed}</div>
                    ${composed.hashtags?.length ? `<div style="margin-top:10px;font-size:12px;color:#60a5fa;">${composed.hashtags.join(' ')}</div>` : ''}
                </div>`;
            } catch (e) { resultDiv.innerHTML = errorHTML(e.message); }
        });
    } catch (e) {
        container.querySelector('#brandvoice-loading').innerHTML = errorHTML('Không thể tải Brand Voice: ' + e.message);
    }
}

function getBrandVoiceFormData(container) {
    return {
        name: container.querySelector('#bv-name')?.value || '',
        industry: container.querySelector('#bv-industry')?.value || '',
        tone: container.querySelector('#bv-tone')?.value || '',
        targetAudience: container.querySelector('#bv-audience')?.value || '',
        keyMessages: (container.querySelector('#bv-messages')?.value || '').split('\n').filter(Boolean),
        avoidWords: (container.querySelector('#bv-avoid')?.value || '').split('\n').filter(Boolean),
        autoReplyEnabled: container.querySelector('#bv-autoreply')?.checked || false,
        autoReplyConfidenceThreshold: parseFloat(container.querySelector('#bv-threshold')?.value || 0.8)
    };
}

// ═══════════════════════════════════════════════════════════════
// RESULT RENDERERS
// ═══════════════════════════════════════════════════════════════

function renderPredictResult(data) {
    const scoreColor = data.overallScore >= 80 ? '#10b981' : data.overallScore >= 60 ? '#f59e0b' : '#ef4444';
    const viralColors = { low: '#6b7280', medium: '#f59e0b', high: '#10b981', viral: '#ec4899' };

    let scoresHTML = '';
    if (data.scores) {
        const labels = { hook: '🎣 Hook', clarity: '🔍 Rõ ràng', emotion: '❤️ Cảm xúc', cta: '📢 CTA', hashtags: '🏷️ Hashtags', length: '📏 Độ dài' };
        Object.entries(data.scores).forEach(([key, val]) => {
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
                </div>` : ''}
        </div>
        <div style="${cardStyle()}">
            <div style="font-size:14px;font-weight:700;color:#f1f5f9;margin-bottom:12px;">💡 Gợi ý cải thiện</div>
            ${improvementsHTML}
            ${data.summary ? `<div style="margin-top:16px;padding:12px;background:rgba(139,92,246,0.08);border-radius:10px;font-size:13px;color:#c4b5fd;line-height:1.5;">${data.summary}</div>` : ''}
            ${data.bestTimeToPost ? `<div style="margin-top:12px;font-size:12px;color:#94a3b8;">⏰ Giờ đăng tốt nhất: <b style="color:#10b981;">${data.bestTimeToPost}</b></div>` : ''}
        </div>
    </div>`;
}

function renderRepurposeResult(data) {
    const platformIcons = { facebook: '📘', instagram: '📸', tiktok: '🎵', linkedin: '💼', threads: '🧵', twitter: '🐦', x: '✖️' };
    const platformColors = { facebook: '#3b82f6', instagram: '#ec4899', tiktok: '#10b981', linkedin: '#0ea5e9', threads: '#a78bfa', twitter: '#60a5fa', x: '#94a3b8' };

    const cards = Object.entries(data).map(([platform, content]) => {
        const text = content.text || content;
        const hashtags = content.hashtags || [];
        const tip = content.tip || '';
        return `
        <div style="${cardStyle()};border-left:3px solid ${platformColors[platform] || '#6b7280'};">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:20px;">${platformIcons[platform] || '📱'}</span>
                    <span style="font-size:14px;font-weight:700;color:#f1f5f9;text-transform:capitalize;">${platform}</span>
                </div>
                <button onclick="navigator.clipboard.writeText(this.closest('.ai-panel')?.querySelector('[data-platform=${platform}]')?.textContent || '')" style="padding:4px 10px;background:rgba(59,130,246,0.15);color:#60a5fa;border:none;border-radius:6px;font-size:11px;cursor:pointer;">📋 Copy</button>
            </div>
            <div data-platform="${platform}" style="font-size:13px;color:#e2e8f0;line-height:1.7;white-space:pre-wrap;padding:12px;background:rgba(255,255,255,0.03);border-radius:10px;">${text}</div>
            ${hashtags.length ? `<div style="margin-top:8px;font-size:12px;color:${platformColors[platform] || '#60a5fa'};">${hashtags.join(' ')}</div>` : ''}
            ${tip ? `<div style="margin-top:8px;font-size:11px;color:#f59e0b;">💡 ${tip}</div>` : ''}
        </div>`;
    }).join('');

    return `<div style="display:grid;gap:16px;">${cards}</div>`;
}

function renderHashtagResult(data) {
    const tagHTML = (tags, color) => (tags || []).map(t => `<span style="display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;margin:3px;background:${color}22;color:${color};cursor:pointer;transition:all 0.15s;" onclick="navigator.clipboard.writeText('${t}')" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">${t}</span>`).join('');

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
    const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const dayLabels = { monday:'T2', tuesday:'T3', wednesday:'T4', thursday:'T5', friday:'T6', saturday:'T7', sunday:'CN' };
    
    let heatmapHTML = '<div style="overflow-x:auto;"><div style="display:grid;grid-template-columns:40px repeat(24,1fr);gap:2px;min-width:600px;">';
    heatmapHTML += '<div></div>';
    for (let h = 0; h < 24; h++) heatmapHTML += `<div style="font-size:9px;color:#64748b;text-align:center;">${h}</div>`;
    days.forEach(day => {
        heatmapHTML += `<div style="font-size:11px;color:#94a3b8;display:flex;align-items:center;">${dayLabels[day]}</div>`;
        const vals = data.heatmap?.[day] || Array(24).fill(0);
        vals.forEach(v => {
            const intensity = Math.min(1, v / 100);
            const bg = intensity === 0 ? 'rgba(255,255,255,0.02)' : `rgba(59, 130, 246, ${intensity * 0.9})`;
            heatmapHTML += `<div style="width:100%;aspect-ratio:1;background:${bg};border-radius:3px;" title="${v}%"></div>`;
        });
    });
    heatmapHTML += '</div></div>';

    let bestHTML = (data.bestTimes || []).slice(0, 4).map(bt => `
        <div style="padding:12px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid rgba(255,255,255,0.06);">
            <div style="font-size:13px;font-weight:700;color:#f1f5f9;text-transform:capitalize;">${dayLabels[bt.day] || bt.day}</div>
            <div style="font-size:20px;font-weight:800;color:#60a5fa;margin:6px 0;">${(bt.hours || []).map(h => h + ':00').join(', ')}</div>
            <div style="font-size:11px;color:#94a3b8;">${bt.reason || ''}</div>
            <div style="margin-top:6px;display:inline-block;padding:2px 8px;border-radius:10px;background:rgba(16,185,129,0.15);color:#10b981;font-size:11px;font-weight:700;">Score: ${bt.score}</div>
        </div>
    `).join('');

    return `
    <div style="${cardStyle()}">
        <div style="font-size:14px;font-weight:700;color:#f1f5f9;margin-bottom:16px;">📊 Engagement Heatmap</div>
        ${heatmapHTML}
        <div style="margin-top:24px;font-size:14px;font-weight:700;color:#f1f5f9;margin-bottom:12px;">⭐ Khung giờ vàng</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">${bestHTML}</div>
        ${(data.insights || []).length ? `
            <div style="margin-top:24px;padding:16px;background:rgba(139,92,246,0.08);border-radius:12px;">
                <div style="font-size:13px;font-weight:700;color:#a78bfa;margin-bottom:10px;">💡 Insights</div>
                ${data.insights.map(i => `<div style="font-size:13px;color:#94a3b8;margin-bottom:6px;line-height:1.5;">${i}</div>`).join('')}
            </div>` : ''}
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
        ${(data.tags || []).length ? `<div style="margin-top:8px;">${data.tags.map(t => `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;background:rgba(59,130,246,0.15);color:#60a5fa;margin:2px;">${t}</span>`).join('')}</div>` : ''}
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
            </div>` : ''}
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px;">
            ${highlightsHTML}
        </div>
        ${recsHTML ? `
            <div style="margin-bottom:20px;">
                <div style="font-size:14px;font-weight:700;color:#f1f5f9;margin-bottom:12px;">🎯 Khuyến nghị</div>
                ${recsHTML}
            </div>` : ''}
        ${data.nextSteps ? `
            <div style="padding:14px;background:rgba(16,185,129,0.08);border-radius:10px;border-left:3px solid #10b981;">
                <div style="font-size:12px;font-weight:700;color:#10b981;margin-bottom:6px;">🚀 Bước tiếp theo</div>
                <div style="font-size:13px;color:#e2e8f0;line-height:1.6;">${data.nextSteps}</div>
            </div>` : ''}
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

function tabStyle(active) {
    return `padding:10px 18px;border-radius:10px;border:1px solid ${active ? 'rgba(59,130,246,0.4)' : 'transparent'};background:${active ? 'linear-gradient(135deg,rgba(59,130,246,0.15),rgba(139,92,246,0.15))' : 'transparent'};color:${active ? '#60a5fa' : '#94a3b8'};font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s ease;`.replace(/\n/g, '');
}

function panelStyle() { return 'animation:fadeIn 0.3s ease;'; }
function titleStyle() { return 'font-size:18px;font-weight:700;color:#f1f5f9;margin-bottom:16px;'; }
function cardStyle() { return 'background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:20px;'; }
function labelStyle() { return 'font-size:12px;color:#94a3b8;display:block;margin-bottom:6px;font-weight:600;'; }
function textareaStyle() { return 'width:100%;min-height:100px;padding:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#f1f5f9;font-size:14px;font-family:inherit;resize:vertical;outline:none;box-sizing:border-box;'; }
function selectStyle() { return 'padding:10px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#f1f5f9;font-size:13px;outline:none;cursor:pointer;'; }
function inputStyle() { return 'padding:10px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#f1f5f9;font-size:13px;outline:none;width:100%;box-sizing:border-box;'; }
function btnStyle(color = '#3b82f6') { return `padding:10px 20px;background:${color};color:white;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s ease;box-shadow:0 2px 8px ${color}44;`; }
function loadingHTML(msg) { return `<div style="text-align:center;padding:40px;color:#94a3b8;"><div style="font-size:28px;margin-bottom:12px;animation:pulse 1.5s infinite;">🧠</div><div style="font-size:14px;">${msg}</div></div>`; }
function errorHTML(msg) { return `<div style="padding:16px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:12px;color:#f87171;font-size:13px;">❌ ${msg}</div>`; }
