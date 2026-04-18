// ============================================================
// Notification UI — Bell icon, badge, dropdown panel
// ============================================================

import { onSocketEvent } from './socket-client.js';

let notifications = [];
let unreadCount = 0;
let bellContainer = null;
let panelOpen = false;
let listeners = [];

const TOKEN = () => window.localStorage.getItem('token') || '';

export function initNotificationUI() {
    // Create bell button (fixed position)
    bellContainer = document.createElement('div');
    bellContainer.id = 'notification-bell';
    bellContainer.style.cssText = `
        position: fixed; top: 16px; right: 16px; z-index: 9999;
        font-family: 'Inter', sans-serif;
    `;
    document.body.appendChild(bellContainer);

    // Create notification panel
    const panel = document.createElement('div');
    panel.id = 'notification-panel';
    panel.style.cssText = `
        position: fixed; top: 56px; right: 16px; z-index: 9999;
        width: 380px; max-height: 480px; overflow-y: auto;
        background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(16px);
        border-radius: 16px; box-shadow: 0 8px 40px rgba(0,0,0,0.4);
        display: none; font-family: 'Inter', sans-serif;
        border: 1px solid rgba(255,255,255,0.08);
    `;
    document.body.appendChild(panel);

    // Listen for real-time notifications
    onSocketEvent((event) => {
        if (event.type === 'notification') {
            notifications.unshift(event.data);
            unreadCount++;
            renderBell();
            if (panelOpen) renderPanel();
            showToast(event.data);
        }
    });

    // Fetch initial notifications
    fetchNotifications();

    // Render
    renderBell();
}

async function fetchNotifications() {
    try {
        const res = await fetch('/api/v1/notifications', {
            headers: { 'Authorization': `Bearer ${TOKEN()}` }
        });
        const data = await res.json();
        if (data.success) {
            notifications = data.data || [];
            unreadCount = data.unreadCount || 0;
            renderBell();
        }
    } catch (e) {
        console.error('Fetch notifications error:', e);
    }
}

function renderBell() {
    if (!bellContainer) return;

    bellContainer.innerHTML = `
        <button id="notif-bell-btn" style="
            position: relative; background: rgba(15, 23, 42, 0.85);
            backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1);
            border-radius: 50%; width: 44px; height: 44px;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; font-size: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.25);
            transition: all 0.2s ease;
        ">
            🔔
            ${unreadCount > 0 ? `
                <span style="
                    position: absolute; top: -2px; right: -2px;
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    color: white; font-size: 10px; font-weight: 700;
                    min-width: 18px; height: 18px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    border: 2px solid rgba(15,23,42,0.85);
                    animation: bounce-badge 0.3s ease;
                ">${unreadCount > 9 ? '9+' : unreadCount}</span>
            ` : ''}
        </button>
    `;

    bellContainer.querySelector('#notif-bell-btn').addEventListener('click', togglePanel);
}

function togglePanel() {
    const panel = document.getElementById('notification-panel');
    panelOpen = !panelOpen;
    panel.style.display = panelOpen ? 'block' : 'none';
    if (panelOpen) renderPanel();
}

function renderPanel() {
    const panel = document.getElementById('notification-panel');
    if (!panel) return;

    let html = `
        <div style="
            display:flex;justify-content:space-between;align-items:center;
            padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.08);
        ">
            <span style="font-size:15px;font-weight:700;color:#f1f5f9;">🔔 Thông báo</span>
            <button id="mark-all-read-btn" style="
                background:none;border:none;color:#60a5fa;font-size:12px;
                cursor:pointer;font-weight:600;
            ">✓ Đọc hết</button>
        </div>
    `;

    if (notifications.length === 0) {
        html += `<div style="padding:40px 20px;text-align:center;color:#94a3b8;">
            <div style="font-size:32px;margin-bottom:8px;">🔕</div>
            <div>Chưa có thông báo nào</div>
        </div>`;
    } else {
        notifications.slice(0, 20).forEach(n => {
            const timeAgo = getTimeAgo(n.createdAt);
            const bgColor = n.read ? 'transparent' : 'rgba(59, 130, 246, 0.08)';
            const dotColor = n.read ? 'transparent' : '#3b82f6';

            html += `
                <div class="notif-item" data-id="${n.id}" style="
                    display:flex;gap:12px;padding:12px 20px;
                    background:${bgColor};cursor:pointer;
                    border-bottom:1px solid rgba(255,255,255,0.04);
                    transition: background 0.15s ease;
                " onmouseover="this.style.background='rgba(255,255,255,0.06)'"
                   onmouseout="this.style.background='${bgColor}'">
                    <div style="font-size:22px;flex-shrink:0;margin-top:2px;">${n.icon || '📌'}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:13px;font-weight:600;color:#f1f5f9;margin-bottom:2px;">
                            ${n.title || 'Thông báo'}
                        </div>
                        <div style="font-size:12px;color:#94a3b8;line-height:1.4;
                            overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                            ${n.body || ''}
                        </div>
                        <div style="font-size:11px;color:#64748b;margin-top:4px;">${timeAgo}</div>
                    </div>
                    <div style="
                        width:8px;height:8px;border-radius:50%;
                        background:${dotColor};flex-shrink:0;margin-top:6px;
                    "></div>
                </div>
            `;
        });
    }

    panel.innerHTML = html;

    // Mark all read button
    panel.querySelector('#mark-all-read-btn')?.addEventListener('click', async () => {
        try {
            await fetch('/api/v1/notifications/read-all', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${TOKEN()}`
                }
            });
            notifications.forEach(n => n.read = true);
            unreadCount = 0;
            renderBell();
            renderPanel();
        } catch (e) {}
    });

    // Mark individual as read
    panel.querySelectorAll('.notif-item').forEach(el => {
        el.addEventListener('click', async () => {
            const id = el.dataset.id;
            try {
                await fetch(`/api/v1/notifications/${id}/read`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${TOKEN()}`
                    }
                });
                const n = notifications.find(x => x.id === id);
                if (n && !n.read) {
                    n.read = true;
                    unreadCount = Math.max(0, unreadCount - 1);
                    renderBell();
                    renderPanel();
                }
            } catch (e) {}
        });
    });
}

function showToast(notif) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; top: 70px; right: 20px; z-index: 99999;
        background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(12px);
        border: 1px solid rgba(255,255,255,0.1);
        border-left: 4px solid #3b82f6;
        padding: 14px 18px; border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.35);
        max-width: 340px; font-family: 'Inter', sans-serif;
        animation: slide-in-right 0.3s ease;
    `;
    toast.innerHTML = `
        <div style="display:flex;gap:10px;align-items:flex-start;">
            <span style="font-size:20px;">${notif.icon || '🔔'}</span>
            <div>
                <div style="font-size:13px;font-weight:600;color:#f1f5f9;">${notif.title || 'Thông báo'}</div>
                <div style="font-size:12px;color:#94a3b8;margin-top:2px;">${notif.body || ''}</div>
            </div>
        </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slide-out-right 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function getTimeAgo(dateStr) {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = Math.floor((now - then) / 1000);

    if (diff < 60) return `${diff} giây trước`;
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
}

// Add animations
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slide-in-right {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slide-out-right {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        @keyframes bounce-badge {
            0% { transform: scale(0); }
            50% { transform: scale(1.3); }
            100% { transform: scale(1); }
        }
    `;
    document.head.appendChild(style);
}

export function onNotificationUpdate(fn) { listeners.push(fn); }
