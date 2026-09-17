require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const app = require('./app');
const { initSocketIO } = require('./sockets/auctionSocket');
const { initDb } = require('./config/db');

const PORT = process.env.PORT || 5001;

const server = http.createServer(app);

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
  },
});

initSocketIO(io);

// Start server
async function start() {
  try {
    await initDb();
    server.listen(PORT, () => {
      console.log(`==================================================`);
      console.log(`🚀 Auction Backend Running on port ${PORT}`);
      console.log(`   REST APIs: http://localhost:${PORT}/api/auctions`);
      console.log(`   Health Check: http://localhost:${PORT}/health`);
      console.log(`   Socket.IO: Ready for connections on port ${PORT}`);
      console.log(`==================================================`);
    });
  } catch (err) {
    console.error('Fatal startup error:', err);
    process.exit(1);
  }
}

// Graceful shutdown
function shutdown() {
  console.log('\n[Server] Shutting down gracefully...');
  server.close(() => {
    console.log('[Server] Closed remaining connections.');
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
