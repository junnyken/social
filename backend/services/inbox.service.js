const fbGraphV2 = require('./fb-graph-v2.service');
const contactService = require('./contact.service');
const fs = require('fs/promises');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'inbox_messages.json');

class InboxService {
    constructor() {
        this.cacheReady = this._initDb();
    }

    async _initDb() {
        try {
            await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
            try {
                await fs.access(DB_PATH);
            } catch {
                await fs.writeFile(DB_PATH, '[]');
            }
        } catch (e) {
            console.error('[InboxService] Init DB Error:', e.message);
        }
    }

    async getSavedMessages() {
        await this.cacheReady;
        try {
            const data = await fs.readFile(DB_PATH, 'utf-8');
            return JSON.parse(data);
        } catch {
            return [];
        }
    }

    async saveMessages(messages) {
        await this.cacheReady;
        await fs.writeFile(DB_PATH, JSON.stringify(messages, null, 2));
    }

    // ── CRUD Messages ──
    async getAllMessages(filters = {}) {
        let saved = await this.getSavedMessages();
        if (filters.platform) saved = saved.filter(m => m.platform === filters.platform);
        if (filters.status === 'unread') saved = saved.filter(m => !m.read);
        if (filters.status === 'done') saved = saved.filter(m => m.status === 'done');
        return saved;
    }

    async getMessageById(id) {
        const saved = await this.getSavedMessages();
        return saved.find(m => m.id === id);
    }

    async updateMessage(id, updates) {
        let saved = await this.getSavedMessages();
        const index = saved.findIndex(m => m.id === id);
        if (index > -1) {
            saved[index] = { ...saved[index], ...updates };
            await this.saveMessages(saved);
            return saved[index];
        }
        return null;
    }

    async getConversationThread(contactId) {
        const saved = await this.getSavedMessages();
        // messages from/to this contact ID
        const thread = saved.filter(m => m.fromId === contactId || (m.toId === contactId && m.contactId === contactId));
        return thread.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    async getInboxStats() {
        const saved = await this.getSavedMessages();
        return {
            total: saved.length,
            unread: saved.filter(m => !m.read).length,
            facebook: saved.filter(m => m.platform === 'facebook').length
        };
    }

    // ── Sync Engine ──
    async syncFacebookComments(pageToken, pageId) {
        try {
            const fbRes = await fbGraphV2.getPagePosts(pageToken, pageId, 10);
            if (!fbRes || !fbRes.posts) return [];

            let allFbComments = [];
            for (const post of fbRes.posts) {
                if (post.comments && post.comments.summary && post.comments.summary.total_count > 0) {
                    const commentsData = await fbGraphV2.getPostComments(pageToken, post.id, 20);
                    for (const c of commentsData) {
                        allFbComments.push({
                            id: `fb_c_${c.id}`,
                            platform: 'facebook',
                            type: 'comment',
                            from: c.from ? c.from.name : 'Unknown',
                            fromId: c.from ? c.from.id : null,
                            authorPicture: c.from?.picture?.data?.url || null,
                            text: c.message,
                            postUrl: post.permalink_url || `https://facebook.com/${post.id}`,
                            timestamp: c.created_time,
                            read: false,
                            status: 'new',
                            parentPost: { id: post.id, content: post.message }
                        });
                    }
                }
            }
            return await this._mergeIncoming(allFbComments);
        } catch (e) {
            console.error('[InboxService] syncFacebookComments error:', e.message);
            throw e;
        }
    }

    async syncMessengerConversations(pageToken, pageId) {
        try {
            const fbRes = await fbGraphV2.getConversations(pageToken, pageId, 20);
            if (!fbRes || !fbRes.data) return [];

            let allDMs = [];
            for (const thread of fbRes.data) {
                const parts = thread.participants?.data || [];
                const customer = parts.find(p => p.id !== pageId);
                
                const messages = thread.messages?.data || [];
                for (const m of messages) {
                    if (!m.message) continue; // skip system messages without text
                    
                    if (m.from && m.from.id !== pageId) {
                        allDMs.push({
                            id: `fb_m_${m.id}`,
                            platform: 'facebook',
                            type: 'dm',
                            from: m.from.name,
                            fromId: m.from.id,
                            authorPicture: null,
                            text: m.message,
                            postUrl: '#',
                            timestamp: m.created_time,
                            read: false,
                            status: 'new',
                        });
                    } else if (m.from && m.from.id === pageId && customer) {
                         allDMs.push({
                            id: `fb_m_${m.id}`,
                            platform: 'facebook',
                            type: 'dm',
                            from: 'Page',
                            fromId: pageId,
                            toId: customer.id,
                            contactId: `cnt_${customer.id}`, // We'll link properly in _mergeIncoming
                            authorPicture: null,
                            text: m.message,
                            postUrl: '#',
                            timestamp: m.created_time,
                            read: true,
                            status: 'sent',
                        });
                    }
                }
            }
            return await this._mergeIncoming(allDMs);
        } catch (e) {
            console.warn('[InboxService] syncMessengerConversations warning:', e.message);
            return [];
        }
    }

    async _mergeIncoming(incomingList) {
        let saved = await this.getSavedMessages();
        let newMessagesCount = 0;
        const existingIds = new Set(saved.map(m => m.id));

        for (const incoming of incomingList) {
            if (!existingIds.has(incoming.id)) {
                // Ensure Contact exists if it's incoming
                if (incoming.status === 'new') {
                    let initialData = { name: incoming.from, avatar: incoming.authorPicture };
                    let contact = await contactService.findOrCreate(incoming.fromId, incoming.platform, initialData);
                    incoming.contactId = contact.id;
                } else if (incoming.status === 'sent' && incoming.toId) {
                    // It's a sent message, we must look up the contact
                    const contacts = await dataService.read('contacts');
                    const c = contacts.find(x => x.platforms[incoming.platform]?.userId === incoming.toId);
                    if (c) incoming.contactId = c.id;
                }

                saved.push(incoming);
                newMessagesCount++;
            }
        }

        if (newMessagesCount > 0) {
            saved.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            await this.saveMessages(saved);
        }
        return saved;
    }
}

module.exports = new InboxService();
