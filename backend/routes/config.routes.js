const express = require('express');
const router = express.Router();
const config = require('../config');
const dataService = require('../services/data.service');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

// Get currently active configuration
router.get('/', async (req, res) => {
    let customSettings = await dataService.read('settings');
    if (Array.isArray(customSettings)) customSettings = {}; // Fallback if data service auto-makes []

    // Merge base config (config.js) with custom overrides (settings.json)
    const activeConfig = {
        scheduler: { ...config.scheduler, ...customSettings.scheduler },
        delay: { ...config.delay, ...customSettings.delay },
        rateLimits: { ...config.rateLimits, ...customSettings.rateLimits },
        blacklist: customSettings.blacklist || []
    };
    
    res.json({ success: true, data: activeConfig });
});

// Update dynamic configuration
router.post('/update', async (req, res) => {
    try {
        const { scheduler, delay, rateLimits, blacklist } = req.body;
        
        let customSettings = await dataService.read('settings');
        if (Array.isArray(customSettings)) customSettings = {};

        // Patch payload safely
        if (scheduler) customSettings.scheduler = scheduler;
        if (delay) customSettings.delay = delay;
        if (rateLimits) customSettings.rateLimits = rateLimits;
        if (blacklist !== undefined) customSettings.blacklist = blacklist;

        await dataService.write('settings', customSettings);
        
        res.json({ success: true, message: 'Configuration saved successfully', data: customSettings });
    } catch (e) {
        console.error('[Config Update Error]', e.message);
        res.status(500).json({ success: false, message: 'Failed to update settings' });
    }
});

module.exports = router;
