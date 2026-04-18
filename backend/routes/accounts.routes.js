const express = require('express');
const router = express.Router();
const dataService = require('../services/data.service');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

// Get all accounts
router.get('/', async (req, res) => {
    const accs = await dataService.getAll('accounts');
    
    // Sanitize output (DO NOT expose encrypted tokens to frontend)
    const sanitizedAccs = accs.map(acc => {
        const copy = { ...acc };
        delete copy.token;
        return copy;
    });

    res.json({ success: true, data: sanitizedAccs });
});

// Add account
router.post('/', async (req, res) => {
    const newAcc = await dataService.create('accounts', req.body);
    res.json({ success: true, data: newAcc });
});

// Delete account
router.delete('/:id', async (req, res) => {
    await dataService.remove('accounts', req.params.id);
    res.json({ success: true, message: 'Account removed' });
});

module.exports = router;
