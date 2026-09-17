const { io } = require('socket.io-client');
const http = require('http');

const PORT = process.env.PORT || 5001;
const socket = io(`http://localhost:${PORT}`);

function postBid(auctionId, userId, amount) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ auctionId, userId, amount });
    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/bids',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => resolve(JSON.parse(body)));
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function createAuction() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ title: 'Socket Test Auction', startingPrice: 100, durationSeconds: 60 });
    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/auctions',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => resolve(JSON.parse(body).data));
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

socket.on('connect', async () => {
  console.log('[Socket Test] Client connected with id:', socket.id);

  const auction = await createAuction();
  console.log('[Socket Test] Created auction:', auction.id);

  socket.emit('join:auction', auction.id);

  socket.on('bid:update', (event) => {
    console.log('[Socket Test] Received bid:update event:', event);
    if (event.highestBid === 250 && event.highestBidder === 'socket_tester') {
      console.log('✅ Socket.IO real-time broadcast verified successfully!');
      socket.disconnect();
      process.exit(0);
    }
  });

  setTimeout(async () => {
    console.log('[Socket Test] Placing bid via REST API...');
    const res = await postBid(auction.id, 'socket_tester', 250);
    console.log('[Socket Test] POST /api/bids response:', res);
  }, 500);
});
