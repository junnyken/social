/**
 * Shared component for selecting a specific connected Facebook Page
 * to filter dashboards and analytics.
 */

export async function fetchConnectedPages() {
  try {
    const res = await fetch('/api/v1/pages');
    const data = await res.json();
    if (data.success) {
      return data.data || [];
    }
    return [];
  } catch (e) {
    console.error('Failed to fetch pages for selector:', e);
    return [];
  }
}

export function getSelectedPageId() {
  return sessionStorage.getItem('active_page_id') || 'all';
}

export function setSelectedPageId(id) {
  sessionStorage.setItem('active_page_id', id || 'all');
}

/**
 * Renders the Page selector dropdown in a container.
 * @param {HTMLElement} container - The DOM element to append the selector to
 * @param {Function} onChange - Callback when selected page changes, passes (pageId)
 * @param {Object} options - Customization options
 */
export async function renderPageSelector(container, onChange, options = {}) {
  const pages = await fetchConnectedPages();
  const currentId = getSelectedPageId();

  // If no pages, hide the selector to avoid confusion
  if (!pages || pages.length === 0) {
    container.innerHTML = '';
    return;
  }

  const dropdownHTML = `
    <div style="display:flex; align-items:center; gap:8px;">
      <i data-lucide="filter" width="16" height="16" style="color:var(--color-text-muted)"></i>
      <select class="field-select page-filter-dropdown" style="min-width:200px; min-height:36px; ${options.style || ''}">
        <option value="all">🌐 Tất cả Pages</option>
        ${pages.map(p => `<option value="${p.id}" ${currentId === p.id ? 'selected' : ''}>📄 ${p.name || p.id}</option>`).join('')}
      </select>
    </div>
  `;

  container.innerHTML = dropdownHTML;

  if (window.lucide && window.lucide.createIcons) {
    window.lucide.createIcons({ nameAttr: 'data-lucide' });
  }

  const selectEl = container.querySelector('.page-filter-dropdown');
  selectEl.addEventListener('change', (e) => {
    const newId = e.target.value;
    setSelectedPageId(newId);
    if (onChange) {
      onChange(newId);
    }
  });
}
