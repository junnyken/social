/**
 * DataService — MongoDB Backend (with JSON file fallback)
 * 
 * Keeps the SAME public API as the old file-based version:
 *   getAll(collection), getById(collection, id), create(collection, item),
 *   update(collection, id, updates), remove(collection, id), read(collection), write(collection, data)
 * 
 * All existing routes continue to work without any changes.
 */
const mongoose = require('mongoose');
const fs = require('fs/promises');
const path = require('path');
const config = require('../config');
const crypto = require('crypto');

// Import all models
const Models = require('../models');

// Map collection names (used in routes) → Mongoose model
const COLLECTION_MAP = {
    'accounts':           Models.Account,
    'queue':              Models.QueueItem,
    'logs':               Models.Log,
    'contacts':           Models.Contact,
    'inbox_messages':     Models.InboxMessage,
    'inbox':              Models.InboxMessage,
    'audit_logs':         Models.AuditLog,
    'schedules':          Models.Schedule,
    'settings':           Models.Settings,
    'notifications':      Models.Notification,
    'team':               Models.TeamMember,
    'workflows':          Models.Workflow,
    'library':            Models.LibraryItem,
    'competitors':        Models.Competitor,
    'ab_experiments':     Models.ABExperiment,
    'bulk_campaigns':     Models.BulkCampaign,
    'evergreen_queues':   Models.EvergreenQueue,
    'listening_keywords': Models.ListeningKeyword,
    'listening_mentions': Models.ListeningMention,
    'linkinbio_pages':    Models.LinkInBioPage,
    'pdf_reports':        Models.PDFReport,
    'utm_links':          Models.UTMLink,
    'brand_voice':        Models.BrandVoice,
};

class DataService {
    constructor() {
        this.dataDir = path.resolve(__dirname, '..', config.dataDir);
        this.cache = new Map();
        this.writeQueue = new Map();
    }

    _isMongoConnected() {
        return mongoose.connection?.readyState === 1;
    }

    _getModel(collection) {
        return COLLECTION_MAP[collection] || null;
    }

    // ══════════════════════════════════════════════════════════
    // PUBLIC API — Same interface, MongoDB backend
    // ══════════════════════════════════════════════════════════

    async getAll(collection) {
        if (this._isMongoConnected()) {
            const Model = this._getModel(collection);
            if (Model) {
                try {
                    const docs = await Model.find().sort({ createdAt: -1 }).lean();
                    return docs.map(d => ({ ...d, id: d.id || d._id?.toString() }));
                } catch (e) {
                    console.error(`[DataService/Mongo] getAll(${collection}):`, e.message);
                    return [];
                }
            }
        }
        return this._fileRead(collection);
    }

    async getById(collection, id) {
        if (this._isMongoConnected()) {
            const Model = this._getModel(collection);
            if (Model) {
                try {
                    // Try find by custom 'id' field first, then by _id
                    let doc = await Model.findOne({ id }).lean();
                    if (!doc && mongoose.Types.ObjectId.isValid(id)) {
                        doc = await Model.findById(id).lean();
                    }
                    if (doc) return { ...doc, id: doc.id || doc._id?.toString() };
                    return null;
                } catch (e) {
                    console.error(`[DataService/Mongo] getById(${collection}, ${id}):`, e.message);
                    return null;
                }
            }
        }
        const data = await this._fileRead(collection);
        return data.find(item => item.id === id);
    }

    async create(collection, item) {
        const newId = item.id || crypto.randomUUID();
        if (this._isMongoConnected()) {
            const Model = this._getModel(collection);
            if (Model) {
                try {
                    const doc = await Model.create({ id: newId, ...item });
                    const obj = doc.toObject();
                    return { ...obj, id: obj.id || obj._id?.toString() };
                } catch (e) {
                    console.error(`[DataService/Mongo] create(${collection}):`, e.message);
                }
            }
        }
        // Fallback to file
        const data = await this._fileRead(collection);
        const newItem = { id: newId, ...item, createdAt: new Date().toISOString() };
        data.push(newItem);
        await this._fileWrite(collection, data);
        return newItem;
    }

    async update(collection, id, updates) {
        if (this._isMongoConnected()) {
            const Model = this._getModel(collection);
            if (Model) {
                try {
                    let doc = await Model.findOneAndUpdate(
                        { id },
                        { $set: updates },
                        { new: true, lean: true }
                    );
                    if (!doc && mongoose.Types.ObjectId.isValid(id)) {
                        doc = await Model.findByIdAndUpdate(id, { $set: updates }, { new: true, lean: true });
                    }
                    if (doc) return { ...doc, id: doc.id || doc._id?.toString() };
                    return null;
                } catch (e) {
                    console.error(`[DataService/Mongo] update(${collection}, ${id}):`, e.message);
                    return null;
                }
            }
        }
        const data = await this._fileRead(collection);
        const index = data.findIndex(item => item.id === id);
        if (index > -1) {
            data[index] = { ...data[index], ...updates, updatedAt: new Date().toISOString() };
            await this._fileWrite(collection, data);
            return data[index];
        }
        return null;
    }

    async remove(collection, id) {
        if (this._isMongoConnected()) {
            const Model = this._getModel(collection);
            if (Model) {
                try {
                    let result = await Model.findOneAndDelete({ id });
                    if (!result && mongoose.Types.ObjectId.isValid(id)) {
                        result = await Model.findByIdAndDelete(id);
                    }
                    return !!result;
                } catch (e) {
                    console.error(`[DataService/Mongo] remove(${collection}, ${id}):`, e.message);
                    return false;
                }
            }
        }
        const data = await this._fileRead(collection);
        const filtered = data.filter(item => item.id !== id);
        await this._fileWrite(collection, filtered);
        return true;
    }

    // ══════════════════════════════════════════════════════════
    // WORKSPACE-SCOPED PROXY
    // ══════════════════════════════════════════════════════════

    static GLOBAL_COLLECTIONS = new Set([
        'accounts', 'settings', 'team', 'brand_voice', 'audit_logs'
    ]);

    /**
     * Returns a proxy that auto-filters by workspaceId.
     * Usage: const data = dataService.scoped('ws-123');
     *        const posts = await data.getAll('queue');  // only ws-123 items
     */
    scoped(workspaceId) {
        const self = this;
        return {
            getAll:  (col) => self._scopedGetAll(col, workspaceId),
            getById: (col, id) => self.getById(col, id),
            create:  (col, item) => {
                if (DataService.GLOBAL_COLLECTIONS.has(col)) return self.create(col, item);
                return self.create(col, { ...item, workspaceId });
            },
            update:  (col, id, updates) => self.update(col, id, updates),
            remove:  (col, id) => self.remove(col, id),
            read:    (col) => self._scopedGetAll(col, workspaceId),
            write:   (col, data) => self.write(col, data),
        };
    }

    async _scopedGetAll(collection, workspaceId) {
        if (DataService.GLOBAL_COLLECTIONS.has(collection)) {
            return this.getAll(collection);
        }
        if (this._isMongoConnected()) {
            const Model = this._getModel(collection);
            if (Model) {
                try {
                    const docs = await Model.find({ workspaceId })
                        .sort({ createdAt: -1 }).lean();
                    return docs.map(d => ({ ...d, id: d.id || d._id?.toString() }));
                } catch (e) {
                    console.error(`[DataService/Scoped] getAll(${collection}, ws=${workspaceId}):`, e.message);
                    return [];
                }
            }
        }
        // File fallback: filter in memory
        const all = await this._fileRead(collection);
        return all.filter(d => d.workspaceId === workspaceId || (!d.workspaceId && workspaceId === 'default'));
    }

    // ── Compatibility aliases ──
    async read(collection) {
        return this.getAll(collection);
    }

    async write(collection, data) {
        if (this._isMongoConnected()) {
            const Model = this._getModel(collection);
            if (Model) {
                // For settings or brand_voice (object, not array)
                if (!Array.isArray(data)) {
                    try {
                        const key = collection === 'brand_voice' ? 'global' : 'global';
                        await Model.findOneAndUpdate(
                            { key },
                            { key, data },
                            { upsert: true }
                        );
                        return true;
                    } catch (e) {
                        console.error(`[DataService/Mongo] write ${collection}:`, e.message);
                    }
                }
                // For arrays: replace entire collection in MongoDB
                if (Array.isArray(data)) {
                    try {
                        await Model.deleteMany({});
                        if (data.length > 0) {
                            // Ensure each doc has an 'id' field
                            const docs = data.map(d => {
                                const doc = { ...d };
                                if (doc._id) delete doc._id; // prevent duplicate _id errors
                                return doc;
                            });
                            await Model.insertMany(docs, { ordered: false });
                        }
                        // Also update file cache
                        this.cache.set(collection, JSON.parse(JSON.stringify(data)));
                        return true;
                    } catch (e) {
                        console.error(`[DataService/Mongo] write array ${collection}:`, e.message);
                        // Fallback to file on error
                    }
                }
            }
        }
        return this._fileWrite(collection, data);
    }

    // ══════════════════════════════════════════════════════════
    // FILE FALLBACK (kept for non-MongoDB environments)
    // ══════════════════════════════════════════════════════════

    async _fileEnsure(collection) {
        const file = path.join(this.dataDir, `${collection}.json`);
        try {
            await fs.access(file);
        } catch {
            await fs.mkdir(this.dataDir, { recursive: true }).catch(() => {});
            const defaultValue = collection === 'settings' ? '{}' : '[]';
            await fs.writeFile(file, defaultValue, 'utf8');
        }
        return file;
    }

    async _fileRead(collection) {
        if (this.cache.has(collection)) {
            return JSON.parse(JSON.stringify(this.cache.get(collection)));
        }
        try {
            const file = await this._fileEnsure(collection);
            const data = await fs.readFile(file, 'utf8');
            const parsed = JSON.parse(data);
            this.cache.set(collection, parsed);
            return JSON.parse(JSON.stringify(parsed));
        } catch (e) {
            console.error(`[DataService/File] Error reading ${collection}:`, e.message);
            return collection === 'settings' ? {} : [];
        }
    }

    async _fileWrite(collection, data) {
        if (this.writeQueue.has(collection)) {
            await this.writeQueue.get(collection);
        }
        const writePromise = (async () => {
            try {
                const file = await this._fileEnsure(collection);
                this.cache.set(collection, JSON.parse(JSON.stringify(data)));
                await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
                return true;
            } catch (e) {
                console.error(`[DataService/File] Error writing ${collection}:`, e.message);
                return false;
            } finally {
                this.writeQueue.delete(collection);
            }
        })();
        this.writeQueue.set(collection, writePromise);
        return writePromise;
    }
}

module.exports = new DataService();
