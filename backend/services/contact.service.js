const dataService = require('./data.service');

class ContactService {
    async findOrCreate(platformUserId, platform, initialData) {
        const contacts = await dataService.read('contacts');
        let contact = contacts.find(c => c.platforms[platform]?.userId === platformUserId);
        
        if (!contact) {
            contact = {
                id: `cnt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                platforms: {
                    [platform]: { userId: platformUserId, name: initialData.name, avatar: initialData.avatar }
                },
                displayName: initialData.name || 'Unknown',
                avatar: initialData.avatar || null,
                email: null,
                phone: null,
                tags: [],
                notes: '',
                firstSeen: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                totalMessages: 1,
                sentiment: 'neutral',
                customFields: {},
                assignedTo: null
            };
            await dataService.create('contacts', contact);
        } else {
            // Update last seen
            contact.lastSeen = new Date().toISOString();
            contact.totalMessages = (contact.totalMessages || 0) + 1;
            await dataService.update('contacts', contact.id, { lastSeen: contact.lastSeen, totalMessages: contact.totalMessages });
        }
        
        return contact;
    }

    async getById(contactId) {
        return await dataService.getById('contacts', contactId);
    }

    async getAll(filters = {}) {
        let contacts = await dataService.getAll('contacts');
        if (filters.search) {
            const q = filters.search.toLowerCase();
            contacts = contacts.filter(c => c.displayName.toLowerCase().includes(q) || c.notes.toLowerCase().includes(q));
        }
        if (filters.tags) {
            const tagArray = filters.tags.split(',');
            contacts = contacts.filter(c => tagArray.some(t => c.tags.includes(t)));
        }
        return contacts;
    }

    async update(contactId, data) {
        return await dataService.update('contacts', contactId, data);
    }

    async getContactHistory(contactId) {
        const inboxData = await dataService.read('inbox_messages');
        const contact = await this.getById(contactId);
        if (!contact) return [];

        const fbUserId = contact.platforms?.facebook?.userId;
        if (!fbUserId) return [];

        const history = inboxData.filter(m => m.fromId === fbUserId || m.contactId === contactId);
        return history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }
}

module.exports = new ContactService();
