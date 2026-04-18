// ============================================================
// Contact CRM Panel - UI for Right sidebar in Inbox
// ============================================================

export function renderContactPanel(contact, container) {
  if (!contact) {
    container.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted);">
      <div style="font-size: 32px; margin-bottom: 12px;">👤</div>
      Chọn một tin nhắn để xem thông tin khách hàng
    </div>`;
    return;
  }

  const avatar = contact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.displayName)}&background=random`;
  
  const tagsHtml = (contact.tags || []).map(tag => `
    <span style="background: rgba(16, 185, 129, 0.1); color: var(--success); padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-right: 4px; display: inline-block; margin-bottom: 4px;">
      ${tag}
    </span>
  `).join('');

  container.innerHTML = `
    <div style="padding: 20px; border-bottom: 1px solid var(--border);">
      <div style="text-align: center;">
        <img src="${avatar}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 12px; border: 2px solid var(--border);">
        <h3 style="margin: 0 0 4px 0; font-size: 18px; color: var(--text);">${contact.displayName}</h3>
        <p style="margin: 0 0 12px 0; font-size: 14px; color: var(--text-muted);">
          Từ: ${Object.keys(contact.platforms || {}).join(', ')}
        </p>
        <div style="margin-bottom: 16px;">
          ${tagsHtml}
          <button id="add-tag-btn" style="background: var(--bg); border: 1px dashed var(--border); border-radius: 12px; padding: 2px 8px; font-size: 12px; cursor: pointer; color: var(--text-muted);">+ Thêm</button>
        </div>
      </div>
      
      <div style="background: var(--bg); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
        <h4 style="margin: 0 0 12px 0; font-size: 14px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Ghi chú</h4>
        <textarea id="contact-notes" style="width: 100%; min-height: 80px; background: transparent; border: 1px solid var(--border); border-radius: 8px; padding: 8px; color: var(--text); font-family: inherit; font-size: 14px; resize: vertical;">${contact.notes || ''}</textarea>
        <div style="text-align: right; margin-top: 8px;">
          <button id="save-notes-btn" class="btn btn-primary" style="padding: 4px 12px; font-size: 12px;">Lưu</button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div style="background: var(--bg); padding: 12px; border-radius: 12px; text-align: center;">
          <div style="font-size: 20px; font-weight: 600; color: var(--text);">${contact.totalMessages || 0}</div>
          <div style="font-size: 12px; color: var(--text-muted);">Tin nhắn</div>
        </div>
        <div style="background: var(--bg); padding: 12px; border-radius: 12px; text-align: center;">
          <div style="font-size: 20px; font-weight: 600; color: ${getSentimentColor(contact.sentiment)};">${getSentimentEmoji(contact.sentiment)}</div>
          <div style="font-size: 12px; color: var(--text-muted);">Tâm trạng</div>
        </div>
      </div>
    </div>
  `;

  // Bind events
  const notesEl = container.querySelector('#contact-notes');
  const saveBtn = container.querySelector('#save-notes-btn');
  const addTagBtn = container.querySelector('#add-tag-btn');

  saveBtn.addEventListener('click', async () => {
    saveBtn.textContent = '...';
    try {
      await fetch(`/api/v1/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesEl.value })
      });
      saveBtn.textContent = 'Đã lưu';
      setTimeout(() => saveBtn.textContent = 'Lưu', 2000);
    } catch(e) {
      saveBtn.textContent = 'Lỗi';
    }
  });

  addTagBtn.addEventListener('click', async () => {
    const newTag = prompt('Nhập tag mới (ví dụ: VIP, Hỏi giá):');
    if (newTag && newTag.trim()) {
      try {
        const tags = [...(contact.tags || []), newTag.trim()];
        const res = await fetch(`/api/v1/contacts/${contact.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags })
        });
        const data = await res.json();
        if (data.success) {
          contact.tags = tags;
          renderContactPanel(contact, container); // re-render
        }
      } catch(e) {
        alert('Lỗi thêm tag');
      }
    }
  });
}

function getSentimentColor(sentiment) {
  if (sentiment === 'positive') return 'var(--success)';
  if (sentiment === 'negative') return 'var(--danger)';
  return 'var(--warning)';
}

function getSentimentEmoji(sentiment) {
  if (sentiment === 'positive') return '😊';
  if (sentiment === 'negative') return '😤';
  return '😐';
}
