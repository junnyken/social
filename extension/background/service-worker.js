chrome.runtime.onInstalled.addListener(() => {
    console.log('[ServiceWorker] FB AutoPoster Extension Installed.');
    chrome.alarms.create('poll-backend', { periodInMinutes: 0.5 }); // 30s
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'poll-backend') {
        await pollForTasks();
    }
});

async function pollForTasks() {
    try {
        // Fetch pending group task
        const response = await fetch('http://localhost:3000/api/v1/queue');
        if (!response.ok) return;
        const { data } = await response.json();
        
        // Find exactly one pending task for groups
        const task = data.find(t => t.status === 'pending');
        
        if (task) {
            console.log('[ServiceWorker] Found pending task:', task);
            
            // Tìm tab đang mở đúng group
            const tabs = await chrome.tabs.query({ url: `https://www.facebook.com/groups/*` });
            
            if (tabs.length > 0) {
                // Send message to the tab to execute post
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'EXECUTE_POST',
                    job: task
                });
            } else {
                // Không có tab phù hợp, thông báo user cần mở tab nhóm
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: '../icon.png', // Assuming icon exists
                    title: 'FB AutoPoster',
                    message: `Vui lòng mở trang Facebook Group để đăng bài: "${task.content.substring(0,20)}..."`
                });
            }
        }
    } catch (error) {
        console.error('Poll error:', error);
    }
}
