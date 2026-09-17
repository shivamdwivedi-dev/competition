let ioInstance = null;

function initSocketIO(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join auction room to receive live updates
    socket.on('join:auction', (auctionId) => {
      if (!auctionId) return;
      const room = `auction:${auctionId}`;
      socket.join(room);
      console.log(`[Socket.IO] Socket ${socket.id} joined room ${room}`);
      socket.emit('joined', { room, success: true });
    });

    // Leave auction room
    socket.on('leave:auction', (auctionId) => {
      if (!auctionId) return;
      const room = `auction:${auctionId}`;
      socket.leave(room);
      console.log(`[Socket.IO] Socket ${socket.id} left room ${room}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
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

// Broadcast new auction creation to all connected clients
function broadcastAuctionCreated(auction) {
  if (!ioInstance) {
    console.warn('[Socket.IO] ioInstance not initialized. Skipping auction:created broadcast.');
    return;
  }
  ioInstance.emit('auction:created', auction);
}

module.exports = {
  initSocketIO,
  broadcastBidUpdate,
  broadcastAuctionCreated,
};
