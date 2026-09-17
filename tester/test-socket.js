/**
 * 4-WARRIORS | SYNORA Live Hackathon
 * Socket.IO Multi-Client Real-Time Broadcast Test
 * QA & Reliability Engineer: Prince
 */

'use strict';

const { io } = require('socket.io-client');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

async function runSocketTest() {
  console.log('====================================================');
  console.log('SYNORA SOCKET.IO MULTI-CLIENT BROADCAST TEST');
  console.log('Backend Target:', BACKEND_URL);
  console.log('====================================================\n');

  console.log('[1/4] Creating dedicated test auction via REST API...');
  const auctionRes = await fetch(`${BACKEND_URL}/api/auctions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Socket.IO Live Broadcast Test Auction',
      startingPrice: 500,
      durationSeconds: 1800,
    }),
  });

  if (!auctionRes.ok) {
    throw new Error(`Failed to create auction: HTTP ${auctionRes.status}`);
  }

  const auctionJson = await auctionRes.json();
  const auctionId = auctionJson.data.id;
  console.log(`[1/4] Auction created: ${auctionId} (Starting price: ₹500)\n`);

  console.log('[2/4] Connecting 2 independent Socket.IO clients...');
  const client1 = io(BACKEND_URL, {
    transports: ['websocket'],
    reconnection: false,
    timeout: 5000,
  });

  const client2 = io(BACKEND_URL, {
    transports: ['websocket'],
    reconnection: false,
    timeout: 5000,
  });

  await Promise.all([
    new Promise((resolve, reject) => {
      client1.on('connect', () => {
        console.log(`  Client 1 connected [socket id: ${client1.id}]`);
        resolve();
      });
      client1.on('connect_error', reject);
    }),
    new Promise((resolve, reject) => {
      client2.on('connect', () => {
        console.log(`  Client 2 connected [socket id: ${client2.id}]`);
        resolve();
      });
      client2.on('connect_error', reject);
    }),
  ]);

  console.log(`\n[3/4] Subscribing both clients to room auction:${auctionId}...`);
  client1.emit('join:auction', auctionId);
  client2.emit('join:auction', auctionId);

  const client1Received = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Client 1 timeout waiting for bid:update')), 5000);
    client1.on('bid:update', (data) => {
      clearTimeout(timeout);
      console.log('  [Client 1 Event Received]', JSON.stringify(data));
      resolve(data);
    });
  });

  const client2Received = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Client 2 timeout waiting for bid:update')), 5000);
    client2.on('bid:update', (data) => {
      clearTimeout(timeout);
      console.log('  [Client 2 Event Received]', JSON.stringify(data));
      resolve(data);
    });
  });

  await new Promise((r) => setTimeout(r, 400));

  const testBidAmount = 750;
  const testBidder = 'socket_test_user_4w';
  console.log(`\n[4/4] Sending HTTP bid: ₹${testBidAmount} by ${testBidder}...`);

  const bidRes = await fetch(`${BACKEND_URL}/api/bids`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auctionId,
      userId: testBidder,
      amount: testBidAmount,
    }),
  });

  const bidData = await bidRes.json();
  console.log('  HTTP Response Status:', bidRes.status);
  console.log('  HTTP Response Body:', JSON.stringify(bidData));

  if (!bidRes.ok || bidData.status !== 'ACCEPTED') {
    throw new Error(`Bid was not accepted: ${JSON.stringify(bidData)}`);
  }

  const [event1, event2] = await Promise.all([client1Received, client2Received]);

  client1.close();
  client2.close();

  console.log('\n====================================================');
  console.log('SOCKET.IO BROADCAST VERIFICATION RESULTS');
  console.log('====================================================');

  const matches1 = event1.auctionId === auctionId && event1.highestBid === testBidAmount && event1.highestBidder === testBidder;
  const matches2 = event2.auctionId === auctionId && event2.highestBid === testBidAmount && event2.highestBidder === testBidder;
  const identical = JSON.stringify(event1) === JSON.stringify(event2);

  console.log(`Client 1 Received Valid Data: ${matches1 ? 'PASSED (MATCH)' : 'FAILED'}`);
  console.log(`Client 2 Received Valid Data: ${matches2 ? 'PASSED (MATCH)' : 'FAILED'}`);
  console.log(`Payload Identical:             ${identical ? 'PASSED (EXACT MATCH)' : 'FAILED'}`);

  if (matches1 && matches2 && identical) {
    console.log('\n>>> STATUS: ALL SOCKET.IO BROADCAST TESTS PASSED <<<');
    console.log('Both clients received real-time broadcast of accepted bid without drops or desync.\n');
    return true;
  } else {
    console.error('\n>>> STATUS: SOCKET.IO BROADCAST VERIFICATION FAILED <<<\n');
    return false;
  }
}

if (require.main === module) {
  runSocketTest()
    .then((success) => {
      setTimeout(() => process.exit(success ? 0 : 1), 100);
    })
    .catch((err) => {
      console.error('\n[Socket Test Error]', err.message);
      setTimeout(() => process.exit(1), 100);
    });
}
module.exports = { runSocketTest };
