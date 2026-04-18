// ============================================================
// Library UI — Media Grid + Templates + Upload
// ============================================================

import { addMedia, removeMedia, getMedia, getAllTags, updateMediaTags, getTemplates, addTemplate, useTemplate, removeTemplate, seedDefaultTemplates, onUpdate } from './library-store.js';
import { processFiles } from './library-upload.js';

export function renderLibrary(container) {
  seedDefaultTemplates();
  container.innerHTML = getHTML();
  if (window.refreshIcons) window.refreshIcons();
  onUpdate(() => refreshAll(container));
  refreshAll(container);
  bindEvents(container);
}

function getHTML() {
  return `
    <div style="display:flex;flex-direction:column;gap:var(--space-4)">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h2 style="margin:0">Content Library</h2>
        <div style="display:flex;gap:var(--space-2)">
          <button id="btn-upload" class="btn btn-primary btn-sm"><i data-lucide="upload" width="14" height="14"></i> Upload</button>
          <input type="file" id="lib-file-input" multiple accept="image/*,video/*" hidden/>
        </div>
      </div>

      <div class="library-tabs">
        <button class="lib-tab active" data-tab="media">🖼️ Media <span id="media-count" class="tab-count">0</span></button>
        <button class="lib-tab" data-tab="templates">📝 Templates <span id="tpl-count" class="tab-count">0</span></button>
      </div>

      <div id="upload-progress" style="display:none" class="upload-progress">
        <div class="progress-bar-wrap"><div class="progress-bar" id="prog-bar" style="width:0%"></div></div>
        <span id="prog-label">Đang xử lý...</span>
      </div>

      <div id="lib-media" class="lib-content">
        <div class="lib-filters">
          <input type="text" id="media-search" placeholder="🔍 Tìm media..." class="field-input" style="max-width:220px"/>
          <select id="media-type" class="field-select"><option value="">Tất cả</option><option value="image">🖼 Ảnh</option><option value="video">🎬 Video</option></select>
          <div id="tag-filters" class="tag-filter-row"></div>
        </div>
        <div id="media-dropzone" class="lib-dropzone"><i data-lucide="cloud-upload" width="36" height="36"></i><p>Kéo thả ảnh/video vào đây</p><span style="font-size:var(--text-xs);color:var(--color-text-muted)">JPG, PNG, GIF, WebP, MP4 · Max 5MB/ảnh</span></div>
        <div class="media-grid" id="media-grid"></div>
      </div>

      <div id="lib-templates" class="lib-content" style="display:none">
        <div class="lib-filters">
          <input type="text" id="tpl-search" placeholder="🔍 Tìm template..." class="field-input" style="max-width:220px"/>
          <select id="tpl-platform" class="field-select"><option value="">Tất cả platforms</option><option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="twitter">X/Twitter</option></select>
          <select id="tpl-category" class="field-select"><option value="">Tất cả danh mục</option><option value="promotion">🔥 Promotion</option><option value="engagement">💬 Engagement</option><option value="announcement">📢 Announcement</option></select>
        </div>
        <div class="templates-grid" id="tpl-grid"></div>
      </div>

      <div id="tpl-modal" class="modal-backdrop" style="display:none">
        <div class="modal-box" style="max-width:440px">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-4);border-bottom:1px solid var(--color-border)"><h3 id="tpl-modal-title" style="margin:0;font-size:var(--text-base)"></h3><button id="close-tpl-modal" class="btn btn-ghost btn-sm">✕</button></div>
          <div id="tpl-modal-vars" style="padding:var(--space-4)"></div>
          <div style="display:flex;gap:var(--space-2);justify-content:flex-end;padding:var(--space-3) var(--space-4);border-top:1px solid var(--color-border)"><button id="cancel-tpl" class="btn btn-secondary btn-sm">Hủy</button><button id="use-tpl" class="btn btn-primary btn-sm">✅ Dùng</button></div>
        </div>
      </div>
    </div>`;
}

function refreshAll(c) {
  renderMediaGrid(c);
  renderTemplates(c);
  renderTagFilters(c);
  c.querySelector('#media-count').textContent = getMedia().length;
  c.querySelector('#tpl-count').textContent = getTemplates().length;
  if (window.refreshIcons) window.refreshIcons();
}

function renderMediaGrid(c) {
  const s = c.querySelector('#media-search')?.value || '', t = c.querySelector('#media-type')?.value || '', tag = c.querySelector('.tag-chip.active')?.dataset.tag || '';
  const items = getMedia({ search: s, type: t, tag });
  const grid = c.querySelector('#media-grid');
  if (!items.length) { grid.innerHTML = '<div style="text-align:center;padding:var(--space-8);color:var(--color-text-muted)">Chưa có media. Upload để bắt đầu.</div>'; return; }

  grid.innerHTML = items.map(m => `
    <div class="media-item" data-id="${m.id}">
      <div class="media-thumb-wrap">
        ${m.type === 'image' ? `<img src="${m.dataUrl}" alt="${m.name}" loading="lazy"/>` : `<div class="video-thumb"><i data-lucide="play-circle" width="28" height="28"></i><span>${m.name}</span></div>`}
        <div class="media-overlay"><button class="media-action-btn media-del" data-id="${m.id}" title="Xóa">🗑</button></div>
      </div>
      <div class="media-meta"><div class="media-name">${m.name}</div><div class="media-info">${m.dimensions ? m.dimensions.width + '×' + m.dimensions.height + ' · ' : ''}${_fsize(m.size)}</div>
        <div class="media-tags">${m.tags.map(t => `<span class="media-tag">${t}</span>`).join('')}</div>
      </div>
    </div>`).join('');

  grid.querySelectorAll('.media-del').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); if (confirm('Xóa?')) { removeMedia(b.dataset.id); if (window.Toast) window.Toast.show('Đã xóa', 'info'); } }));
  if (window.refreshIcons) window.refreshIcons();
}

function renderTemplates(c) {
  const s = c.querySelector('#tpl-search')?.value || '', p = c.querySelector('#tpl-platform')?.value || '', cat = c.querySelector('#tpl-category')?.value || '';
  const tpls = getTemplates({ search: s, platform: p, category: cat });
  const grid = c.querySelector('#tpl-grid');
  const catCols = { promotion: '#EF4444', engagement: '#3B82F6', announcement: '#F59E0B', general: '#6B7280' };

  grid.innerHTML = tpls.map(t => `
    <div class="template-card">
      <div class="template-title">${t.title}</div>
      <div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-2);flex-wrap:wrap">
        <span class="template-cat-badge" style="background:${catCols[t.category] || '#888'}18;color:${catCols[t.category] || '#888'}">${t.category}</span>
        ${t.platform !== 'all' ? `<span style="font-size:11px;color:var(--color-text-muted)">${t.platform}</span>` : ''}
        <span style="font-size:11px;color:var(--color-text-muted)">Dùng ${t.usageCount}x</span>
      </div>
      <div class="template-preview">${t.content.slice(0, 100)}...</div>
      ${t.variables?.length ? `<div style="font-size:10px;color:var(--color-text-muted);margin-bottom:var(--space-2)">📌 ${t.variables.map(v => '{{' + v + '}}').join(', ')}</div>` : ''}
      <div style="display:flex;gap:var(--space-2)">
        <button class="btn btn-primary btn-sm tpl-use" data-id="${t.id}">✅ Dùng</button>
        <button class="btn btn-ghost btn-sm tpl-del" data-id="${t.id}">🗑</button>
      </div>
    </div>`).join('');

  grid.querySelectorAll('.tpl-use').forEach(b => b.addEventListener('click', () => openTplModal(c, b.dataset.id)));
  grid.querySelectorAll('.tpl-del').forEach(b => b.addEventListener('click', () => { if (confirm('Xóa?')) removeTemplate(b.dataset.id); }));
}

function openTplModal(c, id) {
  const tpls = getTemplates(), t = tpls.find(x => x.id === id);
  if (!t) return;
  if (!t.variables?.length) {
    const content = useTemplate(id);
    if (content) _injectToComposer(content);
    return;
  }
  c.querySelector('#tpl-modal-title').textContent = t.title;
  c.querySelector('#tpl-modal-vars').innerHTML = `<p style="font-size:var(--text-xs);color:var(--color-text-muted);margin:0 0 var(--space-3) 0">Điền thông tin:</p>` + t.variables.map(v => `<div style="margin-bottom:var(--space-2)"><label style="font-size:var(--text-xs);font-weight:600;display:block;margin-bottom:2px">${v}</label><input type="text" class="field-input tpl-var" data-var="${v}" placeholder="${v}..."/></div>`).join('');
  c.querySelector('#tpl-modal').style.display = 'flex';

  c.querySelector('#use-tpl').onclick = () => {
    const vars = {}; c.querySelectorAll('.tpl-var').forEach(i => { vars[i.dataset.var] = i.value || `[${i.dataset.var}]`; });
    const content = useTemplate(id, vars);
    if (content) _injectToComposer(content);
    c.querySelector('#tpl-modal').style.display = 'none';
  };
  ['#close-tpl-modal','#cancel-tpl'].forEach(s => { c.querySelector(s).onclick = () => c.querySelector('#tpl-modal').style.display = 'none'; });
}

function _injectToComposer(content) {
  const ta = document.querySelector('#composer-text');
  if (ta) { ta.value = content; ta.dispatchEvent(new Event('input')); }
  if (window.Toast) window.Toast.show('Đã điền template!', 'success');
  window.location.hash = '#/compose';
}

function renderTagFilters(c) {
  const tags = getAllTags(), row = c.querySelector('#tag-filters');
  if (!row) return;
  row.innerHTML = tags.map(t => `<button class="tag-chip" data-tag="${t}">${t}</button>`).join('');
  row.querySelectorAll('.tag-chip').forEach(chip => chip.addEventListener('click', () => {
    const was = chip.classList.contains('active');
    row.querySelectorAll('.tag-chip').forEach(x => x.classList.remove('active'));
    if (!was) chip.classList.add('active');
    renderMediaGrid(c);
  }));
}

function bindEvents(c) {
  c.querySelectorAll('.lib-tab').forEach(tab => tab.addEventListener('click', () => {
    c.querySelectorAll('.lib-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    c.querySelector('#lib-media').style.display = tab.dataset.tab === 'media' ? 'block' : 'none';
    c.querySelector('#lib-templates').style.display = tab.dataset.tab === 'templates' ? 'block' : 'none';
  }));

  c.querySelector('#btn-upload')?.addEventListener('click', () => c.querySelector('#lib-file-input')?.click());
  c.querySelector('#lib-file-input')?.addEventListener('change', async e => { await handleUpload(Array.from(e.target.files), c); e.target.value = ''; });

  const dz = c.querySelector('#media-dropzone');
  dz?.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz?.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
  dz?.addEventListener('drop', async e => { e.preventDefault(); dz.classList.remove('drag-over'); await handleUpload(Array.from(e.dataTransfer.files), c); });
  dz?.addEventListener('click', () => c.querySelector('#lib-file-input')?.click());

  ['#media-search','#media-type'].forEach(s => c.querySelector(s)?.addEventListener('input', () => renderMediaGrid(c)));
  ['#tpl-search','#tpl-platform','#tpl-category'].forEach(s => c.querySelector(s)?.addEventListener('change', () => renderTemplates(c)));
}

async function handleUpload(files, c) {
  const pe = c.querySelector('#upload-progress'), pb = c.querySelector('#prog-bar'), pl = c.querySelector('#prog-label');
  pe.style.display = 'flex';
  const results = await processFiles(files, pct => { pb.style.width = pct + '%'; pl.textContent = `Đang xử lý... ${Math.round(pct)}%`; });
  results.forEach(r => { if (r.error) { if (window.Toast) window.Toast.show('❌ ' + r.error, 'error'); } else addMedia(r); });
  pe.style.display = 'none';
  const ok = results.filter(r => !r.error).length;
  if (ok > 0 && window.Toast) window.Toast.show(`✅ Đã upload ${ok} file!`, 'success');
}

function _fsize(b) { if (!b) return '—'; if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(1) + ' MB'; }
