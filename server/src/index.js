'use strict';
require('dotenv').config();

const express    = require('express');
const http       = require('http');
const cors       = require('cors');
const { Server } = require('socket.io');

const redisClient   = require('./redis/client');
const bidRoutes     = require('./routes/bids');
const { initSocket } = require('./socket/auction');

// ── App ──────────────────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

// ── Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: Date.now() });
});

// ── Routes ────────────────────────────────────────────────────────────────────
// Attach io to request so routes can broadcast
app.use((req, _res, next) => { req.io = io; next(); });
app.use('/api/bids', bidRoutes);

// ── Socket.IO handlers ────────────────────────────────────────────────────────
initSocket(io);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

redisClient.ping().then(() => {
  console.log('[Redis] Connected ✓');
  server.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
    console.log(`[Server] NODE_ENV = ${process.env.NODE_ENV}`);
  });
}).catch((err) => {
  console.error('[Redis] Connection FAILED — cannot start server:', err.message);
  process.exit(1);
});
