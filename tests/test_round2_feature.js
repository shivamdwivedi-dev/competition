const http = require('http');
const { io } = require('socket.io-client');

const PORT = process.env.PORT || 5001;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runRound2Verification() {
  console.log('====================================================');
  console.log('  SYNORA ROUND-2: ITEM HOSTING & CUSTOM BID VERIFICATION');
  console.log('====================================================\n');

  // Step 1: User hosts an auction
  console.log('[Step 1] User hosts an auction with name, starting price, duration, and item image...');
  const hostRes = await makeRequest('POST', '/api/auctions', {
    name: 'MacBook Pro M3 Max (32GB, 1TB)',
    startingPrice: 150000,
    duration: 300,
    description: 'Space Black, AppleCare+ included, brand new sealed in box',
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8',
    userId: 'user_host_shivam',
  });

  console.log('Host Response Status:', hostRes.status);
  console.log('Created Auction:', hostRes.body.data);
  if (hostRes.status !== 201) throw new Error('Failed to create/host auction');
  const auction = hostRes.body.data;
  const auctionId = auction.id;

  // Verify starting price
  if (auction.startingPrice !== 150000 || auction.highestBid !== 150000) {
    throw new Error('Auction did not start at specified starting price');
  }
  console.log(`✅ Auction hosted successfully. Auction starts at: ₹${auction.highestBid}`);

  // Step 2: Connect Socket.IO client to listen for live custom bids
  console.log('\n[Step 2] Connecting Socket.IO client to auction room...');
  let receivedSocketBid = null;
  const socket = io(BASE_URL);
  await new Promise((resolve) => {
    socket.on('connect', () => {
      socket.emit('join:auction', auctionId);
      socket.on('bid:update', (payload) => {
        receivedSocketBid = payload;
      });
      resolve();
    });
  });

  // Step 3: User places custom bid of ₹155000 (above starting price)
  console.log('\n[Step 3] Placing custom bid of ₹155000 (above starting price)...');
  const bid1 = await makeRequest('POST', '/api/bids', {
    auctionId,
    userId: 'user_bidder_piyush',
    amount: 155000,
  });
  console.log('Bid 1 Result:', bid1.status, bid1.body);
  if (bid1.status !== 200 || bid1.body.status !== 'ACCEPTED') throw new Error('Expected custom bid to be accepted');

  // Step 4: User attempts lower custom bid of ₹152000 (below highest) -> BID_TOO_LOW
  console.log('\n[Step 4] Placing custom bid of ₹152000 (below highest of 155000)...');
  const bidLower = await makeRequest('POST', '/api/bids', {
    auctionId,
    userId: 'user_bidder_prince',
    amount: 152000,
  });
  console.log('Lower Bid Result:', bidLower.status, bidLower.body);
  if (bidLower.status !== 409 || bidLower.body.reason !== 'BID_TOO_LOW') throw new Error('Expected BID_TOO_LOW');

  // Step 5: User attempts equal custom bid of ₹155000 -> BID_TOO_LOW
  console.log('\n[Step 5] Placing equal custom bid of ₹155000...');
  const bidEqual = await makeRequest('POST', '/api/bids', {
    auctionId,
    userId: 'user_bidder_prince',
    amount: 155000,
  });
  console.log('Equal Bid Result:', bidEqual.status, bidEqual.body);
  if (bidEqual.status !== 409 || bidEqual.body.reason !== 'BID_TOO_LOW') throw new Error('Expected BID_TOO_LOW');

  // Step 6: Invalid custom bids (zero, negative, non-numeric)
  console.log('\n[Step 6] Testing invalid custom bid amounts (0, -500, invalid string)...');
  const invZero = await makeRequest('POST', '/api/bids', { auctionId, userId: 'u1', amount: 0 });
  const invNeg = await makeRequest('POST', '/api/bids', { auctionId, userId: 'u1', amount: -500 });
  const invStr = await makeRequest('POST', '/api/bids', { auctionId, userId: 'u1', amount: 'abc' });
  if (invZero.status !== 400 || invNeg.status !== 400 || invStr.status !== 400) {
    throw new Error('Expected 400 INVALID_BID for non-positive / non-numeric amounts');
  }
  console.log('✅ Invalid custom bids correctly rejected with 400 INVALID_BID');

  // Step 7: Invalid user ID
  console.log('\n[Step 7] Testing invalid user ID...');
  const invUser = await makeRequest('POST', '/api/bids', { auctionId, userId: '', amount: 160000 });
  if (invUser.status !== 400 || invUser.body.reason !== 'INVALID_USER_ID') {
    throw new Error('Expected 400 INVALID_USER_ID');
  }
  console.log('✅ Empty userId correctly rejected with 400 INVALID_USER_ID');

  // Step 8: Another valid custom bid of ₹175000
  console.log('\n[Step 8] Placing another custom bid of ₹175000...');
  const bid2 = await makeRequest('POST', '/api/bids', {
    auctionId,
    userId: 'user_bidder_arya',
    amount: 175000,
  });
  console.log('Bid 2 Result:', bid2.status, bid2.body);
  if (bid2.status !== 200 || bid2.body.highestBid !== 175000) throw new Error('Expected highestBid to be 175000');

  // Wait a moment for Socket.IO event
  await new Promise((r) => setTimeout(r, 200));
  if (!receivedSocketBid || receivedSocketBid.highestBid !== 175000) {
    throw new Error('Socket.IO did not receive live bid:update event for custom bid');
  }
  console.log('✅ Socket.IO received live bid:update:', receivedSocketBid);
  socket.disconnect();

  // Step 9: Verify live auction state via GET /api/auctions/:id
  console.log('\n[Step 9] Fetching live auction state via GET /api/auctions/:id...');
  const liveRes = await makeRequest('GET', `/api/auctions/${auctionId}`);
  console.log('Live State:', liveRes.body.data);
  if (liveRes.body.data.highestBid !== 175000 || liveRes.body.data.highestBidder !== 'user_bidder_arya') {
    throw new Error('Live auction state does not match latest accepted custom bid');
  }

  // Step 10: Verify audit trail via GET /api/auctions/:id/bids
  console.log('\n[Step 10] Fetching audit trail via GET /api/auctions/:id/bids...');
  const auditRes = await makeRequest('GET', `/api/auctions/${auctionId}/bids`);
  console.log(`Audit Records Count: ${auditRes.body.count}`);
  console.log('Latest Audit Record:', auditRes.body.data[0]);
  if (auditRes.body.count < 3) throw new Error('Expected at least 3 audit records (accepted + rejected)');

  console.log('\n====================================================');
  console.log('🎉 ALL ROUND-2 VERIFICATION CHECKS PASSED!');
  console.log('====================================================');
}

runRound2Verification().catch((err) => {
  console.error('\n❌ Round 2 Verification Failed:', err.message);
  process.exit(1);
});
