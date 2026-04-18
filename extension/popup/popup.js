document.addEventListener('DOMContentLoaded', () => {
    const statusDot = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const toggleBtn = document.getElementById('toggle-bot');
    const dashBtn = document.getElementById('open-dashboard');

    let isRunning = false;

    // Ping backend to check status
    async function checkBackend() {
        try {
            const res = await fetch('http://localhost:3000/api/v1/config');
            if (res.ok) {
                statusDot.className = 'status-dot online';
                statusText.innerText = 'Connected';
                
                // Fetch accounts
                try {
                    const accRes = await fetch('http://localhost:3000/api/v1/accounts');
                    if (accRes.ok) {
                        const { data } = await accRes.json();
                        const active = data.find(a => a.status === 'connected');
                        document.getElementById('account-name').innerText = active ? active.name : '0 Connected';
                    }
                } catch(e) {}
                
            } else {
                statusDot.className = 'status-dot offline';
                statusText.innerText = 'Backend Request Failed';
            }
        } catch {
            statusDot.className = 'status-dot offline';
            statusText.innerText = 'Cannot Reach Localhost';
        }
    }

    checkBackend();
    setInterval(checkBackend, 5000);

    const addGroupBtn = document.getElementById('add-group-btn');
    if (addGroupBtn) {
        addGroupBtn.addEventListener('click', async () => {
            // Get active tab url
            chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
                const url = tabs[0].url;
                if (!url.includes('facebook.com/groups/')) {
                    alert('Bạn phải đang mở trang Facebook Group!');
                    return;
                }
                try {
                    const groupName = tabs[0].title.replace(/\s*\|.*/g, ''); // rough cleanup
                    let groupId = url.match(/groups\/([^/?]+)/)?.[1] || '';
                    await fetch('http://localhost:3000/api/v1/config/update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ /* dummy config field */ blacklist: [] })
                    });
                    // For mockup, backend config update is stubbed here
                    statusText.innerText = 'Đã quét Group ID: ' + groupId;
                    setTimeout(checkBackend, 2000);
                } catch(e) {}
            });
        });
    }

    toggleBtn.addEventListener('click', async () => {
        isRunning = !isRunning;
        toggleBtn.innerText = isRunning ? '⏸ Pause' : '▶ Resume';
        try {
            await fetch('http://localhost:3000/api/v1/queue/resume', { method: 'POST' });
        } catch(e){}
    });

    dashBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'http://localhost:3000' });
    });
});
