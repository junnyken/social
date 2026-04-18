require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { connectDB } = require('./config/database');
const { initializeSocket } = require('./config/socket');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(','),
  credentials: true
}));

// Initialize Socket.IO
initializeSocket(server);

// Routes
// app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/team', require('./routes/team'));
app.use('/api/notifications', require('./routes/notifications'));
// app.use('/api/collaboration', require('./routes/collaboration'));

// Start
const PORT = process.env.PORT || 3000;

const start = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`\n🚀 SocialHub with Real-time Collaboration`);
      console.log(`✅ Server: http://localhost:${PORT}`);
      console.log(`✅ WebSocket: ws://localhost:${PORT}\n`);
    });
  } catch (error) {
    console.error('❌ Startup failed:', error);
    process.exit(1);
  }
};

start();

module.exports = { app, server };
