// Skeleton loader templates (dùng CSS .skeleton từ Phase 1)
export function getCardSkeleton(count = 4) {
  return Array(count).fill(0).map(() => `
    <div class="card" style="display:flex;flex-direction:column;gap:var(--space-2)">
      <div class="skeleton skeleton-heading" style="width:40%;height:20px;background:var(--color-surface-hover);border-radius:var(--radius-sm)"></div>
      <div class="skeleton skeleton-text" style="width:100%;height:14px;background:var(--color-surface-hover);border-radius:var(--radius-sm);margin-top:var(--space-2)"></div>
      <div class="skeleton skeleton-text" style="width:80%;height:14px;background:var(--color-surface-hover);border-radius:var(--radius-sm)"></div>
    </div>
  `).join('');
}

export function getTableSkeleton(rows = 5) {
  return `
    <table class="tbl">
      ${Array(rows).fill(0).map(() => `
        <tr>
          ${Array(5).fill(0).map(() => `
            <td><div class="skeleton skeleton-text" style="height:14px;background:var(--color-surface-hover);border-radius:var(--radius-sm)"></div></td>
          `).join('')}
        </tr>
      `).join('')}
    </table>
  `;
}

// Error state
export function renderErrorState(container, message) {
  container.innerHTML = `
    <div class="empty-state" style="text-align:center;padding:var(--space-8);color:var(--color-text-muted)">
      <i data-lucide="wifi-off" width="48" height="48" style="margin-bottom:var(--space-4);opacity:0.6"></i>
      <h3 style="margin-bottom:var(--space-2);color:var(--color-text)">Không thể kết nối Backend</h3>
      <p style="margin-bottom:var(--space-4)">${message || 'Network error'}</p>
      <button class="btn btn-primary" onclick="window.location.reload()">
        Thử lại
      </button>
      <div style="margin-top:var(--space-3);font-size:var(--text-xs);color:var(--color-error)">
        Đảm bảo backend đang chạy tại social-9cpy.onrender.com
      </div>
    </div>
  `;
  if(window.refreshIcons) window.refreshIcons();
}
