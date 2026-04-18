// ============================================================
// Presence UI — Online users indicator bar
// ============================================================

import { onSocketEvent } from './socket-client.js';

let onlineUsers = [];
let presenceContainer = null;

export function initPresenceUI(containerSelector = '#presence-bar') {
    presenceContainer = document.querySelector(containerSelector);

    // If container doesn't exist, create it dynamically
    if (!presenceContainer) {
        presenceContainer = document.createElement('div');
        presenceContainer.id = 'presence-bar';
        presenceContainer.style.cssText = `
            position: fixed; bottom: 16px; left: 16px; z-index: 9998;
            display: flex; align-items: center; gap: 6px;
            background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(12px);
            padding: 8px 14px; border-radius: 50px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.25);
            font-family: 'Inter', sans-serif; font-size: 12px; color: #e2e8f0;
            transition: all 0.3s ease;
        `;
        document.body.appendChild(presenceContainer);
    }

    // Listen for presence updates
    onSocketEvent((event) => {
        if (event.type === 'presence') {
            onlineUsers = event.data.users || [];
            renderPresence();
        }
    });

    renderPresence();
}

function renderPresence() {
    if (!presenceContainer) return;

    const count = onlineUsers.length;
    const maxShow = 3;

    let html = `<span style="width:8px;height:8px;border-radius:50%;background:#22c55e;display:inline-block;animation:pulse-dot 2s infinite;"></span>`;

    if (count > 0) {
        html += `<div style="display:flex;margin-left:4px;">`;
        onlineUsers.slice(0, maxShow).forEach((u, i) => {
            const color = getAvatarColor(u.userName || u.userId);
            const letter = (u.userName || u.userId || '?')[0].toUpperCase();
            html += `
                <div title="${u.userName || u.userId}" style="
                    width:26px;height:26px;border-radius:50%;
                    background:${color};
                    display:flex;align-items:center;justify-content:center;
                    color:#fff;font-size:11px;font-weight:700;
                    border:2px solid rgba(15,23,42,0.85);
                    margin-left:${i > 0 ? '-8px' : '0'};
                    position:relative;z-index:${maxShow - i};
                ">${letter}</div>`;
        });
        html += `</div>`;

        if (count > maxShow) {
            html += `<span style="margin-left:4px;color:#94a3b8;">+${count - maxShow}</span>`;
        }

        html += `<span style="margin-left:6px;color:#94a3b8;">${count} online</span>`;
    } else {
        html += `<span style="margin-left:6px;color:#94a3b8;">Offline</span>`;
    }

    presenceContainer.innerHTML = html;
}

function getAvatarColor(name) {
    const colors = ['#8B5CF6', '#EC4899', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#3B82F6'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

// Add pulse animation
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse-dot {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.3); }
        }
    `;
    document.head.appendChild(style);
}
