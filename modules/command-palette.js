/**
 * Command Palette (Ctrl+K / Cmd+K)
 * Quick navigation and search across all app features
 */

const CMD_ITEMS = [
    // Navigation
    { group: 'Trang', label: '📊 Dashboard', action: () => navigateTo('dashboard'), icon: '📊' },
    { group: 'Trang', label: '✍️ Composer', action: () => navigateTo('composer'), icon: '✍️' },
    { group: 'Trang', label: '📈 Analytics', action: () => navigateTo('analytics'), icon: '📈' },
    { group: 'Trang', label: '📥 Inbox', action: () => navigateTo('inbox'), icon: '📥' },
    { group: 'Trang', label: '📅 Calendar', action: () => navigateTo('calendar'), icon: '📅' },
    { group: 'Trang', label: '🤖 AI Studio', action: () => navigateTo('ai'), icon: '🤖' },
    { group: 'Trang', label: '👥 Team', action: () => navigateTo('team'), icon: '👥' },
    { group: 'Trang', label: '🏢 Agency', action: () => navigateTo('agency'), icon: '🏢' },
    { group: 'Trang', label: '📚 Library', action: () => navigateTo('library'), icon: '📚' },
    { group: 'Trang', label: '🔄 Workflow', action: () => navigateTo('workflow'), icon: '🔄' },
    { group: 'Trang', label: '👂 Listening', action: () => navigateTo('listening'), icon: '👂' },
    { group: 'Trang', label: '⚙️ Settings', action: () => navigateTo('settings'), icon: '⚙️' },
    { group: 'Trang', label: '📋 Scheduler', action: () => navigateTo('scheduler'), icon: '📋' },

    // Actions
    { group: 'Hành động', label: '📝 Tạo bài mới', action: () => { navigateTo('composer'); }, icon: '📝', shortcut: 'N' },
    { group: 'Hành động', label: '🌙 Đổi Dark/Light', action: () => toggleTheme(), icon: '🌙', shortcut: 'D' },
    { group: 'Hành động', label: '🔔 Xem thông báo', action: () => toggleNotifications(), icon: '🔔' },
    { group: 'Hành động', label: '🔗 Kết nối LinkedIn', action: () => { window.location.href = '/api/v1/auth/linkedin'; }, icon: '🔗' },

    // AI Tools
    { group: 'AI Tools', label: '🎯 AI Predict Score', action: () => { navigateTo('ai'); selectAITab(0); }, icon: '🎯' },
    { group: 'AI Tools', label: '♻️ AI Repurpose', action: () => { navigateTo('ai'); selectAITab(1); }, icon: '♻️' },
    { group: 'AI Tools', label: '#️⃣ AI Hashtags', action: () => { navigateTo('ai'); selectAITab(2); }, icon: '#️⃣' },
    { group: 'AI Tools', label: '⏰ AI Best Time', action: () => { navigateTo('ai'); selectAITab(3); }, icon: '⏰' },
    { group: 'AI Tools', label: '💬 AI Auto-Reply', action: () => { navigateTo('ai'); selectAITab(4); }, icon: '💬' },
];

let paletteOpen = false;
let activeIndex = 0;

function navigateTo(page) {
    const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navItem) navItem.click();
}

function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    html.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
    localStorage.setItem('theme', current === 'dark' ? 'light' : 'dark');
}

function toggleNotifications() {
    const btn = document.querySelector('#notification-bell') || document.querySelector('.notif-bell-wrap button');
    if (btn) btn.click();
}

function selectAITab(idx) {
    setTimeout(() => {
        const tabs = document.querySelectorAll('.ait-tab');
        if (tabs[idx]) tabs[idx].click();
    }, 300);
}

function openPalette() {
    if (paletteOpen) return;
    paletteOpen = true;
    activeIndex = 0;

    const overlay = document.createElement('div');
    overlay.className = 'cmd-palette-overlay';
    overlay.id = 'cmd-palette-overlay';
    overlay.innerHTML = `
    <div class="cmd-palette">
        <div class="cmd-input-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input class="cmd-input" id="cmd-input" placeholder="Tìm kiếm trang, công cụ, hành động..." autofocus />
            <span class="cmd-kbd">ESC</span>
        </div>
        <div class="cmd-results" id="cmd-results"></div>
        <div class="cmd-footer">
            <span>↑↓ Di chuyển</span>
            <span>↵ Chọn</span>
            <span>ESC Đóng</span>
        </div>
    </div>`;

    document.body.appendChild(overlay);
    renderResults('');

    const input = overlay.querySelector('#cmd-input');
    input.focus();
    input.addEventListener('input', (e) => {
        activeIndex = 0;
        renderResults(e.target.value);
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closePalette();
    });

    input.addEventListener('keydown', handlePaletteKeydown);
}

function closePalette() {
    const overlay = document.getElementById('cmd-palette-overlay');
    if (!overlay) return;
    overlay.classList.add('hiding');
    setTimeout(() => { overlay.remove(); paletteOpen = false; }, 150);
}

function renderResults(query) {
    const container = document.getElementById('cmd-results');
    if (!container) return;

    const q = query.toLowerCase().trim();
    const filtered = q ? CMD_ITEMS.filter(item =>
        item.label.toLowerCase().includes(q) || item.group.toLowerCase().includes(q)
    ) : CMD_ITEMS;

    // Group items
    const groups = {};
    filtered.forEach(item => {
        if (!groups[item.group]) groups[item.group] = [];
        groups[item.group].push(item);
    });

    let html = '';
    let idx = 0;
    for (const [group, items] of Object.entries(groups)) {
        html += `<div class="cmd-group-label">${group}</div>`;
        items.forEach(item => {
            html += `<div class="cmd-item ${idx === activeIndex ? 'active' : ''}" data-cmd-idx="${idx}">
                <span class="cmd-item-icon">${item.icon}</span>
                <span class="cmd-item-label">${item.label}</span>
                ${item.shortcut ? `<span class="cmd-item-shortcut">${item.shortcut}</span>` : ''}
            </div>`;
            idx++;
        });
    }

    if (filtered.length === 0) {
        html = `<div style="padding:24px; text-align:center; color:var(--color-text-muted); font-size:14px;">Không tìm thấy kết quả cho "${query}"</div>`;
    }

    container.innerHTML = html;

    // Bind click
    container.querySelectorAll('.cmd-item').forEach(el => {
        el.addEventListener('click', () => {
            const i = parseInt(el.dataset.cmdIdx);
            const q2 = document.getElementById('cmd-input')?.value?.toLowerCase().trim() || '';
            const filteredItems = q2 ? CMD_ITEMS.filter(it => it.label.toLowerCase().includes(q2) || it.group.toLowerCase().includes(q2)) : CMD_ITEMS;
            if (filteredItems[i]) {
                closePalette();
                filteredItems[i].action();
            }
        });
    });
}

function handlePaletteKeydown(e) {
    const q = e.target.value.toLowerCase().trim();
    const filtered = q ? CMD_ITEMS.filter(it => it.label.toLowerCase().includes(q) || it.group.toLowerCase().includes(q)) : CMD_ITEMS;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, filtered.length - 1);
        renderResults(e.target.value);
        scrollActiveIntoView();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        renderResults(e.target.value);
        scrollActiveIntoView();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[activeIndex]) {
            closePalette();
            filtered[activeIndex].action();
        }
    } else if (e.key === 'Escape') {
        closePalette();
    }
}

function scrollActiveIntoView() {
    const active = document.querySelector('.cmd-item.active');
    if (active) active.scrollIntoView({ block: 'nearest' });
}

// Global keyboard shortcut
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (paletteOpen) closePalette();
        else openPalette();
    }
    if (e.key === 'Escape' && paletteOpen) {
        closePalette();
    }
});

// Export for external use
window.CommandPalette = { open: openPalette, close: closePalette };
