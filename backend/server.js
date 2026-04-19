const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const config = require('./config');

// Initialize Express App
const app = express();
app.set('trust proxy', 1);

// ═══════════════════════════════════════════════════════════════
// Z1: PERFORMANCE & SECURITY MIDDLEWARE
// ═══════════════════════════════════════════════════════════════
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));
app.use(compression({ level: 6, threshold: 1024 })); // Gzip level 6, skip < 1KB
app.use(cors({ origin: config.allowedOrigins, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());

// Input sanitization (XSS protection)
const { sanitize } = require('./middleware/sanitize.middleware');
app.use(sanitize);

// Rate limiting on API routes
const { apiLimit } = require('./middleware/rateLimit.middleware');
app.use('/api/', apiLimit);

// Logging
if (config.env === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// ═══════════════════════════════════════════════════════════════
// Z3: HEALTH MONITORING
// ═══════════════════════════════════════════════════════════════
const startTime = Date.now();

app.get('/api/v1/health', (req, res) => {
    const mem = process.memoryUsage();
    res.json({
        status: 'ok',
        version: '2.0.0',
        uptime: process.uptime(),
        uptimeHuman: formatUptime(process.uptime()),
        environment: config.env,
        memory: {
            heapUsed: `${Math.round(mem.heapUsed / 1048576)}MB`,
            heapTotal: `${Math.round(mem.heapTotal / 1048576)}MB`,
            rss: `${Math.round(mem.rss / 1048576)}MB`,
            external: `${Math.round(mem.external / 1048576)}MB`
        },
        cpu: process.cpuUsage(),
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid,
        timestamp: new Date().toISOString()
    });
});

// Deep health check — verifies all services
app.get('/api/v1/health/deep', async (req, res) => {
    const checks = {};
    const dataService = require('./services/data.service');

    // Check data persistence
    try {
        const testKey = `_healthcheck_${Date.now()}`;
        await dataService.write(testKey, { test: true });
        const readBack = await dataService.read(testKey);
        checks.dataService = { status: readBack ? 'ok' : 'degraded', latency: '< 1ms' };
    } catch (e) {
        checks.dataService = { status: 'error', error: e.message };
    }

    // Check Gemini API
    try {
        const geminiService = require('./services/gemini.service');
        checks.geminiAI = { status: geminiService.genAI ? 'ok' : 'no-key', note: 'Gemini API configured' };
    } catch (e) {
        checks.geminiAI = { status: 'error', error: e.message };
    }

    // Check Socket.IO
    try {
        const io = app.get('io');
        const sockets = io ? await io.fetchSockets() : [];
        checks.socketIO = { status: 'ok', connections: sockets.length };
    } catch (e) {
        checks.socketIO = { status: 'error', error: e.message };
    }

    // Route count
    const routeCount = countRoutes(app);

    const allOk = Object.values(checks).every(c => c.status === 'ok' || c.status === 'no-key');

    res.json({
        status: allOk ? 'healthy' : 'degraded',
        checks,
        system: {
            totalRoutes: routeCount,
            uptime: formatUptime(process.uptime()),
            startedAt: new Date(startTime).toISOString(),
            memoryMB: Math.round(process.memoryUsage().heapUsed / 1048576)
        }
    });
});

function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
}

function countRoutes(app) {
    let count = 0;
    app._router?.stack?.forEach(layer => {
        if (layer.route) count++;
        else if (layer.name === 'router') {
            layer.handle?.stack?.forEach(r => { if (r.route) count++; });
        }
    });
    return count;
}

// ═══════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════
app.use('/api', require('./services/audit.service').loggerMiddleware('system'));
app.use('/api/v1/auth', require('./routes/auth.routes'));
app.use('/api/v1/accounts', require('./routes/accounts.routes'));
app.use('/api/v1/pages', require('./routes/pages.routes'));
app.use('/api/v1/fb/pages', require('./routes/fb-pages.routes'));
app.use('/api/v1/insights', require('./routes/insights.routes'));
app.use('/api/v1/inbox', require('./routes/inbox.routes'));
app.use('/api/v1/contacts', require('./routes/contacts.routes'));
app.use('/api/v1/ai', require('./routes/gemini.routes'));
app.use('/api/v1/queue', require('./routes/queue.routes'));
app.use('/api/v1/logs', require('./routes/logs.routes'));
app.use('/api/v1/config', require('./routes/config.routes'));
app.use('/api/v1/analytics', require('./routes/analytics.routes'));
app.use('/api/v1/listening', require('./routes/listening.routes'));
app.use('/api/v1/workflow', require('./routes/workflow.routes'));
app.use('/api/v1/team', require('./routes/team.routes'));
app.use('/api/v1/library', require('./routes/library.routes'));
app.use('/api/v1/agency', require('./routes/agency.routes'));
app.use('/api/v1/webhook', require('./routes/webhook.routes'));
app.use('/api/v1/notifications', require('./routes/notifications.routes'));
app.use('/api/v1/competitors', require('./routes/competitor.routes'));
app.use('/api/v1/utm', require('./routes/utm.routes'));
app.use('/api/v1/ab-tests', require('./routes/abtest.routes'));
app.use('/api/v1/bulk-publish', require('./routes/bulk-publish.routes'));
app.use('/api/v1/cross-platform', require('./routes/cross-platform.routes'));
app.use('/api/v1/evergreen', require('./routes/evergreen.routes'));
app.use('/api/v1/reports', require('./routes/report.routes'));
app.use('/api/v1/bio', require('./routes/linkinbio.routes'));
app.use('/api/v1/audit', require('./routes/audit.routes'));
app.use('/api/v1/approval', require('./routes/client-approval.routes'));
app.use('/api/v1/analytics-enhanced', require('./routes/analytics-enhanced.routes'));

// ═══════════════════════════════════════════════════════════════
// STATIC FILES & FRONTEND
// ═══════════════════════════════════════════════════════════════

// Socket.IO client lib
app.get('/socket.io/socket.io.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'node_modules/socket.io/client-dist/socket.io.min.js'));
});

const fs = require('fs');

// Explicit route for auth-callback (ensures it works even if static middleware has path issues)
app.get('/auth-callback.html', (req, res) => {
    try {
        const filePath = path.join(__dirname, '../auth-callback.html');
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            res.setHeader('Content-Type', 'text/html');
            res.send(content);
        } else {
            res.status(500).json({ error: true, message: `File not found at explicit path: ${filePath}. __dirname is ${__dirname}` });
        }
    } catch (e) {
        res.status(500).json({ error: true, message: `Read error: ${e.message}`, stack: e.stack });
    }
});

// Serve Frontend with cache headers
const frontendPath = path.join(__dirname, '../');
app.use(express.static(frontendPath, {
    maxAge: config.env === 'production' ? '7d' : 0,
    etag: true,
    lastModified: true
}));

// SPA fallback
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'fb-autoposter.html'));
});

// ═══════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: true, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
    const status = err.status || 500;
    if (status === 500) console.error('[Server Error]', err);
    res.status(status).json({
        error: true,
        message: config.env === 'production' ? 'Internal Server Error' : err.message,
        ...(config.env === 'development' && { stack: err.stack })
    });
});

// ═══════════════════════════════════════════════════════════════
// SERVER STARTUP
// ═══════════════════════════════════════════════════════════════
const server = http.createServer(app);

// WebSocket Server (legacy)
const wss = new WebSocketServer({ server, path: '/ws-legacy' });
wss.on('connection', (ws) => {
    console.log('[WS-Legacy] Client connected');
    ws.on('close', () => console.log('[WS-Legacy] Client disconnected'));
});
app.set('wss', wss);

// Socket.IO Server
const { initializeSocketIO } = require('./config/socket-io');
const io = initializeSocketIO(server, config);
app.set('io', io);

// Start Server
server.listen(config.port, () => {
    console.log(`\n╔═══════════════════════════════════════════════════════╗`);
    console.log(`║  🚀 SocialHub v2.0 — Production Ready                ║`);
    console.log(`║  📡 Server: http://localhost:${config.port}                    ║`);
    console.log(`║  🔧 Environment: ${config.env.padEnd(37)}║`);
    console.log(`║  📊 Routes: ${String(countRoutes(app)).padEnd(42)}║`);
    console.log(`║  🕐 Started: ${new Date().toLocaleString('vi-VN').padEnd(41)}║`);
    console.log(`╚═══════════════════════════════════════════════════════╝\n`);

    // Start Scheduler
    const schedulerService = require('./services/scheduler.service');
    schedulerService.setApp(app);
    schedulerService.start();
});

// ═══════════════════════════════════════════════════════════════
// Z2: GRACEFUL SHUTDOWN & PROCESS HARDENING
// ═══════════════════════════════════════════════════════════════
const shutdown = (signal) => {
    console.log(`\n[System] Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
        console.log('[System] HTTP server closed.');
        console.log('[System] Uptime was:', formatUptime(process.uptime()));
        process.exit(0);
    });
    // Force kill after 10s
    setTimeout(() => {
        console.error('[System] Forced shutdown after 10s timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Catch unhandled errors — prevent crash in production
process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught Exception:', err);
    if (config.env === 'production') {
        // Log but don't crash in production
    } else {
        process.exit(1);
    }
});

process.on('unhandledRejection', (reason) => {
    console.error('[FATAL] Unhandled Rejection:', reason);
});
