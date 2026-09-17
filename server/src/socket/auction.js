'use strict';
const { getAuction } = require('../services/auction');

function initSocket(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // ── Join an auction room ──────────────────────────────────────────────────
    // Client emits: { auctionId: '42' }
    socket.on('auction:join', async ({ auctionId }) => {
      if (!auctionId) return;

      const room = `auction:${auctionId}`;
      socket.join(room);
      console.log(`[Socket.IO] ${socket.id} joined ${room}`);

      // Send current state immediately on join
      try {
        const auction = await getAuction(auctionId);
        if (auction) {
          socket.emit('auction:state', auction);
        } else {
          socket.emit('auction:error', { message: 'Auction not found' });
        }
      } catch (err) {
        console.error('[Socket.IO] auction:join error:', err.message);
      }
    });

    // ── Leave an auction room ─────────────────────────────────────────────────
    socket.on('auction:leave', ({ auctionId }) => {
      if (!auctionId) return;
      const room = `auction:${auctionId}`;
      socket.leave(room);
      console.log(`[Socket.IO] ${socket.id} left ${room}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
    });
  });
}

module.exports = { initSocket };
