// ============================================================
// Error Boundary — Global error handler for frontend
// ============================================================

let errorOverlay = null;

export function initErrorBoundary() {
    // Catch uncaught JS errors
    window.addEventListener('error', (event) => {
        console.error('[ErrorBoundary] Uncaught error:', event.error);
        showErrorToast(`Lỗi: ${event.message || 'Unknown error'}`, 'error');
        event.preventDefault(); // Prevent default browser error display
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.error('[ErrorBoundary] Unhandled rejection:', event.reason);
        const message = event.reason?.message || String(event.reason || 'Promise rejected');
        
        // Don't show toast for common network errors (handled by socket/api)
        if (!message.includes('Failed to fetch') && !message.includes('NetworkError')) {
            showErrorToast(`Lỗi: ${message}`, 'warning');
        }
        event.preventDefault();
    });

    console.log('[ErrorBoundary] Initialized');
}

export function showErrorToast(message, type = 'error') {
    const colors = {
        error: { bg: '#ef4444', border: '#dc2626', icon: '❌' },
        warning: { bg: '#f59e0b', border: '#d97706', icon: '⚠️' },
        info: { bg: '#3b82f6', border: '#2563eb', icon: 'ℹ️' },
        success: { bg: '#10b981', border: '#059669', icon: '✅' }
    };
    const c = colors[type] || colors.error;

    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; z-index: 99999;
        background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(12px);
        border: 1px solid rgba(255,255,255,0.1);
        border-left: 4px solid ${c.border};
        padding: 14px 18px; border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.35);
        max-width: 400px; font-family: 'Inter', sans-serif;
        animation: slide-in-up 0.3s ease;
        cursor: pointer;
    `;
    toast.innerHTML = `
        <div style="display:flex;gap:10px;align-items:flex-start;">
            <span style="font-size:18px;">${c.icon}</span>
            <div style="flex:1;">
                <div style="font-size:13px;color:#f1f5f9;line-height:1.4;">${message}</div>
            </div>
            <span style="color:#64748b;font-size:18px;cursor:pointer;" onclick="this.parentElement.parentElement.remove()">×</span>
        </div>
    `;
    toast.addEventListener('click', () => toast.remove());
    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'slide-out-down 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
}

// Add animations
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slide-in-up {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slide-out-down {
            from { transform: translateY(0); opacity: 1; }
            to { transform: translateY(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}
