const mongoose = require('mongoose');
const config = require('./config');

let isConnected = false;

async function connectDB() {
    if (!config.mongoUri) {
        console.warn('[MongoDB] ⚠️  MONGO_URI not set — falling back to file-based storage');
        return false;
    }

    try {
        await mongoose.connect(config.mongoUri, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });

        isConnected = true;
        console.log('[MongoDB] ✅ Connected to MongoDB Atlas');

        mongoose.connection.on('error', (err) => {
            console.error('[MongoDB] Connection error:', err.message);
            isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('[MongoDB] ⚠️  Disconnected');
            isConnected = false;
        });

        return true;
    } catch (error) {
        console.error('[MongoDB] ❌ Failed to connect:', error.message);
        isConnected = false;
        return false;
    }
}

function getConnectionStatus() {
    return {
        connected: isConnected,
        readyState: mongoose.connection?.readyState,
        host: mongoose.connection?.host || 'N/A',
        name: mongoose.connection?.name || 'N/A'
    };
}

async function disconnectDB() {
    if (isConnected) {
        await mongoose.disconnect();
        isConnected = false;
        console.log('[MongoDB] Disconnected gracefully');
    }
}

module.exports = { connectDB, disconnectDB, getConnectionStatus, isConnected: () => isConnected };
