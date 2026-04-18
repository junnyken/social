// ============================================================
// Platform Composer — Unified compose UI for all platforms
// ============================================================

import { PLATFORMS, getAllConnected, validateContent, isConnected } from './platform-registry.js';
import { previewSpins } from '../facebook/fb-spinner.js';

let _uploadedMedia = [];

export function renderComposer(container, onPublish) {
  _uploadedMedia = [];
  container.innerHTML = getComposerHTML();
  bindComposerEvents(container, onPublish);
  if (window.refreshIcons) window.refreshIcons();
}

function getComposerHTML() {
  const toggles = Object.values(PLATFORMS).map(p => `
    <button class="platform-toggle ${isConnected(p.id) ? '' : ''}" data-platform="${p.id}" data-connected="${isConnected(p.id)}" style="--platform-color:${p.color}" title="${isConnected(p.id) ? p.name : p.name + ' (chưa kết nối)'}">
      <i data-lucide="${p.icon}" width="16" height="16"></i>
      <span>${p.name}</span>
      ${isConnected(p.id) ? '' : '<span class="not-connected-dot"></span>'}
    </button>
  `).join('');

  return `
    <div class="composer">
      <div class="composer-platforms">
        <label style="font-weight:600;font-size:var(--text-sm)">Đăng lên:</label>
        <div class="platform-toggles">${toggles}</div>
      </div>

      <div class="composer-editor">
        <div class="editor-toolbar">
          <button data-action="emoji" title="Emoji">😊</button>
          <button data-action="hashtag" title="Hashtag">#</button>
          <button data-action="mention" title="Mention">@</button>
          <button data-action="link" title="Link">🔗</button>
          <div style="flex:1"></div>
          <button id="btn-spinner-preview" title="Preview spinner">🎲 Spin</button>
        </div>
        <textarea id="composer-text" rows="5" placeholder="Nội dung bài... Dùng {lựa chọn A|lựa chọn B} để spin content tự động"></textarea>
        <div class="char-counter"><span id="char-count">0</span><span id="char-limit">/ ∞</span></div>
      </div>

      <div id="spinner-preview-box" class="spinner-preview" style="display:none">
        <h4 style="margin:0 0 var(--space-2) 0;font-size:var(--text-sm)">🎲 Preview biến thể:</h4>
        <div id="spinner-variants" style="display:flex;flex-direction:column;gap:var(--space-2)"></div>
      </div>

      <div class="composer-media">
        <div class="media-dropzone" id="media-dropzone">
          <i data-lucide="image-plus" width="24" height="24"></i>
          <span>Kéo thả ảnh/video hoặc <u>click để chọn</u></span>
          <input type="file" id="media-input" multiple accept="image/*,video/*" hidden>
        </div>
        <div class="media-preview-grid" id="media-preview-grid"></div>
      </div>

      <div id="composer-warnings" class="composer-warnings"></div>

      <div class="composer-schedule">
        <div class="schedule-toggle">
          <button class="schedule-btn active" data-mode="now">⚡ Đăng ngay</button>
          <button class="schedule-btn" data-mode="schedule">📅 Lên lịch</button>
        </div>
        <div id="schedule-picker" style="display:none;align-items:center;gap:var(--space-2);margin-top:var(--space-2)">
          <input type="datetime-local" id="schedule-time" class="field-input" value="${getDefaultTime()}" style="flex:1"/>
          <span style="font-size:var(--text-xs);color:var(--color-text-muted)">GMT+7</span>
        </div>
      </div>

      <div class="composer-actions">
        <button id="btn-draft" class="btn btn-ghost btn-md">💾 Draft</button>
        <button id="btn-publish" class="btn btn-primary btn-md"><span id="publish-label">⚡ Đăng ngay</span></button>
      </div>
    </div>
  `;
}

function bindComposerEvents(container, onPublish) {
  let selectedPlatforms = new Set();
  let scheduleMode = 'now';

  // Platform toggles
  container.querySelectorAll('.platform-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const pid = btn.dataset.platform;
      if (btn.dataset.connected === 'false') {
        showToast(`Kết nối ${PLATFORMS[pid].name} trước`, 'warning');
        return;
      }
      btn.classList.toggle('active');
      selectedPlatforms.has(pid) ? selectedPlatforms.delete(pid) : selectedPlatforms.add(pid);
      updateCharLimit(selectedPlatforms);
    });
  });

  // Char counter
  container.querySelector('#composer-text').addEventListener('input', (e) => {
    const len = e.target.value.length;
    container.querySelector('#char-count').textContent = len;
    updateCharLimit(selectedPlatforms, len);
  });

  // Spinner preview
  container.querySelector('#btn-spinner-preview')?.addEventListener('click', () => {
    const text = container.querySelector('#composer-text').value;
    if (!text.includes('{')) { showToast('Không có spinner {a|b}', 'info'); return; }
    const variants = previewSpins(text, 3);
    const box = container.querySelector('#spinner-preview-box');
    box.style.display = 'block';
    container.querySelector('#spinner-variants').innerHTML = variants.map((v, i) =>
      `<div style="background:var(--color-surface);padding:var(--space-3);border-radius:var(--radius-sm);border-left:3px solid var(--color-accent);font-size:var(--text-sm);white-space:pre-wrap"><span style="font-weight:600;font-size:10px;color:var(--color-text-muted);text-transform:uppercase">Biến thể ${i+1}</span><br>${v}</div>`
    ).join('');
  });

  // Media
  const dropzone = container.querySelector('#media-dropzone');
  const mediaInput = container.querySelector('#media-input');
  dropzone.addEventListener('click', () => mediaInput.click());
  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
  dropzone.addEventListener('drop', e => { e.preventDefault(); dropzone.classList.remove('drag-over'); handleFiles(Array.from(e.dataTransfer.files), container); });
  mediaInput.addEventListener('change', e => handleFiles(Array.from(e.target.files), container));

  // Schedule toggle
  container.querySelectorAll('.schedule-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.schedule-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      scheduleMode = btn.dataset.mode;
      container.querySelector('#schedule-picker').style.display = scheduleMode === 'schedule' ? 'flex' : 'none';
      container.querySelector('#publish-label').textContent = scheduleMode === 'schedule' ? '📅 Lên lịch' : '⚡ Đăng ngay';
    });
  });

  // Publish
  container.querySelector('#btn-publish').addEventListener('click', async () => {
    const text = container.querySelector('#composer-text').value.trim();
    const scheduledAt = scheduleMode === 'schedule' ? container.querySelector('#schedule-time').value : null;
    if (!text) { showToast('Nhập nội dung', 'error'); return; }
    if (selectedPlatforms.size === 0) { showToast('Chọn ít nhất 1 platform', 'error'); return; }

    const hashtags = text.match(/#\w+/g) || [];
    const allErrors = [];
    selectedPlatforms.forEach(pid => {
      const { errors } = validateContent(pid, { text, images: _uploadedMedia, hashtags });
      allErrors.push(...errors);
    });
    if (allErrors.length > 0) {
      container.querySelector('#composer-warnings').innerHTML = allErrors.map(e => `<div class="warning-item">⚠️ ${e}</div>`).join('');
      return;
    }

    const btn = container.querySelector('#btn-publish');
    btn.disabled = true; btn.innerHTML = '⏳ Đang đăng...';

    const results = await onPublish({ platforms: Array.from(selectedPlatforms), content: text, images: _uploadedMedia, scheduledAt });

    btn.disabled = false;
    btn.innerHTML = `<span id="publish-label">${scheduleMode === 'schedule' ? '📅 Lên lịch' : '⚡ Đăng ngay'}</span>`;

    (results || []).forEach(r => {
      showToast(r.success ? `✅ Đã đăng lên ${PLATFORMS[r.platform]?.name}` : `❌ ${PLATFORMS[r.platform]?.name}: ${r.error}`, r.success ? 'success' : 'error');
    });
  });
}

function handleFiles(files, container) {
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      _uploadedMedia.push({ file, dataUrl: e.target.result });
      const grid = container.querySelector('#media-preview-grid');
      grid.innerHTML = _uploadedMedia.map((m, i) => `
        <div class="media-thumb"><img src="${m.dataUrl}" alt="media ${i+1}"/><button class="media-remove" data-idx="${i}">✕</button></div>
      `).join('');
      grid.querySelectorAll('.media-remove').forEach(btn => {
        btn.addEventListener('click', () => { _uploadedMedia.splice(+btn.dataset.idx, 1); handleFiles([], container); });
      });
    };
    reader.readAsDataURL(file);
  });
}

function updateCharLimit(selected, len = 0) {
  if (selected.size === 0) { document.querySelector('#char-limit').textContent = '/ ∞'; return; }
  const minLimit = Math.min(...Array.from(selected).map(p => PLATFORMS[p].limits.text));
  document.querySelector('#char-limit').textContent = `/ ${minLimit.toLocaleString()}`;
  const el = document.querySelector('#char-count');
  el.style.color = len > minLimit ? 'var(--color-error)' : len > minLimit * 0.8 ? 'var(--color-warning)' : '';
}

function getDefaultTime() {
  return new Date(Date.now() + 3600000).toISOString().slice(0, 16);
}

function showToast(msg, type) {
  if (window.Toast?.show) window.Toast.show(msg, type);
}
