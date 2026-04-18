// ============================================================
// AI Hub — Full 7-tab Dashboard (Phase F)
// ============================================================

import {
  getBrandVoice, updateBrandVoice, isBrandVoiceConfigured,
  TONE_OPTIONS, INDUSTRY_OPTIONS, getHistory, likeHistoryItem
} from './ai-store.js';
import { predictPerformance, getScoreColor, getScoreLabel } from './ai-predict.js';
import { repurposeWithAI, repurposeLocal }                   from './ai-repurpose.js';
import { buildMonthlyPlan, generateBulkPosts, exportCalendarCSV, CONTENT_PILLARS } from './ai-bulk.js';
import { analyzeComments, getMockComments, analyzePageSentiment } from './ai-sentiment.js';
import { fetchTrends, getMockTrends, generateTrendContent }      from './ai-trends.js';

// ── Toast helper ──────────────────────────────────────────────
function toast(msg, type = 'info') {
  if (window.Toast) { window.Toast.show(msg, type); return; }
  console.log(`[${type}] ${msg}`);
}

// ── State ─────────────────────────────────────────────────────
let aiTab = 'brandvoice';

// ── Backward compat: old Phase A export name ──────────────────
export function renderAIPage(container) { renderAIHub(container); }

export function renderAIHub(container) {
  container.innerHTML = getShellHTML();
  bindTabEvents(container);
  renderTab(container, aiTab);
  if (window.refreshIcons) window.refreshIcons();
}

function getShellHTML() {
  return `
  <div class="ai-hub">
    <div class="ai-hub-header">
      <div>
        <h2 style="margin:0">🤖 AI Hub</h2>
        <p class="page-subtitle">Công cụ AI hỗ trợ tạo &amp; tối ưu nội dung</p>
      </div>
      <div class="ai-hub-badges">
        <span class="ai-badge ${isBrandVoiceConfigured() ? 'ai-badge-ok' : 'ai-badge-warn'}">
          ${isBrandVoiceConfigured() ? '✅ Brand Voice đã cấu hình' : '⚠️ Cấu hình Brand Voice'}
        </span>
      </div>
    </div>

    <div class="ai-tabs">
      <button class="ait-tab active" data-tab="brandvoice">🎯 Brand Voice</button>
      <button class="ait-tab" data-tab="predict">📊 Predict</button>
      <button class="ait-tab" data-tab="repurpose">♻️ Repurpose</button>
      <button class="ait-tab" data-tab="bulk">📅 Bulk</button>
      <button class="ait-tab" data-tab="sentiment">💬 Sentiment</button>
      <button class="ait-tab" data-tab="trends">🔥 Trends</button>
      <button class="ait-tab" data-tab="history">📜 Lịch sử</button>
    </div>

    <div id="ai-tab-content" class="ai-tab-content"></div>
  </div>`;
}

function bindTabEvents(container) {
  container.querySelectorAll('.ait-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.ait-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      aiTab = tab.dataset.tab;
      renderTab(container, aiTab);
    });
  });
}

function renderTab(container, tab) {
  const el = container.querySelector('#ai-tab-content');
  switch (tab) {
    case 'brandvoice': tabBrandVoice(el, container); break;
    case 'predict':    tabPredict(el);     break;
    case 'repurpose':  tabRepurpose(el);   break;
    case 'bulk':       tabBulk(el);        break;
    case 'sentiment':  tabSentiment(el);   break;
    case 'trends':     tabTrends(el);      break;
    case 'history':    tabHistory(el);     break;
  }
  if (window.refreshIcons) window.refreshIcons();
}

// ══════════════════════════════════════════════════════════════
// TAB 1: Brand Voice
// ══════════════════════════════════════════════════════════════
function tabBrandVoice(el, rootContainer) {
  const bv = getBrandVoice();
  el.innerHTML = `
  <div class="ai-section">
    <div class="ai-section-hdr"><h3>🎯 Cấu hình Brand Voice</h3><p>AI sẽ học theo brand của bạn để tạo content nhất quán</p></div>
    <div class="bv-form">
      <div class="bv-col">
        <div class="fg"><label>Tên thương hiệu</label><input type="text" id="bv-name" class="field-input" value="${bv.name}" placeholder="VD: Shop ABC"/></div>
        <div class="fg"><label>Ngành nghề</label><select id="bv-industry" class="field-select"><option value="">-- Chọn ngành --</option>${INDUSTRY_OPTIONS.map(i=>`<option value="${i}" ${bv.industry===i?'selected':''}>${i}</option>`).join('')}</select></div>
        <div class="fg"><label>Đối tượng mục tiêu</label><input type="text" id="bv-audience" class="field-input" value="${bv.targetAudience}" placeholder="VD: Nữ 18-35, thích làm đẹp"/></div>
        <div class="fg"><label>CTA mặc định</label><input type="text" id="bv-cta" class="field-input" value="${bv.cta}" placeholder="VD: Đặt hàng ngay — link bio!"/></div>
      </div>
      <div class="bv-col">
        <div class="fg"><label>Tone giọng văn</label>
          <div class="tone-grid">${TONE_OPTIONS.map(t=>`<div class="tone-card ${bv.tone===t.value?'active':''}" data-tone="${t.value}"><div class="tone-lbl">${t.label}</div><div class="tone-desc">${t.desc}</div></div>`).join('')}</div>
        </div>
        <div class="bv-row2">
          <div class="fg"><label>Ngôn ngữ</label><select id="bv-lang" class="field-select"><option value="vi" ${bv.language==='vi'?'selected':''}>🇻🇳 Tiếng Việt</option><option value="en" ${bv.language==='en'?'selected':''}>🇺🇸 English</option><option value="vi-en" ${bv.language==='vi-en'?'selected':''}>🔀 Mixed</option></select></div>
          <div class="fg"><label>Emoji</label><select id="bv-emoji" class="field-select"><option value="none" ${bv.emojiUsage==='none'?'selected':''}>❌ Không</option><option value="light" ${bv.emojiUsage==='light'?'selected':''}>💧 Ít</option><option value="moderate" ${bv.emojiUsage==='moderate'?'selected':''}>✨ Vừa</option><option value="heavy" ${bv.emojiUsage==='heavy'?'selected':''}>🎉 Nhiều</option></select></div>
        </div>
        <div class="fg"><label>Key messages (mỗi dòng 1)</label><textarea id="bv-keys" class="field-input" rows="3" placeholder="Chất lượng hàng đầu&#10;Giao hàng siêu nhanh">${bv.keyMessages.join('\n')}</textarea></div>
        <div class="fg"><label>Từ cần tránh (dấu phẩy)</label><input type="text" id="bv-avoid" class="field-input" value="${bv.avoidWords.join(', ')}" placeholder="rẻ, kém chất lượng, ..."/></div>
      </div>
      <div class="bv-col bv-col-full">
        <div class="fg"><label>📚 Bài mẫu để AI học (paste 3-5 bài cũ, ngăn cách bằng ---)</label><textarea id="bv-samples" class="field-input" rows="5" placeholder="Paste bài đăng cũ vào đây...">${bv.learnedSamples.join('\n---\n')}</textarea><span class="fg-hint">AI sẽ phân tích văn phong và áp dụng vào bài mới</span></div>
        <div class="bv-actions"><button id="btn-save-bv" class="btn btn-primary">💾 Lưu Brand Voice</button><button id="btn-test-bv" class="btn btn-secondary">🧪 Test tạo bài thử</button></div>
      </div>
    </div>
    <div id="bv-preview" class="bv-preview" style="display:none"><div class="bv-preview-lbl">✨ Bài viết AI tạo theo Brand Voice:</div><div id="bv-preview-text" class="bv-preview-text"></div></div>
  </div>`;

  // Tone selector
  el.querySelectorAll('.tone-card').forEach(c => c.addEventListener('click', () => {
    el.querySelectorAll('.tone-card').forEach(x => x.classList.remove('active'));
    c.classList.add('active');
  }));

  // Save
  el.querySelector('#btn-save-bv').addEventListener('click', () => {
    updateBrandVoice({
      name: el.querySelector('#bv-name').value.trim(),
      industry: el.querySelector('#bv-industry').value,
      targetAudience: el.querySelector('#bv-audience').value.trim(),
      cta: el.querySelector('#bv-cta').value.trim(),
      tone: el.querySelector('.tone-card.active')?.dataset.tone || 'friendly',
      language: el.querySelector('#bv-lang').value,
      emojiUsage: el.querySelector('#bv-emoji').value,
      keyMessages: el.querySelector('#bv-keys').value.split('\n').map(s=>s.trim()).filter(Boolean),
      avoidWords: el.querySelector('#bv-avoid').value.split(',').map(s=>s.trim()).filter(Boolean),
      learnedSamples: el.querySelector('#bv-samples').value.split('---').map(s=>s.trim()).filter(Boolean)
    });
    toast('✅ Brand Voice đã lưu!', 'success');
    // Refresh header badge
    const badge = rootContainer.querySelector('.ai-badge');
    if (badge) { badge.className = 'ai-badge ai-badge-ok'; badge.textContent = '✅ Brand Voice đã cấu hình'; }
  });

  // Test
  el.querySelector('#btn-test-bv').addEventListener('click', async () => {
    const btn = el.querySelector('#btn-test-bv');
    btn.disabled = true; btn.textContent = '⏳ Đang tạo...';
    const bv = getBrandVoice();
    const preview = el.querySelector('#bv-preview');
    const previewText = el.querySelector('#bv-preview-text');

    try {
      const { openaiApi } = await import('../api-client.js');
      const res = await openaiApi.chat([
        { role: 'user', content: `Tạo 1 bài Facebook ngắn giới thiệu "${bv.name || 'thương hiệu'}" tone "${bv.tone}" emoji "${bv.emojiUsage}". Ngành: ${bv.industry || 'general'}.` }
      ], { max_tokens: 200 });
      const text = res.choices?.message?.content || res.choices?.[0]?.message?.content || '';
      preview.style.display = 'block';
      previewText.textContent = text;
    } catch {
      preview.style.display = 'block';
      previewText.textContent = `${bv.tone === 'urgent' ? '🔥' : '✨'} Chào bạn! Đây là ${bv.name || 'thương hiệu'} của chúng tôi.\n${bv.keyMessages[0] || 'Chất lượng hàng đầu — tận tâm phục vụ'} 💯\n${bv.cta || 'Khám phá ngay!'}`;
    }
    btn.disabled = false; btn.textContent = '🧪 Test tạo bài thử';
  });
}

// ══════════════════════════════════════════════════════════════
// TAB 2: Predict Score
// ══════════════════════════════════════════════════════════════
function tabPredict(el) {
  let activePF = 'facebook';
  el.innerHTML = `
  <div class="ai-section">
    <div class="ai-section-hdr"><h3>📊 Dự đoán hiệu quả bài đăng</h3><p>Chấm điểm trước khi đăng — phân tích reach, ER, timing</p></div>
    <div class="predict-layout">
      <div class="predict-input">
        <div class="fg"><label>Platform</label><div class="pill-row">${['facebook','instagram','twitter','linkedin'].map(p=>`<button class="pill-btn ${p==='facebook'?'active':''}" data-pf="${p}">${p}</button>`).join('')}</div></div>
        <div class="fg"><label>Nội dung bài đăng</label><textarea id="predict-text" class="field-input" rows="6" placeholder="Paste nội dung bài đăng..."></textarea><div class="fg-hint" id="predict-cc">0 ký tự</div></div>
        <div class="bv-row2">
          <div class="fg"><label>Có ảnh/video?</label><select id="predict-media" class="field-select"><option value="none">❌ Không</option><option value="image">🖼️ Ảnh</option><option value="video">🎬 Video</option><option value="carousel">📑 Carousel</option></select></div>
          <div class="fg"><label>Giờ đăng</label><input type="datetime-local" id="predict-time" class="field-input"/></div>
        </div>
        <div class="predict-btn-row">
          <button id="btn-predict" class="btn btn-primary"><i data-lucide="zap" width="16" height="16"></i> Phân tích ngay</button>
          <label class="ai-toggle"><input type="checkbox" id="predict-ai"/><span>Dùng AI</span></label>
        </div>
      </div>
      <div class="predict-result" id="predict-result" style="display:none"></div>
    </div>
  </div>`;

  el.querySelectorAll('.pill-btn').forEach(b => b.addEventListener('click', () => {
    el.querySelectorAll('.pill-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); activePF = b.dataset.pf;
  }));

  el.querySelector('#predict-text').addEventListener('input', e => {
    el.querySelector('#predict-cc').textContent = `${e.target.value.length} ký tự`;
  });

  el.querySelector('#btn-predict').addEventListener('click', async () => {
    const text = el.querySelector('#predict-text').value.trim();
    const media = el.querySelector('#predict-media').value;
    const time = el.querySelector('#predict-time').value;
    const useAI = el.querySelector('#predict-ai').checked;
    if (!text) return toast('Nhập nội dung trước!', 'error');

    const btn = el.querySelector('#btn-predict');
    btn.disabled = true; btn.innerHTML = '⏳ Đang phân tích...';

    const content = { text, imageUrl: media === 'image' ? 'yes' : null, videoUrl: media === 'video' ? 'yes' : null };
    const result = await predictPerformance(content, activePF, time || null, useAI);
    renderPredictResult(el.querySelector('#predict-result'), result);

    btn.disabled = false; btn.innerHTML = '<i data-lucide="zap" width="16" height="16"></i> Phân tích lại';
    if (window.refreshIcons) window.refreshIcons();
  });
}

function renderPredictResult(el, r) {
  const score = r.finalScore ?? r.score;
  const color = getScoreColor(score);
  const label = getScoreLabel(score);
  el.style.display = 'block';
  el.innerHTML = `
  <div class="predict-score-card">
    <div class="score-circle" style="--sc:${color}">
      <svg viewBox="0 0 100 100" class="score-svg"><circle cx="50" cy="50" r="44" fill="none" stroke="var(--color-border)" stroke-width="8"/><circle cx="50" cy="50" r="44" fill="none" stroke="${color}" stroke-width="8" stroke-dasharray="${score*2.76} ${276-score*2.76}" stroke-dashoffset="69" stroke-linecap="round" transform="rotate(-90 50 50)" class="score-arc"/></svg>
      <div class="score-num" style="color:${color}">${score}</div>
      <div class="score-lbl-sm">${label}</div>
    </div>
    <div class="score-preds">
      <div class="pred-item"><span class="pred-ico">📈</span><div><div class="pred-lbl">Dự đoán ER</div><div class="pred-val" style="color:${color}">${r.estimatedER||r.predictedER}%</div></div></div>
      ${r.estimatedReach?`<div class="pred-item"><span class="pred-ico">👁️</span><div><div class="pred-lbl">Dự đoán Reach</div><div class="pred-val">${Number(r.estimatedReach).toLocaleString('vi-VN')}</div></div></div>`:''}
      <div class="pred-item"><span class="pred-ico">🕐</span><div><div class="pred-lbl">Nguồn</div><div class="pred-val">${r.source==='ai'?'🤖 AI':'📐 Heuristic'}</div></div></div>
    </div>
  </div>
  <div class="predict-details">
    ${r.reasons?.length?`<div class="pd-block"><div class="pd-title">✅ Điểm cộng</div>${r.reasons.map(x=>`<div class="reason-item ri-pos">${x}</div>`).join('')}</div>`:''}
    ${r.warnings?.length?`<div class="pd-block"><div class="pd-title">⚠️ Cần cải thiện</div>${r.warnings.map(x=>`<div class="reason-item ri-warn">${x}</div>`).join('')}</div>`:''}
    ${r.aiInsights?.length?`<div class="pd-block"><div class="pd-title">🤖 AI Insights</div>${r.aiInsights.map(x=>`<div class="reason-item ri-info">${x}</div>`).join('')}</div>`:''}
    ${r.suggestedImprovement?`<div class="improvement-box"><strong>💡 Gợi ý:</strong> ${r.suggestedImprovement}</div>`:''}
  </div>`;
}

// ══════════════════════════════════════════════════════════════
// TAB 3: Repurpose
// ══════════════════════════════════════════════════════════════
function tabRepurpose(el) {
  el.innerHTML = `
  <div class="ai-section">
    <div class="ai-section-hdr"><h3>♻️ Content Repurposing</h3><p>1 bài gốc → tự động adapt cho từng platform</p></div>
    <div class="repurpose-layout">
      <div class="rp-input">
        <div class="fg"><label>Platform gốc</label><select id="rp-src" class="field-select"><option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="blog">Blog</option><option value="other">Khác</option></select></div>
        <div class="fg"><label>Bài viết gốc</label><textarea id="rp-text" class="field-input" rows="8" placeholder="Paste bài viết gốc..."></textarea></div>
        <div class="fg"><label>Chuyển thể sang</label><div class="cb-grid">${['facebook','instagram','twitter','linkedin','tiktok'].map(p=>`<label class="cb-item"><input type="checkbox" value="${p}" ${['instagram','twitter','linkedin'].includes(p)?'checked':''}/>${p}</label>`).join('')}</div></div>
        <div class="rp-btn-row"><button id="btn-rp" class="btn btn-primary"><i data-lucide="refresh-cw" width="16" height="16"></i> Repurpose</button><label class="ai-toggle"><input type="checkbox" id="rp-ai" checked/><span>Dùng AI</span></label></div>
      </div>
      <div id="rp-results" class="rp-results" style="display:none"></div>
    </div>
  </div>`;

  el.querySelector('#btn-rp').addEventListener('click', async () => {
    const text = el.querySelector('#rp-text').value.trim();
    const src = el.querySelector('#rp-src').value;
    const targets = [...el.querySelectorAll('.cb-item input:checked')].map(c=>c.value);
    const useAI = el.querySelector('#rp-ai').checked;
    if (!text) return toast('Paste bài viết trước!', 'error');
    if (!targets.length) return toast('Chọn ít nhất 1 platform!', 'error');

    const btn = el.querySelector('#btn-rp');
    btn.disabled = true; btn.innerHTML = '⏳ Đang repurpose...';

    try {
      let results;
      if (useAI) { results = await repurposeWithAI(text, src, targets); }
      else { results = {}; targets.forEach(t => { results[t] = { text: repurposeLocal(text, t), hashtags: [] }; }); }
      renderRPResults(el.querySelector('#rp-results'), results, targets);
    } catch (err) { toast('Lỗi: ' + err.message, 'error'); }

    btn.disabled = false; btn.innerHTML = '<i data-lucide="refresh-cw" width="16" height="16"></i> Repurpose lại';
    if (window.refreshIcons) window.refreshIcons();
  });
}

function renderRPResults(el, results, platforms) {
  const ICONS = { facebook:'📘', instagram:'📸', twitter:'🐦', linkedin:'💼', tiktok:'🎵' };
  const LIMITS = { facebook:63206, instagram:2200, twitter:280, linkedin:3000, tiktok:2200 };
  el.style.display = 'block';
  el.innerHTML = platforms.map(p => {
    const d = results[p] || {};
    const len = (d.text||'').length;
    const over = len > (LIMITS[p]||9999);
    return `<div class="rp-card"><div class="rp-card-hdr"><span>${ICONS[p]} ${p}</span><span class="char-ct ${over?'over':''}">${len}${LIMITS[p]?'/'+LIMITS[p]:''}</span></div><textarea class="field-input rp-out" rows="6" id="rp-o-${p}">${d.text||''}</textarea>${d.hashtags?.length?`<div class="rp-tags">${d.hashtags.map(h=>`<span class="tag-pill">${h}</span>`).join('')}</div>`:''}${d.tip?`<div class="rp-tip">💡 ${d.tip}</div>`:''}<div class="rp-card-actions"><button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText(document.getElementById('rp-o-${p}').value);this.textContent='✅ Copied!'">📋 Copy</button></div></div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════
// TAB 4: Bulk Generate
// ══════════════════════════════════════════════════════════════
function tabBulk(el) {
  let currentPlan = null, generatedPlan = null;

  el.innerHTML = `
  <div class="ai-section">
    <div class="ai-section-hdr"><h3>📅 Bulk Generate — Kế hoạch nội dung</h3><p>Tạo hàng loạt bài đăng theo content calendar tháng</p></div>
    <div class="bulk-cfg">
      <div class="bulk-cfg-grid">
        <div class="fg"><label>Chủ đề tháng</label><input type="text" id="bulk-topic" class="field-input" placeholder="VD: Summer Sale / Ra mắt sản phẩm mới"/></div>
        <div class="fg"><label>Số bài/tuần</label><select id="bulk-ppw" class="field-select"><option value="3">3</option><option value="5" selected>5</option><option value="7">7</option><option value="10">10</option></select></div>
        <div class="fg"><label>Platforms</label><div class="cb-grid">${['facebook','instagram','twitter','linkedin'].map(p=>`<label class="cb-item"><input type="checkbox" value="${p}" class="bulk-pf" ${['facebook','instagram'].includes(p)?'checked':''}/>${p}</label>`).join('')}</div></div>
      </div>
      <div class="fg"><label>Content Pillars</label><div class="pillars-row">${CONTENT_PILLARS.map(p=>`<div class="pillar-badge">${p.label} <span class="pillar-pct">${p.pct}%</span></div>`).join('')}</div></div>
      <button id="btn-plan" class="btn btn-secondary">🗓️ Xem trước Calendar</button>
    </div>
    <div id="bulk-preview" style="display:none">
      <div class="bulk-pv-hdr"><h4 id="bulk-title"></h4><div class="bulk-pv-acts"><button id="btn-gen-all" class="btn btn-primary">🤖 Generate tất cả</button><button id="btn-csv" class="btn btn-secondary" style="display:none">📥 Xuất CSV</button></div></div>
      <div id="bulk-progress" class="bulk-progress" style="display:none"><div class="progress-wrap"><div id="bulk-pbar" class="progress-bar"></div></div><div id="bulk-ptxt" class="progress-txt"></div></div>
      <div id="bulk-cal" class="bulk-cal"></div>
    </div>
  </div>`;

  el.querySelector('#btn-plan').addEventListener('click', () => {
    const topic = el.querySelector('#bulk-topic').value.trim();
    const ppw = parseInt(el.querySelector('#bulk-ppw').value);
    const pfs = [...el.querySelectorAll('.bulk-pf:checked')].map(c=>c.value);
    if (!topic) return toast('Nhập chủ đề!', 'error');
    if (!pfs.length) return toast('Chọn platform!', 'error');
    currentPlan = buildMonthlyPlan(ppw, pfs);
    renderBulkCal(el.querySelector('#bulk-cal'), currentPlan);
    el.querySelector('#bulk-preview').style.display = 'block';
    el.querySelector('#bulk-title').textContent = `📅 ${currentPlan.length} bài — "${topic}"`;
  });

  el.querySelector('#btn-gen-all').addEventListener('click', async () => {
    const topic = el.querySelector('#bulk-topic').value.trim();
    if (!currentPlan) return;
    const btn = el.querySelector('#btn-gen-all');
    btn.disabled = true; btn.textContent = '⏳ Đang tạo...';
    const pw = el.querySelector('#bulk-progress');
    const pb = el.querySelector('#bulk-pbar');
    const pt = el.querySelector('#bulk-ptxt');
    pw.style.display = 'block';

    generatedPlan = await generateBulkPosts(currentPlan, topic, ({ current, total }) => {
      pb.style.width = Math.round(current/total*100) + '%';
      pt.textContent = `Đang tạo ${current}/${total} bài...`;
    });

    pw.style.display = 'none';
    btn.disabled = false; btn.textContent = '✅ Tạo lại';
    el.querySelector('#btn-csv').style.display = 'inline-flex';
    renderBulkCal(el.querySelector('#bulk-cal'), generatedPlan);
    toast(`✅ Đã tạo ${generatedPlan.length} bài!`, 'success');
  });

  el.querySelector('#btn-csv').addEventListener('click', () => {
    if (!generatedPlan) return;
    const csv = exportCalendarCSV(generatedPlan);
    const blob = new Blob(['\uFEFF'+csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'content-calendar.csv'; a.click();
  });
}

function renderBulkCal(el, plan) {
  const PC = { facebook:'#1877F2', instagram:'#E4405F', twitter:'#1DA1F2', linkedin:'#0A66C2' };
  el.innerHTML = `<div class="bulk-grid">${plan.map(s => {
    const dt = new Date(s.date);
    const has = !!s.postData;
    return `<div class="bulk-slot ${has?'slot-gen':'slot-empty'}"><div class="slot-meta"><span class="slot-date">${dt.toLocaleDateString('vi-VN',{day:'numeric',month:'short'})}</span><span class="slot-time">${dt.getHours()}:00</span><span style="color:${PC[s.platform]||'#888'}">● ${s.platform}</span></div><div class="slot-pillar">${s.pillar?.label||''}</div>${has?`<div class="slot-preview">${(s.postData.text||'').slice(0,80)}...</div><div class="slot-footer"><span class="er-mini">${s.postData.estimatedER||'~'}% ER</span>${s.isFallback?'<span class="fallback-tag">local</span>':'<span class="ai-tag">AI</span>'}</div>`:'<div class="slot-empty-msg">Chưa có nội dung</div>'}</div>`;
  }).join('')}</div>`;
}

// ══════════════════════════════════════════════════════════════
// TAB 5: Sentiment
// ══════════════════════════════════════════════════════════════
function tabSentiment(el) {
  let allPostSents = [];

  el.innerHTML = `
  <div class="ai-section">
    <div class="ai-section-hdr"><h3>💬 Sentiment Analysis</h3><p>Phân tích comments — detect crisis, track brand health</p></div>
    <div class="sentiment-layout">
      <div class="sent-input">
        <div class="fg"><label>Chọn bài đăng</label><select id="sent-post" class="field-select"><option value="">-- Bài gần đây --</option><option value="p1">📌 Post #1 — Flash Sale</option><option value="p2">📌 Post #2 — Sản phẩm mới</option><option value="p3">📌 Post #3 — Behind the scenes</option></select></div>
        <p class="fg-hint">Hoặc paste comments (mỗi dòng 1):</p>
        <textarea id="sent-comments" class="field-input" rows="8" placeholder="Sản phẩm tuyệt vời! ❤️&#10;Dịch vụ tệ, chờ 1 tuần ⚠️&#10;Ok, bình thường"></textarea>
        <div class="sent-btn-row"><button id="btn-sent" class="btn btn-primary"><i data-lucide="bar-chart-2" width="16" height="16"></i> Phân tích</button><label class="ai-toggle"><input type="checkbox" id="sent-ai"/><span>Dùng AI</span></label></div>
      </div>
      <div id="sent-result" style="display:none"></div>
    </div>
    <div id="page-sent" class="page-sent-card" style="display:none"><h4>📊 Sentiment toàn trang</h4><div id="page-sent-body"></div></div>
  </div>`;

  el.querySelector('#btn-sent').addEventListener('click', async () => {
    const raw = el.querySelector('#sent-comments').value.trim();
    const postId = el.querySelector('#sent-post').value;
    const useAI = el.querySelector('#sent-ai').checked;
    if (!raw && !postId) return toast('Paste comments hoặc chọn bài!', 'error');

    let comments;
    if (raw) {
      comments = raw.split('\n').filter(Boolean).map((text,i) => ({ id:`c-${i}`, text, author:`User ${i+1}` }));
    } else {
      comments = getMockComments(15);
    }

    const btn = el.querySelector('#btn-sent');
    btn.disabled = true; btn.innerHTML = '⏳ Đang phân tích...';

    const result = await analyzeComments(postId || 'custom', comments, useAI);
    renderSentResult(el.querySelector('#sent-result'), result);
    allPostSents.unshift(result);

    if (allPostSents.length >= 2) {
      const pg = analyzePageSentiment(allPostSents);
      renderPageSent(el.querySelector('#page-sent'), el.querySelector('#page-sent-body'), pg);
    }

    btn.disabled = false; btn.innerHTML = '<i data-lucide="bar-chart-2" width="16" height="16"></i> Phân tích lại';
    if (window.refreshIcons) window.refreshIcons();
  });
}

function renderSentResult(el, r) {
  el.style.display = 'block';
  const scoreCol = r.overallScore >= 60 ? 'var(--color-success)' : r.overallScore >= 30 ? 'var(--color-warning)' : 'var(--color-error)';
  el.innerHTML = `
  <div class="sent-summary"><div class="sent-metric sm-pos"><span class="sm-ico">😍</span><div><div class="sm-lbl">Positive</div><div class="sm-val">${r.positive.count} (${r.positive.pct}%)</div></div></div><div class="sent-metric sm-neu"><span class="sm-ico">😐</span><div><div class="sm-lbl">Neutral</div><div class="sm-val">${r.neutral.count} (${r.neutral.pct}%)</div></div></div><div class="sent-metric sm-neg"><span class="sm-ico">😡</span><div><div class="sm-lbl">Negative</div><div class="sm-val">${r.negative.count} (${r.negative.pct}%)</div></div></div></div>
  <div class="sent-score-box" style="--sc:${scoreCol}"><div class="score-big">${r.overallScore}</div><div class="score-label">Overall Score</div>${r.crisisAlert?'<div class="crisis-alert">🚨 <strong>CRISIS!</strong> >40% negative — respond ngay!</div>':''}</div>
  <div class="sent-comments-list"><h4>💬 Chi tiết</h4>${r.comments.slice(0,12).map(c=>{
    const cls = c.label==='positive'?'sc-pos':c.label==='negative'?'sc-neg':'sc-neu';
    const ico = c.label==='positive'?'😍':c.label==='negative'?'😡':'😐';
    return `<div class="comment-row ${cls}"><span class="c-badge">${ico}</span><div class="c-body"><div class="c-text">${c.text}</div><div class="c-meta">${c.author} • ${c.confidence?(c.confidence*100).toFixed(0)+'%':'—'}</div></div>${c.emotion?`<span class="emo-tag">${c.emotion}</span>`:''}</div>`;
  }).join('')}${r.comments.length>12?`<div class="c-more">+${r.comments.length-12} more</div>`:''}</div>`;
}

function renderPageSent(card, body, pg) {
  card.style.display = 'block';
  const hc = pg.overallHealth==='excellent'?'var(--color-success)':pg.overallHealth==='good'?'var(--color-primary)':pg.overallHealth==='fair'?'var(--color-warning)':'var(--color-error)';
  const hl = { excellent:'🟢 Xuất sắc', good:'🟢 Tốt', fair:'🟡 Trung bình', poor:'🔴 Kém' }[pg.overallHealth];
  body.innerHTML = `
  <div class="ps-metrics"><div class="ps-m"><div style="color:var(--color-success);font-size:18px;font-weight:800">😍 ${pg.avgPositive}%</div><div class="ps-ml">Positive</div></div><div class="ps-m"><div style="font-size:18px;font-weight:800">😐 ${pg.avgNeutral}%</div><div class="ps-ml">Neutral</div></div><div class="ps-m"><div style="color:var(--color-error);font-size:18px;font-weight:800">😡 ${pg.avgNegative}%</div><div class="ps-ml">Negative</div></div></div>
  <div class="ps-health" style="--hc:${hc}"><span>Page Health:</span><strong>${hl}</strong></div>
  ${pg.negTrend!==0?`<div class="ps-trend ${pg.negTrend>0?'pt-warn':'pt-pos'}">${pg.negTrend>0?'📈 Negative tăng':'📉 Negative giảm'} <strong>${Math.abs(pg.negTrend).toFixed(1)}%</strong> trong 7 ngày</div>`:''}
  <div class="ps-rec" style="background:${hc}18;border-left:3px solid ${hc}">💡 ${pg.recommendation}</div>`;
}

// ══════════════════════════════════════════════════════════════
// TAB 6: Trends
// ══════════════════════════════════════════════════════════════
function tabTrends(el) {
  let trends = [], selectedTrend = null;

  el.innerHTML = `
  <div class="ai-section">
    <div class="ai-section-hdr"><h3>🔥 Trending Topics</h3><p>Phát hiện topics viral → tạo content tương ứng</p></div>
    <div class="trends-loader"><button id="btn-trends" class="btn btn-primary">🔄 Lấy Trends hôm nay</button><div id="trends-spin" class="trends-spin" style="display:none"><div class="spinner"></div><span>Đang tìm trends...</span></div></div>
    <div id="trends-list" style="display:none"></div>
    <div id="trend-gen" class="trend-gen" style="display:none"><h4 id="trend-gen-title"></h4><div class="fg"><label>Platform</label><div class="pill-row" id="trend-pf-pills"></div></div><button id="btn-trend-gen" class="btn btn-primary">✍️ Tạo bài từ trend</button><div id="trend-pv" style="display:none"></div></div>
  </div>`;

  el.querySelector('#btn-trends').addEventListener('click', async () => {
    const btn = el.querySelector('#btn-trends');
    const spin = el.querySelector('#trends-spin');
    btn.style.display = 'none'; spin.style.display = 'flex';

    const bv = getBrandVoice();
    trends = await fetchTrends(bv.industry || '', ['facebook','instagram']);

    spin.style.display = 'none';
    btn.style.display = 'inline-flex';
    btn.textContent = '🔄 Refresh';
    renderTrendsList(el.querySelector('#trends-list'), trends, el);
  });

  // Generate content from selected trend
  el.querySelector('#btn-trend-gen')?.addEventListener('click', async () => {
    if (!selectedTrend) return;
    const activePill = el.querySelector('#trend-pf-pills .pill-btn.active');
    const platform = activePill?.dataset.tpf || 'instagram';
    const btn = el.querySelector('#btn-trend-gen');
    btn.disabled = true; btn.textContent = '⏳ Tạo...';

    const content = await generateTrendContent(selectedTrend, platform);
    renderTrendPreview(el.querySelector('#trend-pv'), content, platform);

    btn.disabled = false; btn.textContent = '✍️ Tạo bài từ trend';
  });

  function renderTrendsList(container, list, parent) {
    container.style.display = 'block';
    container.innerHTML = `<div class="trends-grid">${list.slice(0,6).map((t,i)=>`
      <div class="trend-card" data-idx="${i}">
        <div class="tc-hdr"><span class="tc-rank">#${i+1}</span><span class="tc-emoji">${t.emoji}</span></div>
        <div class="tc-topic">${t.topic}</div>
        <div class="tc-stats"><span>📊 ${t.volume>=1000?(t.volume/1000).toFixed(0)+'K':t.volume}</span><span style="color:var(--color-success)">📈 ${t.growth}</span></div>
        <div class="tc-why">${t.whyTrending||''}</div>
        ${t.contentIdeas?`<div class="tc-ideas">💡 ${t.contentIdeas[0]}</div>`:''}
        <button class="btn btn-secondary btn-sm btn-trend-sel" data-tidx="${i}">Tạo content</button>
      </div>`).join('')}</div>`;

    container.querySelectorAll('.btn-trend-sel').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedTrend = list[parseInt(btn.dataset.tidx)];
        const genDiv = parent.querySelector('#trend-gen');
        genDiv.style.display = 'block';
        parent.querySelector('#trend-gen-title').textContent = `${selectedTrend.emoji} ${selectedTrend.topic}`;

        const pills = parent.querySelector('#trend-pf-pills');
        pills.innerHTML = ['facebook','instagram','twitter','linkedin'].map(p=>
          `<button class="pill-btn ${p==='instagram'?'active':''}" data-tpf="${p}">${p}</button>`
        ).join('');
        pills.querySelectorAll('.pill-btn').forEach(b => b.addEventListener('click', () => {
          pills.querySelectorAll('.pill-btn').forEach(x=>x.classList.remove('active'));
          b.classList.add('active');
        }));
      });
    });
  }

  function renderTrendPreview(container, content, platform) {
    container.style.display = 'block';
    container.innerHTML = `
    <div class="trend-pv-card">
      <div class="tpv-label">📝 Bài viết từ trend:</div>
      <textarea class="field-input" rows="6" id="trend-out">${content.text}</textarea>
      <div class="tpv-details">
        <div><strong>Loại:</strong> ${content.contentType}</div>
        <div><strong>Media:</strong> ${content.mediaPrompt}</div>
        ${content.hashtags?.length?`<div><strong>Hashtag:</strong> ${content.hashtags.join(' ')}</div>`:''}
        ${content.trendAngle?`<div><strong>Góc khai thác:</strong> ${content.trendAngle}</div>`:''}
      </div>
      <div class="tpv-actions"><button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText(document.getElementById('trend-out').value);this.textContent='✅ Copied!'">📋 Copy</button></div>
    </div>`;
  }
}

// ══════════════════════════════════════════════════════════════
// TAB 7: History
// ══════════════════════════════════════════════════════════════
function tabHistory(el) {
  const allHistory = getHistory(null, 50);
  const TYPES = ['all','predict','repurpose','bulk','sentiment','trend'];
  const LABELS = { all:'📋 Tất cả', predict:'📊 Predict', repurpose:'♻️ Repurpose', bulk:'📅 Bulk', sentiment:'💬 Sentiment', trend:'🔥 Trends' };

  el.innerHTML = `
  <div class="ai-section">
    <div class="ai-section-hdr"><h3>📜 Lịch sử AI Generations</h3><p>Tất cả nội dung được tạo bởi AI</p></div>
    <div class="hist-filters">${TYPES.map(t=>`<button class="hist-filter ${t==='all'?'active':''}" data-type="${t}">${LABELS[t]}</button>`).join('')}</div>
    <div class="hist-list" id="hist-list"></div>
  </div>`;

  const render = (type) => {
    const list = type==='all' ? allHistory : allHistory.filter(h=>h.type===type);
    const hlist = el.querySelector('#hist-list');
    if (!list.length) { hlist.innerHTML = '<div class="empty-state" style="padding:var(--space-8);text-align:center;color:var(--color-text-muted)">Chưa có dữ liệu</div>'; return; }

    hlist.innerHTML = list.map(h => `
    <div class="hist-item">
      <div class="hi-meta"><span class="hi-type">${LABELS[h.type]||'🤖 AI'}</span><span class="hi-date">${new Date(h.createdAt).toLocaleString('vi-VN')}</span><button class="btn btn-ghost btn-sm hi-like" data-id="${h.id}">${h.liked?'❤️':'🤍'}</button></div>
      <div class="hi-summary">${
        h.type==='predict'   ? `Score: ${h.output?.score||'?'} — ${(h.output?.predictedER||0)}% ER`
      : h.type==='repurpose' ? `Repurpose ${Object.keys(h.output||{}).length} platforms`
      : h.type==='bulk'      ? `Generated ${h.output?.generated||0} posts — "${h.input?.topic||''}"`
      : h.type==='sentiment' ? `${h.output?.positive?.count||0} positive, ${h.output?.negative?.count||0} negative`
      : h.type==='trend'     ? `"${h.input?.trend||''}" → ${h.input?.platform||''}`
      : JSON.stringify(h.input||{}).slice(0,60)
      }</div>
    </div>`).join('');

    hlist.querySelectorAll('.hi-like').forEach(btn => {
      btn.addEventListener('click', () => { likeHistoryItem(btn.dataset.id); btn.textContent = btn.textContent==='❤️'?'🤍':'❤️'; });
    });
  };

  render('all');

  el.querySelectorAll('.hist-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('.hist-filter').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      render(btn.dataset.type);
    });
  });
}
