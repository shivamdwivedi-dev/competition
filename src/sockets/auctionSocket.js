let ioInstance = null;

function initSocketIO(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    // Join auction room to receive live updates
    socket.on('join:auction', (auctionId) => {
      if (!auctionId || typeof auctionId !== 'string') return;
      const room = `auction:${auctionId.trim()}`;
      socket.join(room);
      socket.emit('joined', { room, success: true });
    });

    // Leave auction room
    socket.on('leave:auction', (auctionId) => {
      if (!auctionId || typeof auctionId !== 'string') return;
      const room = `auction:${auctionId.trim()}`;
      socket.leave(room);
    });
  });
}

// Broadcast accepted bid to all clients in the auction room
function broadcastBidUpdate(payload) {
  if (!ioInstance) {
    console.warn('[Socket.IO] ioInstance not initialized. Skipping broadcast.');
    return;
  }

  const { auctionId, highestBid, highestBidder, timestamp } = payload;
  const room = `auction:${auctionId}`;

  ioInstance.to(room).emit('bid:update', {
    auctionId,
    highestBid,
    highestBidder,
    timestamp,
  });

  // Also emit globally for dashboard / list views if subscribed
  ioInstance.emit('auction:feed', {
    auctionId,
    highestBid,
    highestBidder,
    timestamp,
  });
}

module.exports = {
  initSocketIO,
  broadcastBidUpdate,
};
