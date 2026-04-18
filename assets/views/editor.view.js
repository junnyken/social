import { Queue } from '../api-client.js';

export async function renderEditor(container) {
  container.innerHTML = `
        <div class="flex-col" style="max-width:860px">
            <h2>Content Editor</h2>
            <div class="card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2)">
                    <div style="display:flex;gap:var(--space-1)">
                        <button class="btn btn-ghost btn-sm" title="Bold"><i data-lucide="bold" width="16" height="16"></i></button>
                        <button class="btn btn-ghost btn-sm" title="Italic"><i data-lucide="italic" width="16" height="16"></i></button>
                        <button class="btn btn-ghost btn-sm" title="Link"><i data-lucide="link" width="16" height="16"></i></button>
                        <button class="btn btn-ghost btn-sm" title="Emoji"><i data-lucide="smile" width="16" height="16"></i></button>
                    </div>
                    <span style="font-size:var(--text-xs);color:var(--color-text-muted)" id="editor-charcount">0 / 2200</span>
                </div>
                <textarea class="field-textarea" id="editor-area" placeholder="Soạn bài ở đây...\nHint: Dùng {option1|option2} để spinner content" style="min-height:180px;font-size:var(--text-base)"></textarea>
                <div style="margin-top:var(--space-3);border-top:1px dashed var(--color-border);padding-top:var(--space-3)">
                    <button class="btn btn-ghost btn-sm" id="btn-tpl-toggle" style="margin-bottom:var(--space-2)"><i data-lucide="chevron-down" width="14" height="14"></i> Template variables</button>
                    <div id="tpl-vars" class="hidden" style="display:flex;gap:var(--space-2);flex-wrap:wrap">
                        <button class="badge badge-info btn-var" data-var="{name}" style="cursor:pointer">{name}</button>
                        <button class="badge badge-info btn-var" data-var="{price}" style="cursor:pointer">{price}</button>
                        <button class="badge badge-info btn-var" data-var="{date}" style="cursor:pointer">{date}</button>
                        <button class="badge badge-info btn-var" data-var="{category}" style="cursor:pointer">{category}</button>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3>Spinner Preview</h3><button class="btn btn-secondary btn-sm" id="btn-spin"><i data-lucide="refresh-cw" width="14" height="14"></i> Spin 3 lần</button></div>
                <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-3)">Nội dung sẽ render như sau:</p>
                <div id="editor-preview" style="display:flex;flex-direction:column;gap:var(--space-2)"><div style="color:var(--color-text-muted);font-size:var(--text-sm);font-style:italic">Chưa có nội dung. Gõ Spintax và nhấn "Spin 3 lần".</div></div>
            </div>
            <div class="card">
                <label class="field-label">Image upload</label>
                <div style="border:2px dashed var(--color-border);border-radius:var(--radius-md);padding:var(--space-8);text-align:center;color:var(--color-text-muted);cursor:pointer;transition:background var(--transition-fast)" onmouseenter="this.style.background='var(--color-surface-hover)'" onmouseleave="this.style.background='transparent'">
                    <i data-lucide="image-plus" width="28" height="28" style="opacity:0.5;margin-bottom:var(--space-2)"></i>
                    <div>Drag & drop hoặc click chọn file</div>
                </div>
            </div>
            <div class="card">
                <h3 style="margin-bottom:var(--space-4)">Post settings</h3>
                <div style="display:flex;gap:var(--space-4);flex-wrap:wrap">
                    <div class="field" style="flex:1;min-width:200px"><label class="field-label">Account</label><input type="text" id="post-acc" class="field-input" placeholder="accountId"></div>
                    <div class="field" style="flex:1;min-width:200px"><label class="field-label">Group ID</label><input type="text" id="post-target" class="field-input" placeholder="group id"></div>
                </div>
                <div style="display:flex;gap:var(--space-3);margin-top:var(--space-2)">
                    <button class="btn btn-ghost btn-md">Preview</button>
                    <button class="btn btn-primary btn-md" style="margin-left:auto" id="btn-schedule">Schedule Post</button>
                </div>
            </div>
        </div>
  `;
  if(window.refreshIcons) window.refreshIcons();

  document.getElementById('editor-area').addEventListener('input', e => {
      const len = e.target.value.length;
      const cnt = document.getElementById('editor-charcount');
      cnt.textContent = `${len} / 2200`;
      cnt.style.color = len > 2200 ? 'var(--color-error)' : 'var(--color-text-muted)';
  });

  document.getElementById('btn-tpl-toggle').addEventListener('click', () => {
      document.getElementById('tpl-vars').classList.toggle('hidden');
  });

  document.querySelectorAll('.btn-var').forEach(btn => {
      btn.addEventListener('click', (e) => {
          const v = e.target.dataset.var;
          const ta = document.getElementById('editor-area');
          const s = ta.selectionStart, end = ta.selectionEnd;
          ta.value = ta.value.substring(0,s) + v + ta.value.substring(end);
          ta.selectionStart = ta.selectionEnd = s + v.length;
          ta.focus();
          ta.dispatchEvent(new Event('input'));
      });
  });

  document.getElementById('btn-spin').addEventListener('click', () => {
      const source = document.getElementById('editor-area').value;
      const preview = document.getElementById('editor-preview');
      if (!source.trim()) { preview.innerHTML = '<div style="color:var(--color-text-muted);font-size:var(--text-sm);font-style:italic">Chưa có nội dung.</div>'; return; }

      let html = '';
      for (let i = 0; i < 3; i++) {
          let parsed = source, safety = 0;
          while (parsed.includes('{') && parsed.includes('}') && safety++ < 50) {
              const s = parsed.indexOf('{'), e = parsed.indexOf('}', s);
              if (e <= s) break;
              const parts = parsed.substring(s+1, e).split('|');
              parsed = parsed.substring(0,s) + parts[Math.floor(Math.random()*parts.length)] + parsed.substring(e+1);
          }
          html += `<div style="background:var(--color-surface);padding:var(--space-3);border-radius:var(--radius-sm);border-left:3px solid var(--color-accent);font-size:var(--text-sm);white-space:pre-wrap"><div style="font-weight:500;font-size:10px;color:var(--color-text-muted);text-transform:uppercase;margin-bottom:4px">Biến thể ${i+1}</div>${parsed}</div>`;
      }
      preview.innerHTML = html;
  });

  document.getElementById('btn-schedule').addEventListener('click', async () => {
      const acc = document.getElementById('post-acc').value;
      const t = document.getElementById('post-target').value;
      const content = document.getElementById('editor-area').value;
      
      try {
          await Queue.add({
              accountId: acc || 'acc1',
              target: { type: 'group', id: t || 'demo123', name: 'Demo Group' },
              content: content || 'Demo',
              scheduledAt: new Date(Date.now() + 60000).toISOString()
          });
          window.Toast && window.Toast.show('Post scheduled successfully!', 'success');
          document.getElementById('editor-area').value = '';
      } catch(e) {
          window.Toast && window.Toast.show('Error scheduling post', 'error');
      }
  });
}
