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

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Since this is a simple local/SPA app, disable CSP temporarily to prevent breaking external scripts.
}));
app.use(compression());
app.use(cors({ origin: config.allowedOrigins, credentials: true }));
app.use(express.json());
app.use(cookieParser());
if (config.env === 'development') {
    app.use(morgan('dev')); // Logging
} else {
    app.use(morgan('short'));
}

const authRoutes = require('./routes/auth.routes');
const accountsRoutes = require('./routes/accounts.routes');
const pagesRoutes = require('./routes/pages.routes');
const queueRoutes = require('./routes/queue.routes');
const logsRoutes = require('./routes/logs.routes');
const configRoutes = require('./routes/config.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const listeningRoutes = require('./routes/listening.routes');

// Health Check Endpoint
app.get('/api/v1/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        environment: config.env,
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/accounts', accountsRoutes);
app.use('/api/v1/pages', pagesRoutes);
app.use('/api/v1/queue', queueRoutes);
app.use('/api/v1/logs', logsRoutes);
app.use('/api/v1/config', configRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/listening', listeningRoutes);

// Serve Frontend Static Files
const frontendPath = path.join(__dirname, '../');
app.use(express.static(frontendPath));

// Base Route -> Autoposter App
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'fb-autoposter.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('[Global Error]', err);
    res.status(err.status || 500).json({
        error: true,
        message: err.message || 'Internal Server Error'
    });
});

// Create HTTP Server
const server = http.createServer(app);

// WebSocket Server (for realtime logs/updates to frontend)
const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
    console.log('[WS] Client connected');
    ws.on('close', () => console.log('[WS] Client disconnected'));
});

// Broadcast helper function
app.set('wss', wss);

// Start Server
server.listen(config.port, () => {
    console.log(`[Server] FB AutoPoster Backend running on http://localhost:${config.port}`);
    
    // Start Scheduler
    const schedulerService = require('./services/scheduler.service');
    schedulerService.setApp(app);
    schedulerService.start();
});

// Graceful Shutdown
const shutdown = () => {
    console.log('\n[System] Shutting down gracefully...');
    server.close(() => {
        console.log('[System] HTTP server closed.');
        process.exit(0);
    });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
