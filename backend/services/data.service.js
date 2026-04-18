const fs = require('fs/promises');
const path = require('path');
const config = require('../config');
const crypto = require('crypto');

// Helper to interact with the flat file JSON databases
class DataService {
    constructor() {
        this.dataDir = path.resolve(__dirname, '..', config.dataDir);
    }

    async ensureFile(collection) {
        const file = path.join(this.dataDir, `${collection}.json`);
        try {
            await fs.access(file);
        } catch {
            // Create directory if missing
            await fs.mkdir(this.dataDir, { recursive: true }).catch(() => {});
            // Create default file based on collection type
            const defaultValue = collection === 'settings' ? '{}' : '[]';
            await fs.writeFile(file, defaultValue, 'utf8');
        }
        return file;
    }

    async read(collection) {
        try {
            const file = await this.ensureFile(collection);
            const data = await fs.readFile(file, 'utf8');
            return JSON.parse(data);
        } catch (e) {
            console.error(`[DataService] Error reading ${collection}:`, e.message);
            return collection === 'settings' ? {} : [];
        }
    }

    async write(collection, data) {
        try {
            const file = await this.ensureFile(collection);
            await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (e) {
            console.error(`[DataService] Error writing ${collection}:`, e.message);
            return false;
        }
    }

    // Basic CRUD Operations
    async getAll(collection) {
        return await this.read(collection);
    }

    async getById(collection, id) {
        const data = await this.read(collection);
        return data.find(item => item.id === id);
    }

    async create(collection, item) {
        const data = await this.read(collection);
        const newItem = { id: crypto.randomUUID(), ...item, createdAt: new Date().toISOString() };
        data.push(newItem);
        await this.write(collection, data);
        return newItem;
    }

    async update(collection, id, updates) {
        const data = await this.read(collection);
        const index = data.findIndex(item => item.id === id);
        if (index > -1) {
            data[index] = { ...data[index], ...updates, updatedAt: new Date().toISOString() };
            await this.write(collection, data);
            return data[index];
        }
        return null;
    }

    async remove(collection, id) {
        const data = await this.read(collection);
        const filtered = data.filter(item => item.id !== id);
        await this.write(collection, filtered);
        return true;
    }
}

module.exports = new DataService();
