/**
 * Token Renewal Service — Auto-refresh OAuth tokens before expiry
 * 
 * Runs as a daily cron job:
 * - Facebook: Exchange long-lived token for a new one (60-day cycle)
 * - LinkedIn: Cannot refresh silently → emit warning 7 days before expiry
 * - TikTok: Same as LinkedIn → emit warning
 */

const axios = require('axios');
const config = require('../config');
const dataService = require('./data.service');
const cryptoService = require('./crypto.service');
const { emitToAll } = require('../config/socket-io');

const TOKEN_WARN_DAYS = 7; // Warn when token expires in < 7 days

async function checkAndRenewTokens() {
    console.log('[TokenRenewal] 🔑 Checking token health...');
    const accounts = await dataService.getAll('accounts') || [];

    for (const account of accounts) {
        // ── Facebook Token ──
        if (account.token) {
            await checkFacebookToken(account);
        }

        // ── LinkedIn Token ──
        if (account.linkedinToken && account.linkedinExpiresAt) {
            await checkLinkedInToken(account);
        }
    }

    console.log('[TokenRenewal] ✅ Token check complete');
}

async function checkFacebookToken(account) {
    try {
        const token = cryptoService.decrypt(account.token);
        if (!token || token.startsWith('mock')) return;

        // Debug token to check expiry
        const debugRes = await axios.get(
            `https://graph.facebook.com/${config.fb.apiVersion}/debug_token`, {
                params: { input_token: token, access_token: `${config.fb.appId}|${config.fb.appSecret}` }
            }
        );

        const data = debugRes.data?.data;
        if (!data) return;

        const expiresAt = data.expires_at ? new Date(data.expires_at * 1000) : null;
        const now = new Date();

        if (!expiresAt) {
            // Never-expiring page token — no action needed
            console.log(`[TokenRenewal] FB token for ${account.name}: never-expiring ✅`);
            return;
        }

        const daysLeft = Math.floor((expiresAt - now) / 86400000);
        console.log(`[TokenRenewal] FB token for ${account.name}: ${daysLeft} days left`);

        if (daysLeft <= 0) {
            // Token already expired
            emitToAll('token:expired', {
                platform: 'facebook',
                accountId: account.id,
                accountName: account.name,
                message: `⚠️ Facebook token for ${account.name} has expired! Please re-authenticate.`
            });
            await dataService.update('accounts', account.id, {
                tokenStatus: 'expired', tokenDaysLeft: 0
            });
        } else if (daysLeft <= TOKEN_WARN_DAYS) {
            // Try to auto-renew
            try {
                const renewRes = await axios.get(
                    `https://graph.facebook.com/${config.fb.apiVersion}/oauth/access_token`, {
                        params: {
                            grant_type: 'fb_exchange_token',
                            client_id: config.fb.appId,
                            client_secret: config.fb.appSecret,
                            fb_exchange_token: token
                        }
                    }
                );

                const newToken = renewRes.data.access_token;
                if (newToken) {
                    const encrypted = cryptoService.encrypt(newToken);
                    await dataService.update('accounts', account.id, {
                        token: encrypted,
                        tokenStatus: 'active',
                        tokenDaysLeft: 60,
                        tokenRenewedAt: new Date().toISOString()
                    });
                    console.log(`[TokenRenewal] ✅ FB token renewed for ${account.name}`);
                    emitToAll('token:renewed', {
                        platform: 'facebook',
                        accountName: account.name,
                        message: `✅ Facebook token auto-renewed (60 days)`
                    });
                }
            } catch (e) {
                console.error(`[TokenRenewal] FB renewal failed for ${account.name}:`, e.response?.data || e.message);
                emitToAll('token:expiring', {
                    platform: 'facebook',
                    accountId: account.id,
                    daysLeft,
                    message: `⚠️ Facebook token expires in ${daysLeft} days. Auto-renewal failed — please re-authenticate.`
                });
            }
        } else {
            // Token is healthy
            await dataService.update('accounts', account.id, {
                tokenStatus: 'active', tokenDaysLeft: daysLeft
            });
        }
    } catch (e) {
        console.error(`[TokenRenewal] FB check error for ${account.name}:`, e.message);
    }
}

async function checkLinkedInToken(account) {
    try {
        const expiresAt = new Date(account.linkedinExpiresAt);
        const now = new Date();
        const daysLeft = Math.floor((expiresAt - now) / 86400000);

        console.log(`[TokenRenewal] LinkedIn token for ${account.name}: ${daysLeft} days left`);

        if (daysLeft <= 0) {
            emitToAll('token:expired', {
                platform: 'linkedin',
                accountId: account.id,
                message: `⚠️ LinkedIn token expired! Please re-connect.`
            });
            await dataService.update('accounts', account.id, {
                linkedinTokenStatus: 'expired'
            });
        } else if (daysLeft <= TOKEN_WARN_DAYS) {
            // LinkedIn does NOT support silent refresh → warn user
            emitToAll('token:expiring', {
                platform: 'linkedin',
                accountId: account.id,
                daysLeft,
                message: `⚠️ LinkedIn token expires in ${daysLeft} days. Please re-connect from Settings.`
            });
            await dataService.update('accounts', account.id, {
                linkedinTokenStatus: 'expiring'
            });
        }
    } catch (e) {
        console.error(`[TokenRenewal] LinkedIn check error:`, e.message);
    }
}

/**
 * Get token health for all accounts (used by Settings UI)
 */
async function getTokenHealth() {
    const accounts = await dataService.getAll('accounts') || [];
    return accounts.map(a => ({
        id: a.id,
        name: a.name,
        facebook: {
            connected: !!a.token,
            status: a.tokenStatus || 'unknown',
            daysLeft: a.tokenDaysLeft,
            renewedAt: a.tokenRenewedAt
        },
        linkedin: {
            connected: !!a.linkedinToken,
            status: a.linkedinTokenStatus || (a.linkedinToken ? 'active' : 'disconnected'),
            expiresAt: a.linkedinExpiresAt
        }
    }));
}

module.exports = { checkAndRenewTokens, getTokenHealth };
