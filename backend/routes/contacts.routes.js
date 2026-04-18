const express = require('express');
const router = express.Router();
const contactService = require('../services/contact.service');

// Get all contacts
router.get('/', async (req, res) => {
    try {
        const filters = {
            search: req.query.search,
            tags: req.query.tags
        };
        const contacts = await contactService.getAll(filters);
        res.json({ success: true, data: contacts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get single contact
router.get('/:id', async (req, res) => {
    try {
        const contact = await contactService.getById(req.params.id);
        if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });
        res.json({ success: true, data: contact });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update contact
router.patch('/:id', async (req, res) => {
    try {
        const contact = await contactService.update(req.params.id, req.body);
        if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });
        res.json({ success: true, data: contact });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get contact history
router.get('/:id/history', async (req, res) => {
    try {
        const history = await contactService.getContactHistory(req.params.id);
        res.json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
