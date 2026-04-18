const crypto = require('crypto');
const config = require('../config');

// Using AES-256-CBC
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'FB_AUTOPOSTER_DEFAULT_KEY_32B_!!!'; // Must be exactly 32 bytes
const IV_LENGTH = 16; 

class CryptoService {
    encrypt(text) {
        if (!text) return text;
        const key = Buffer.from(ENCRYPTION_KEY.substring(0, 32).padEnd(32, '0'));
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    }

    decrypt(text) {
        if (!text) return text;
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const key = Buffer.from(ENCRYPTION_KEY.substring(0, 32).padEnd(32, '0'));
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    }
}

module.exports = new CryptoService();
