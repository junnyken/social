/**
 * Main Content Script Orchestrator
 */
console.log('[FB AutoPoster] Content Script Injected');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'PING') {
        sendResponse({ status: 'ALIVE' });
    }
    
    if (request.action === 'POST_TO_GROUP') {
        const { job } = request;
        console.log('[FB AutoPoster] Received POST instruction for:', job);
        
        // Execute posting logic
        window.GroupPoster.execute(job)
            .then(res => sendResponse(res))
            .catch(err => sendResponse({ success: false, error: err.message }));
            
        return true; // Keep message channel open for async response
    }
});
