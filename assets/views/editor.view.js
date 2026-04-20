import { Queue, Accounts, Pages, api } from '../api-client.js';
import { renderPageSelector, getSelectedPageId } from '../components/page-selector.js';

let _uploadedImages = [];
let _selectedEmoji = '';

export async function renderEditor(container) {
  container.innerHTML = `
    <div style="max-width:1400px; margin:0 auto; font-family:'Satoshi',sans-serif;">

      <!-- Header -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
        <div>
          <h1 style="font-size:24px; font-weight:700; color:var(--text); margin:0;">✏️ Content Editor</h1>
          <p style="color:var(--text-muted); font-size:13px; margin-top:4px;">Soạn nội dung, xem trước và đăng bài lên các nền tảng</p>
        </div>
        <div style="display:flex; gap:10px; align-items:center;">
          <div id="editor-page-selector-container"></div>
        </div>
      </div>

      <!-- 2-Column Layout -->
      <div style="display:grid; grid-template-columns:1fr 400px; gap:24px; align-items:start;">
        
        <!-- LEFT: Editor Area -->
        <div style="display:flex; flex-direction:column; gap:20px;">

          <!-- Main Editor Card -->
          <div style="background:var(--surface); border:1px solid var(--border); border-radius:16px; overflow:hidden;">
            
            <!-- Toolbar -->
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid var(--border); background:var(--surface-hover);">
              <div style="display:flex; gap:4px; align-items:center;">
                <button class="editor-tool-btn" id="btn-bold" title="Bold"><i data-lucide="bold" width="16" height="16"></i></button>
                <button class="editor-tool-btn" id="btn-italic" title="Italic"><i data-lucide="italic" width="16" height="16"></i></button>
                <button class="editor-tool-btn" id="btn-link" title="Chèn Link"><i data-lucide="link" width="16" height="16"></i></button>
                <button class="editor-tool-btn" id="btn-hashtag" title="Hashtag"><i data-lucide="hash" width="16" height="16"></i></button>
                <div style="width:1px; height:20px; background:var(--border); margin:0 6px;"></div>
                <button class="editor-tool-btn" id="btn-emoji" title="Emoji">😊</button>
                <button class="editor-tool-btn" id="btn-ai-write" title="AI viết bài" style="background:linear-gradient(135deg, #8B5CF6, #EC4899); color:#fff; border-radius:8px; padding:4px 12px; font-size:12px; font-weight:600;">
                  ✨ AI viết
                </button>
              </div>
              <div style="display:flex; align-items:center; gap:10px;">
                <span id="editor-charcount" style="font-size:11px; color:var(--text-muted); font-weight:500;">0 / 2,200</span>
              </div>
            </div>

            <!-- Emoji Picker (hidden by default) -->
            <div id="emoji-picker-container" style="display:none; padding:12px 16px; border-bottom:1px solid var(--border); background:var(--surface-hover);">
              <div style="display:flex; flex-wrap:wrap; gap:6px; max-height:120px; overflow-y:auto;">
                ${['😊','😂','❤️','🔥','👍','🎉','💪','🏆','📢','💡','✅','🚀','⭐','💰','🎯','📌','✨','🙏','👏','💬','📸','🎁','🛒','💎','🌟','😍','🤩','💯','📊','🔔','🆕','⚡','🌈','👀','🤝','💼','📱','🎨','🧡','💙'].map(e => 
                  `<button class="emoji-btn" data-emoji="${e}" style="font-size:20px; padding:4px 6px; border:none; background:none; cursor:pointer; border-radius:6px; transition:background 0.15s;" onmouseenter="this.style.background='var(--surface-hover)'" onmouseleave="this.style.background='none'">${e}</button>`
                ).join('')}
              </div>
            </div>

            <!-- AI Panel (hidden by default) -->
            <div id="ai-panel" style="display:none; padding:16px; border-bottom:1px solid var(--border); background:linear-gradient(135deg, rgba(139,92,246,0.05), rgba(236,72,153,0.05));">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                <span style="font-size:14px; font-weight:700; background:linear-gradient(90deg,#8B5CF6,#EC4899); -webkit-background-clip:text; color:transparent;">✨ AI Content Generator</span>
                <button id="btn-close-ai" style="margin-left:auto; font-size:16px; cursor:pointer; background:none; border:none; color:var(--text-muted);">✕</button>
              </div>
              <div style="display:flex; gap:8px;">
                <input id="ai-prompt" class="field-input" placeholder="Mô tả nội dung bạn muốn viết... VD: Bài giới thiệu sản phẩm thịt bò Fuji" style="flex:1; min-height:38px; font-size:13px;">
                <select id="ai-tone" class="field-select" style="width:130px; min-height:38px; font-size:12px;">
                  <option value="professional">🏢 Chuyên nghiệp</option>
                  <option value="friendly">😊 Thân thiện</option>
                  <option value="funny">😂 Hài hước</option>
                  <option value="promotional">📢 Quảng cáo</option>
                  <option value="storytelling">📖 Kể chuyện</option>
                </select>
                <button id="btn-ai-generate" style="padding:8px 16px; border-radius:10px; border:none; background:linear-gradient(135deg,#8B5CF6,#EC4899); color:#fff; font-size:13px; font-weight:600; cursor:pointer; white-space:nowrap;">Tạo bài ✨</button>
              </div>
              <div id="ai-loading" style="display:none; padding:12px 0; text-align:center; color:var(--text-muted); font-size:13px;">
                <span style="animation:pulse 1.5s infinite;">🧠 AI đang viết bài cho bạn...</span>
              </div>
            </div>

            <!-- Textarea -->
            <div style="padding:0;">
              <textarea class="field-textarea" id="editor-area" placeholder="Soạn bài ở đây...&#10;&#10;💡 Tip: Dùng {option1|option2} để tạo Spintax&#10;📌 Dùng #hashtag để thêm hashtag&#10;✨ Bấm &quot;AI viết&quot; để AI soạn bài tự động" style="min-height:220px; font-size:15px; line-height:1.7; border:none; border-radius:0; padding:16px 20px; resize:vertical;"></textarea>
            </div>

            <!-- Template Variables -->
            <div style="padding:12px 16px; border-top:1px solid var(--border); background:var(--surface-hover);">
              <button id="btn-tpl-toggle" style="font-size:12px; font-weight:600; color:var(--text-muted); cursor:pointer; background:none; border:none; display:flex; align-items:center; gap:6px;">
                <i data-lucide="chevron-right" width="14" height="14" id="tpl-chevron"></i> Biến mẫu (Template Variables)
              </button>
              <div id="tpl-vars" style="display:none; margin-top:10px; display:none; flex-wrap:wrap; gap:6px;">
                ${['{name}','{price}','{date}','{category}','{link}','{phone}'].map(v => 
                  `<button class="btn-var" data-var="${v}" style="padding:4px 12px; border-radius:20px; border:1px solid var(--color-primary); background:rgba(59,130,246,0.08); color:var(--color-primary); font-size:12px; font-weight:500; cursor:pointer; transition:all 0.15s;" onmouseenter="this.style.background='var(--color-primary)';this.style.color='#fff'" onmouseleave="this.style.background='rgba(59,130,246,0.08)';this.style.color='var(--color-primary)'">${v}</button>`
                ).join('')}
              </div>
            </div>
          </div>

          <!-- Spinner Preview Card -->
          <div style="background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
              <div>
                <h3 style="margin:0; font-size:15px; font-weight:700;">🎰 Spinner Preview</h3>
                <p style="font-size:11px; color:var(--text-muted); margin-top:2px;">Xem trước các biến thể Spintax sẽ tạo ra</p>
              </div>
              <button id="btn-spin" style="padding:8px 16px; border-radius:10px; border:1px solid var(--border); background:var(--surface-hover); color:var(--text); font-size:12px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.15s;" onmouseenter="this.style.borderColor='var(--color-primary)'" onmouseleave="this.style.borderColor='var(--border)'">
                <i data-lucide="refresh-cw" width="14" height="14"></i> Spin 3 lần
              </button>
            </div>
            <div id="editor-preview" style="display:flex; flex-direction:column; gap:10px;">
              <div style="color:var(--text-muted); font-size:13px; font-style:italic; text-align:center; padding:20px;">Chưa có nội dung. Gõ Spintax rồi nhấn "Spin 3 lần".</div>
            </div>
          </div>

          <!-- Image Upload Card -->
          <div style="background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:20px;">
            <h3 style="margin:0 0 12px 0; font-size:15px; font-weight:700;">🖼️ Hình ảnh & Media</h3>
            <div id="image-preview-grid" style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:12px;"></div>
            <label for="editor-image-input" style="display:flex; flex-direction:column; align-items:center; justify-content:center; border:2px dashed var(--border); border-radius:12px; padding:28px; cursor:pointer; transition:all 0.2s; color:var(--text-muted);" onmouseenter="this.style.borderColor='var(--color-primary)'; this.style.background='rgba(59,130,246,0.03)'" onmouseleave="this.style.borderColor='var(--border)'; this.style.background='transparent'">
              <i data-lucide="image-plus" width="32" height="32" style="opacity:0.5; margin-bottom:8px;"></i>
              <span style="font-size:13px; font-weight:500;">Kéo thả hoặc click để chọn ảnh</span>
              <span style="font-size:11px; margin-top:4px;">PNG, JPG, GIF — Tối đa 10MB</span>
            </label>
            <input type="file" id="editor-image-input" accept="image/*" multiple style="display:none;">
          </div>
        </div>

        <!-- RIGHT: Preview + Post Settings -->
        <div style="display:flex; flex-direction:column; gap:20px; position:sticky; top:20px;">
          
          <!-- Live Preview Card -->
          <div style="background:var(--surface); border:1px solid var(--border); border-radius:16px; overflow:hidden;">
            <div style="padding:14px 16px; border-bottom:1px solid var(--border); background:var(--surface-hover);">
              <h3 style="margin:0; font-size:14px; font-weight:700; display:flex; align-items:center; gap:8px;">
                <span style="width:8px; height:8px; background:#10b981; border-radius:50%; display:inline-block;"></span>
                Live Preview
              </h3>
            </div>
            <div style="padding:16px;">
              <!-- Mock Facebook Post Preview -->
              <div style="border:1px solid var(--border); border-radius:12px; overflow:hidden; background:var(--bg);">
                <div style="padding:12px 16px; display:flex; align-items:center; gap:10px;">
                  <div style="width:40px; height:40px; border-radius:50%; background:linear-gradient(135deg,#1877F2,#42a5f5); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:16px;" id="preview-avatar">P</div>
                  <div>
                    <div style="font-weight:600; font-size:13px; color:var(--text);" id="preview-page-name">Tên Page</div>
                    <div style="font-size:11px; color:var(--text-muted);">Vừa xong · 🌐</div>
                  </div>
                </div>
                <div id="live-preview-text" style="padding:0 16px 12px; font-size:14px; line-height:1.6; color:var(--text); white-space:pre-wrap; word-break:break-word; max-height:200px; overflow-y:auto;">
                  <span style="color:var(--text-muted); font-style:italic;">Nội dung sẽ hiển thị ở đây khi bạn soạn bài...</span>
                </div>
                <div id="live-preview-images" style="display:none;"></div>
                <div style="padding:8px 16px; border-top:1px solid var(--border); display:flex; justify-content:space-around;">
                  <span style="font-size:12px; color:var(--text-muted); display:flex; align-items:center; gap:4px;">👍 Thích</span>
                  <span style="font-size:12px; color:var(--text-muted); display:flex; align-items:center; gap:4px;">💬 Bình luận</span>
                  <span style="font-size:12px; color:var(--text-muted); display:flex; align-items:center; gap:4px;">↗ Chia sẻ</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Post Settings Card -->
          <div style="background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:20px;">
            <h3 style="margin:0 0 16px 0; font-size:15px; font-weight:700;">⚙️ Cài đặt đăng bài</h3>
            <div style="display:flex; flex-direction:column; gap:14px;">
              <div>
                <label style="font-size:12px; font-weight:600; color:var(--text-muted); display:block; margin-bottom:6px;">📱 Account</label>
                <select id="post-acc" class="field-select" style="width:100%; min-height:40px; font-size:13px; border-radius:10px;">
                  <option value="">Đang tải...</option>
                </select>
              </div>
              <div>
                <label style="font-size:12px; font-weight:600; color:var(--text-muted); display:block; margin-bottom:6px;">🎯 Target Page</label>
                <select id="post-target" class="field-select" style="width:100%; min-height:40px; font-size:13px; border-radius:10px;">
                  <option value="">Đang tải...</option>
                </select>
              </div>
              <div>
                <label style="font-size:12px; font-weight:600; color:var(--text-muted); display:block; margin-bottom:6px;">🕐 Thời gian đăng</label>
                <div style="display:flex; gap:8px;">
                  <button class="schedule-type-btn active" data-type="now" style="flex:1; padding:8px; border-radius:10px; border:1px solid var(--color-primary); background:rgba(59,130,246,0.08); color:var(--color-primary); font-size:12px; font-weight:600; cursor:pointer;">⚡ Đăng ngay</button>
                  <button class="schedule-type-btn" data-type="schedule" style="flex:1; padding:8px; border-radius:10px; border:1px solid var(--border); background:transparent; color:var(--text-muted); font-size:12px; font-weight:600; cursor:pointer;">📅 Hẹn giờ</button>
                </div>
              </div>
              <div id="schedule-datetime-container" style="display:none;">
                <input type="datetime-local" id="schedule-datetime" class="field-input" style="width:100%; min-height:40px; font-size:13px; border-radius:10px;">
              </div>
            </div>

            <div style="display:flex; gap:10px; margin-top:20px;">
              <button id="btn-preview-post" style="flex:1; padding:10px; border-radius:12px; border:1px solid var(--border); background:var(--surface-hover); color:var(--text); font-size:13px; font-weight:600; cursor:pointer; transition:all 0.15s;" onmouseenter="this.style.borderColor='var(--color-primary)'" onmouseleave="this.style.borderColor='var(--border)'">
                👁 Preview
              </button>
              <button id="btn-schedule" style="flex:2; padding:10px; border-radius:12px; border:none; background:linear-gradient(135deg, var(--color-primary), #2563eb); color:#fff; font-size:13px; font-weight:700; cursor:pointer; transition:all 0.15s; box-shadow:0 4px 12px rgba(59,130,246,0.3);" onmouseenter="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 16px rgba(59,130,246,0.4)'" onmouseleave="this.style.transform='none'; this.style.boxShadow='0 4px 12px rgba(59,130,246,0.3)'">
                🚀 Đăng bài
              </button>
            </div>
          </div>

          <!-- Quick Stats -->
          <div style="background:linear-gradient(135deg, rgba(139,92,246,0.06), rgba(59,130,246,0.06)); border:1px solid rgba(139,92,246,0.15); border-radius:16px; padding:16px;">
            <h4 style="margin:0 0 12px; font-size:13px; font-weight:700; color:var(--text);">📊 Phân tích nội dung</h4>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div style="text-align:center; padding:10px; background:var(--surface); border-radius:10px;">
                <div id="stat-words" style="font-size:20px; font-weight:800; color:var(--color-primary);">0</div>
                <div style="font-size:10px; color:var(--text-muted);">Từ</div>
              </div>
              <div style="text-align:center; padding:10px; background:var(--surface); border-radius:10px;">
                <div id="stat-hashtags" style="font-size:20px; font-weight:800; color:#8B5CF6;">0</div>
                <div style="font-size:10px; color:var(--text-muted);">Hashtags</div>
              </div>
              <div style="text-align:center; padding:10px; background:var(--surface); border-radius:10px;">
                <div id="stat-emojis" style="font-size:20px; font-weight:800; color:#EC4899;">0</div>
                <div style="font-size:10px; color:var(--text-muted);">Emojis</div>
              </div>
              <div style="text-align:center; padding:10px; background:var(--surface); border-radius:10px;">
                <div id="stat-readtime" style="font-size:20px; font-weight:800; color:#10b981;">0s</div>
                <div style="font-size:10px; color:var(--text-muted);">Thời gian đọc</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  if (window.refreshIcons) window.refreshIcons();
  if (window.lucide) setTimeout(() => window.lucide.createIcons(), 0);

  // ── Page Selector ──
  const pageSelectorContainer = container.querySelector('#editor-page-selector-container');
  if (pageSelectorContainer) {
    const { renderPageSelector: rps } = await import('../components/page-selector.js').catch(() => ({}));
    if (rps) rps(pageSelectorContainer, () => {});
  }

  // ── Text Editor Logic ──
  const textarea = document.getElementById('editor-area');
  const charCount = document.getElementById('editor-charcount');
  const livePreview = document.getElementById('live-preview-text');

  function updateStats() {
    const text = textarea.value;
    const len = text.length;
    charCount.textContent = `${len.toLocaleString()} / 2,200`;
    charCount.style.color = len > 2200 ? 'var(--color-error)' : len > 1800 ? 'var(--color-warning)' : 'var(--text-muted)';
    
    // Live preview
    if (text.trim()) {
      livePreview.innerHTML = text.replace(/\n/g, '<br>').replace(/(#\w+)/g, '<span style="color:#1877F2">$1</span>');
    } else {
      livePreview.innerHTML = '<span style="color:var(--text-muted); font-style:italic;">Nội dung sẽ hiển thị ở đây khi bạn soạn bài...</span>';
    }

    // Stats
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const hashtags = (text.match(/#\w+/g) || []).length;
    const emojis = (text.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || []).length;
    const readTime = Math.max(1, Math.ceil(words / 200 * 60));

    document.getElementById('stat-words').textContent = words;
    document.getElementById('stat-hashtags').textContent = hashtags;
    document.getElementById('stat-emojis').textContent = emojis;
    document.getElementById('stat-readtime').textContent = readTime + 's';
  }

  textarea.addEventListener('input', updateStats);

  // ── Toolbar: Bold / Italic ──
  document.getElementById('btn-bold').addEventListener('click', () => wrapSelection('**', '**'));
  document.getElementById('btn-italic').addEventListener('click', () => wrapSelection('_', '_'));
  document.getElementById('btn-link').addEventListener('click', () => {
    const url = prompt('Nhập URL:');
    if (url) insertAtCursor(' ' + url + ' ');
  });
  document.getElementById('btn-hashtag').addEventListener('click', () => insertAtCursor('#'));

  // ── Emoji Picker ──
  const emojiPanel = document.getElementById('emoji-picker-container');
  document.getElementById('btn-emoji').addEventListener('click', () => {
    emojiPanel.style.display = emojiPanel.style.display === 'none' ? 'block' : 'none';
  });
  document.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      insertAtCursor(btn.dataset.emoji);
      emojiPanel.style.display = 'none';
    });
  });

  // ── AI Panel ──
  const aiPanel = document.getElementById('ai-panel');
  document.getElementById('btn-ai-write').addEventListener('click', () => {
    aiPanel.style.display = aiPanel.style.display === 'none' ? 'block' : 'none';
  });
  document.getElementById('btn-close-ai').addEventListener('click', () => {
    aiPanel.style.display = 'none';
  });
  document.getElementById('btn-ai-generate').addEventListener('click', async () => {
    const prompt = document.getElementById('ai-prompt').value.trim();
    const tone = document.getElementById('ai-tone').value;
    if (!prompt) { 
      window.Toast && window.Toast.show('Vui lòng mô tả nội dung bạn muốn viết', 'warning'); 
      return; 
    }
    const loading = document.getElementById('ai-loading');
    loading.style.display = 'block';
    try {
      const res = await api.post('/ai/compose', {
        topic: prompt,
        platform: 'facebook',
        tone: tone
      });
      if (res.data?.text || res.data?.content) {
        textarea.value = res.data.text || res.data.content;
        updateStats();
        window.Toast && window.Toast.show('✨ AI đã tạo bài viết!', 'success');
        aiPanel.style.display = 'none';
      } else {
        window.Toast && window.Toast.show('AI không trả về nội dung. Kiểm tra GEMINI_API_KEY.', 'warning');
      }
    } catch (e) {
      window.Toast && window.Toast.show('Lỗi AI: ' + e.message, 'error');
    }
    loading.style.display = 'none';
  });

  // ── Template Variables ──
  const tplVars = document.getElementById('tpl-vars');
  document.getElementById('btn-tpl-toggle').addEventListener('click', () => {
    const isHidden = tplVars.style.display === 'none' || !tplVars.style.display;
    tplVars.style.display = isHidden ? 'flex' : 'none';
    const chevron = document.getElementById('tpl-chevron');
    if (chevron) chevron.style.transform = isHidden ? 'rotate(90deg)' : '';
  });
  document.querySelectorAll('.btn-var').forEach(btn => {
    btn.addEventListener('click', () => insertAtCursor(btn.dataset.var));
  });

  // ── Spinner Preview ──
  document.getElementById('btn-spin').addEventListener('click', () => {
    const source = textarea.value;
    const preview = document.getElementById('editor-preview');
    if (!source.trim()) { 
      preview.innerHTML = '<div style="color:var(--text-muted); font-size:13px; font-style:italic; text-align:center; padding:20px;">Chưa có nội dung.</div>'; 
      return; 
    }
    const colors = ['#3B82F6', '#8B5CF6', '#10B981'];
    let html = '';
    for (let i = 0; i < 3; i++) {
      let parsed = source, safety = 0;
      while (parsed.includes('{') && parsed.includes('}') && safety++ < 50) {
        const s = parsed.indexOf('{'), e = parsed.indexOf('}', s);
        if (e <= s) break;
        const parts = parsed.substring(s + 1, e).split('|');
        parsed = parsed.substring(0, s) + parts[Math.floor(Math.random() * parts.length)] + parsed.substring(e + 1);
      }
      html += `<div style="background:var(--bg); padding:14px 16px; border-radius:12px; border-left:4px solid ${colors[i]}; font-size:13px; white-space:pre-wrap; line-height:1.6;">
        <div style="font-weight:700; font-size:10px; color:${colors[i]}; text-transform:uppercase; margin-bottom:6px; letter-spacing:0.5px;">Biến thể ${i + 1}</div>
        ${parsed}
      </div>`;
    }
    preview.innerHTML = html;
  });

  // ── Image Upload ──
  const imageInput = document.getElementById('editor-image-input');
  imageInput.addEventListener('change', handleImageUpload);

  function handleImageUpload(e) {
    const files = Array.from(e.target.files);
    const grid = document.getElementById('image-preview-grid');
    const previewImages = document.getElementById('live-preview-images');
    
    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        _uploadedImages.push({ file, dataUrl: ev.target.result });
        
        // Grid preview
        const thumb = document.createElement('div');
        thumb.style.cssText = 'position:relative; width:80px; height:80px; border-radius:10px; overflow:hidden; border:1px solid var(--border);';
        thumb.innerHTML = `
          <img src="${ev.target.result}" style="width:100%; height:100%; object-fit:cover;">
          <button class="remove-img-btn" style="position:absolute; top:2px; right:2px; width:20px; height:20px; border-radius:50%; background:rgba(0,0,0,0.6); color:#fff; border:none; font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
        `;
        thumb.querySelector('.remove-img-btn').addEventListener('click', () => {
          const idx = _uploadedImages.findIndex(img => img.dataUrl === ev.target.result);
          if (idx >= 0) _uploadedImages.splice(idx, 1);
          thumb.remove();
          updatePreviewImages();
        });
        grid.appendChild(thumb);
        updatePreviewImages();
      };
      reader.readAsDataURL(file);
    });
  }

  function updatePreviewImages() {
    const container = document.getElementById('live-preview-images');
    if (_uploadedImages.length > 0) {
      container.style.display = 'block';
      container.innerHTML = `<div style="display:grid; grid-template-columns:${_uploadedImages.length === 1 ? '1fr' : '1fr 1fr'}; gap:2px;">
        ${_uploadedImages.slice(0, 4).map(img => `<img src="${img.dataUrl}" style="width:100%; height:120px; object-fit:cover;">`).join('')}
      </div>`;
    } else {
      container.style.display = 'none';
    }
  }

  // ── Schedule Type Toggle ──
  document.querySelectorAll('.schedule-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.schedule-type-btn').forEach(b => {
        b.style.borderColor = 'var(--border)';
        b.style.background = 'transparent';
        b.style.color = 'var(--text-muted)';
      });
      btn.style.borderColor = 'var(--color-primary)';
      btn.style.background = 'rgba(59,130,246,0.08)';
      btn.style.color = 'var(--color-primary)';
      const datetimeContainer = document.getElementById('schedule-datetime-container');
      datetimeContainer.style.display = btn.dataset.type === 'schedule' ? 'block' : 'none';
    });
  });

  // ── Post / Schedule ──
  document.getElementById('btn-schedule').addEventListener('click', async () => {
    const acc = document.getElementById('post-acc').value;
    const t = document.getElementById('post-target').value;
    const content = textarea.value;

    if (!acc || !t) { window.Toast && window.Toast.show('Vui lòng chọn Account và Target', 'warning'); return; }
    if (!content.trim()) { window.Toast && window.Toast.show('Vui lòng nhập nội dung bài viết', 'warning'); return; }

    const isSchedule = document.querySelector('.schedule-type-btn[data-type="schedule"]')?.style.borderColor?.includes('primary');
    const scheduledAt = isSchedule ? document.getElementById('schedule-datetime')?.value : null;

    try {
      const tName = document.getElementById('post-target').options[document.getElementById('post-target').selectedIndex].text;
      
      if (isSchedule && scheduledAt) {
        await Queue.add({
          accountId: acc,
          target: { type: 'page', id: t, name: tName },
          content: content,
          images: _uploadedImages.map(img => img.dataUrl),
          scheduledAt: new Date(scheduledAt).toISOString()
        });
        window.Toast && window.Toast.show(`📅 Đã hẹn đăng lúc ${new Date(scheduledAt).toLocaleString('vi-VN')}!`, 'success');
      } else {
        // Post immediately via Pages API
        try {
          await api.post('/pages/post', {
            accountId: acc,
            pageId: t,
            content: content,
            images: _uploadedImages.map(img => img.dataUrl),
            postNow: true
          });
          window.Toast && window.Toast.show('🚀 Đã đăng bài thành công!', 'success');
        } catch (e) {
          // Fallback: queue it with near-immediate time
          await Queue.add({
            accountId: acc,
            target: { type: 'page', id: t, name: tName },
            content: content,
            images: _uploadedImages.map(img => img.dataUrl),
            scheduledAt: new Date(Date.now() + 5000).toISOString()
          });
          window.Toast && window.Toast.show('📤 Bài viết đã được thêm vào hàng đợi đăng!', 'success');
        }
      }
      textarea.value = '';
      _uploadedImages = [];
      document.getElementById('image-preview-grid').innerHTML = '';
      document.getElementById('live-preview-images').style.display = 'none';
      updateStats();
    } catch (e) {
      window.Toast && window.Toast.show('Lỗi: ' + e.message, 'error');
    }
  });

  // ── Preview Button ──
  document.getElementById('btn-preview-post').addEventListener('click', () => {
    const previewSection = container.querySelector('#live-preview-text');
    if (previewSection) previewSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.Toast && window.Toast.show('👁 Xem Live Preview ở bên phải', 'info');
  });

  // ── Helpers ──
  function wrapSelection(before, after) {
    const ta = textarea;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const selected = ta.value.substring(s, e);
    ta.value = ta.value.substring(0, s) + before + selected + after + ta.value.substring(e);
    ta.selectionStart = s + before.length;
    ta.selectionEnd = e + before.length;
    ta.focus();
    ta.dispatchEvent(new Event('input'));
  }

  function insertAtCursor(text) {
    const ta = textarea;
    const s = ta.selectionStart;
    ta.value = ta.value.substring(0, s) + text + ta.value.substring(ta.selectionEnd);
    ta.selectionStart = ta.selectionEnd = s + text.length;
    ta.focus();
    ta.dispatchEvent(new Event('input'));
  }

  // ── Load Targets ──
  loadTargets();
}

async function loadTargets() {
  const accSelect = document.getElementById('post-acc');
  const targetSelect = document.getElementById('post-target');
  const previewName = document.getElementById('preview-page-name');
  const previewAvatar = document.getElementById('preview-avatar');

  try {
    const [accRes, pagesRes] = await Promise.all([
      Accounts.list().catch(() => ({ data: [] })),
      Pages.list().catch(() => ({ data: [] }))
    ]);

    const accounts = accRes.data || [];
    const pages = pagesRes.data || [];

    accSelect.innerHTML = accounts.length > 0
      ? accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('')
      : '<option value="">Chưa kết nối Account</option>';

    targetSelect.innerHTML = pages.length > 0
      ? pages.map(p => `<option value="${p.id}">${p.name}</option>`).join('')
      : '<option value="">Chưa có Page nào</option>';

    // Update preview with first page name
    if (pages.length > 0) {
      previewName.textContent = pages[0].name;
      previewAvatar.textContent = pages[0].name.charAt(0).toUpperCase();
    }

    targetSelect.addEventListener('change', () => {
      const selectedPage = pages.find(p => p.id === targetSelect.value);
      if (selectedPage) {
        previewName.textContent = selectedPage.name;
        previewAvatar.textContent = selectedPage.name.charAt(0).toUpperCase();
      }
    });

  } catch (e) {
    console.error('[Editor] Error loading targets:', e);
    accSelect.innerHTML = '<option value="">Lỗi tải dữ liệu</option>';
    targetSelect.innerHTML = '<option value="">Lỗi tải dữ liệu</option>';
  }
}
