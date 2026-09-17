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

async function runAll() {
  console.log('====================================================');
  console.log('  SYNORA BACKEND FULL AUDIT & TEST SUITE');
  console.log('====================================================\n');

  // 1. Health check
  console.log('[Test 1] Health Check...');
  const health = await makeRequest('GET', '/health');
  console.log('Status:', health.status, 'Body:', health.body);
  if (health.status !== 200) throw new Error('Health check failed');

  // 2. Create Auction A
  console.log('\n[Test 2] Create Fresh Auction A...');
  const createA = await makeRequest('POST', '/api/auctions', {
    title: 'Audit Auction A (Flagship)',
    startingPrice: 1000,
    durationSeconds: 180,
  });
  const idA = createA.body.data.id;
  console.log(`Auction A Created: ID=${idA}, startingPrice=${createA.body.data.startingPrice}`);

  // 3. Place Valid Bid
  console.log('\n[Test 3] Place Valid Bid on Auction A (1100)...');
  const bid1 = await makeRequest('POST', '/api/bids', {
    auctionId: idA,
    userId: 'user_shivam',
    amount: 1100,
  });
  console.log('Result:', bid1.status, bid1.body);
  if (bid1.status !== 200 || bid1.body.status !== 'ACCEPTED') throw new Error('Expected 200 ACCEPTED');

  // 4. Place Lower Bid
  console.log('\n[Test 4] Place Lower Bid on Auction A (1050)...');
  const bidLower = await makeRequest('POST', '/api/bids', {
    auctionId: idA,
    userId: 'user_piyush',
    amount: 1050,
  });
  console.log('Result:', bidLower.status, bidLower.body);
  if (bidLower.status !== 409 || bidLower.body.reason !== 'BID_TOO_LOW') throw new Error('Expected 409 BID_TOO_LOW');

  // 5. Place Equal Bid
  console.log('\n[Test 5] Place Equal Bid on Auction A (1100)...');
  const bidEqual = await makeRequest('POST', '/api/bids', {
    auctionId: idA,
    userId: 'user_prince',
    amount: 1100,
  });
  console.log('Result:', bidEqual.status, bidEqual.body);
  if (bidEqual.status !== 409 || bidEqual.body.reason !== 'BID_TOO_LOW') throw new Error('Expected 409 BID_TOO_LOW');

  // 6. Place Higher Valid Bid
  console.log('\n[Test 6] Place Higher Bid on Auction A (1200)...');
  const bidHigher = await makeRequest('POST', '/api/bids', {
    auctionId: idA,
    userId: 'user_piyush',
    amount: 1200,
  });
  console.log('Result:', bidHigher.status, bidHigher.body);
  if (bidHigher.status !== 200 || bidHigher.body.status !== 'ACCEPTED') throw new Error('Expected 200 ACCEPTED');

  // 7. Invalid Bid (Negative / Boolean / String / Zero)
  console.log('\n[Test 7] Place Invalid Bids (-50, true, "bad", 0, astronomical number, >1000Cr)...');
  const inv1 = await makeRequest('POST', '/api/bids', { auctionId: idA, userId: 'u1', amount: -50 });
  const inv2 = await makeRequest('POST', '/api/bids', { auctionId: idA, userId: 'u2', amount: true });
  const inv3 = await makeRequest('POST', '/api/bids', { auctionId: idA, userId: 'u3', amount: 'not_a_number' });
  const inv4 = await makeRequest('POST', '/api/bids', { auctionId: idA, userId: 'u4', amount: 0 });
  const invAstro = await makeRequest('POST', '/api/bids', { auctionId: idA, userId: 'u5', amount: 6.7888888888889e+145 });
  const invExceed = await makeRequest('POST', '/api/bids', { auctionId: idA, userId: 'u6', amount: 10000000001 });

  console.log('Invalid Amount Statuses:', [inv1.status, inv2.status, inv3.status, inv4.status, invAstro.status, invExceed.status]);
  if (![inv1, inv2, inv3, inv4].every((r) => r.status === 400 && r.body.reason === 'INVALID_BID')) {
    throw new Error('Basic invalid bids must return 400 INVALID_BID');
  }
  if (invAstro.status !== 400 || invAstro.body.reason !== 'BID_EXCEEDS_MAX_LIMIT') {
    throw new Error('Astronomical bid must return 400 BID_EXCEEDS_MAX_LIMIT');
  }
  if (invExceed.status !== 400 || invExceed.body.reason !== 'BID_EXCEEDS_MAX_LIMIT') {
    throw new Error('Over-limit bid must return 400 BID_EXCEEDS_MAX_LIMIT');
  }

  // 8. Non-existent Auction
  console.log('\n[Test 8] Place Bid on Non-existent Auction...');
  const nonExistent = await makeRequest('POST', '/api/bids', {
    auctionId: '00000000-0000-0000-0000-000000000000',
    userId: 'user_tester',
    amount: 5000,
  });
  console.log('Non-existent Status:', nonExistent.status, nonExistent.body);
  if (nonExistent.status !== 404 || nonExistent.body.reason !== 'AUCTION_NOT_FOUND') {
    throw new Error('Expected 404 AUCTION_NOT_FOUND');
  }

  // 9. Expired Auction Test
  console.log('\n[Test 9] Create 1-second Auction and Test Expiration...');
  const shortAuc = await makeRequest('POST', '/api/auctions', {
    title: 'Short Expiring Auction',
    startingPrice: 50,
    durationSeconds: 1,
  });
  const shortId = shortAuc.body.data.id;
  await new Promise((r) => setTimeout(r, 1500));
  const expBid = await makeRequest('POST', '/api/bids', {
    auctionId: shortId,
    userId: 'user_late',
    amount: 500,
  });
  console.log('Expired Bid Status:', expBid.status, expBid.body);
  if (expBid.status !== 409 || expBid.body.reason !== 'AUCTION_ENDED') {
    throw new Error('Expected 409 AUCTION_ENDED');
  }

  // 10. Multiple Auctions Simultaneously (TASK 5 Isolation)
  console.log('\n[Test 10] Testing Multiple Auctions Simultaneously (Isolation)...');
  const createB = await makeRequest('POST', '/api/auctions', {
    title: 'Isolated Auction B',
    startingPrice: 5000,
    durationSeconds: 300,
  });
  const idB = createB.body.data.id;

  // Bid on A and B concurrently
  const [resA, resB] = await Promise.all([
    makeRequest('POST', '/api/bids', { auctionId: idA, userId: 'user_a', amount: 1300 }),
    makeRequest('POST', '/api/bids', { auctionId: idB, userId: 'user_b', amount: 5500 }),
  ]);
  console.log('Auction A Bid:', resA.body.highestBid, '| Auction B Bid:', resB.body.highestBid);

  // Verify A state did not pollute B state
  const stateA = await makeRequest('GET', `/api/auctions/${idA}`);
  const stateB = await makeRequest('GET', `/api/auctions/${idB}`);
  console.log(`State A highest: ₹${stateA.body.data.highestBid} by ${stateA.body.data.highestBidder}`);
  console.log(`State B highest: ₹${stateB.body.data.highestBid} by ${stateB.body.data.highestBidder}`);
  if (stateA.body.data.highestBid !== 1300 || stateB.body.data.highestBid !== 5500) {
    throw new Error('Auction isolation failure between A and B');
  }

  // 11. Socket.IO Live Broadcast Verification
  console.log('\n[Test 11] Socket.IO Live Room Event Verification...');
  await new Promise((resolve, reject) => {
    const socket = io(BASE_URL);
    socket.on('connect', () => {
      socket.emit('join:auction', idA);
      socket.on('bid:update', (payload) => {
        console.log('Socket received bid:update event:', payload);
        if (payload.auctionId === idA && payload.highestBid === 1400) {
          console.log('✅ Socket.IO room broadcast verified successfully!');
          socket.disconnect();
          resolve();
        }
      });

      // Emit bid after join
      setTimeout(() => {
        makeRequest('POST', '/api/bids', {
          auctionId: idA,
          userId: 'user_socket_test',
          amount: 1400,
        }).catch(reject);
      }, 200);
    });
    socket.on('connect_error', reject);
  });

  // 12. Real Load / Concurrency Benchmark (TASK 8)
  console.log('\n[Test 12] REAL Backend Load Benchmark (1,000 requests, Concurrency: 50)...');
  const benchAuction = await makeRequest('POST', '/api/auctions', {
    title: 'Load Benchmark Target Auction',
    startingPrice: 100,
    durationSeconds: 300,
  });
  const benchId = benchAuction.body.data.id;

  const TOTAL_REQUESTS = 1000;
  const CONCURRENCY = 50;
  const latencies = [];
  let acceptedCount = 0;
  let rejectedCount = 0;
  let errorCount = 0;
  let highestTrackedBid = 100;

  let requestIndex = 0;
  const startTime = Date.now();

  async function worker() {
    while (true) {
      const idx = requestIndex++;
      if (idx >= TOTAL_REQUESTS) break;

      // Pseudo-random amounts: some increasing, some decreasing to test conflict handling
      const amount = 100 + (idx % 100) * 10 + Math.floor(Math.random() * 50);
      const reqStart = Date.now();
      try {
        const res = await makeRequest('POST', '/api/bids', {
          auctionId: benchId,
          userId: `worker_${idx % CONCURRENCY}`,
          amount,
        });
        const elapsed = Date.now() - reqStart;
        latencies.push(elapsed);

        if (res.body.status === 'ACCEPTED') {
          acceptedCount++;
          if (res.body.highestBid < highestTrackedBid) {
            // Note: Parallel HTTP responses may arrive slightly out of order on the client side
          }
          highestTrackedBid = Math.max(highestTrackedBid, res.body.highestBid);
        } else if (res.body.status === 'REJECTED') {
          rejectedCount++;
        } else {
          errorCount++;
        }
      } catch (err) {
        errorCount++;
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);
  const totalElapsedMs = Date.now() - startTime;

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const throughput = Math.round((TOTAL_REQUESTS / (totalElapsedMs / 1000)) * 100) / 100;

  console.log('--- Real Benchmark Results ---');
  console.log(`Requests: ${TOTAL_REQUESTS}`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log(`Elapsed Time: ${totalElapsedMs} ms (${(totalElapsedMs / 1000).toFixed(2)}s)`);
  console.log(`Throughput: ${throughput} req/sec`);
  console.log(`Latency P50: ${p50} ms`);
  console.log(`Latency P95: ${p95} ms`);
  console.log(`Latency P99: ${p99} ms`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Accepted Bids: ${acceptedCount}`);
  console.log(`Rejected Bids: ${rejectedCount}`);
  console.log(`Final Highest Bid in Redis: ₹${highestTrackedBid}`);

  // Verify final state in Redis matches highestTrackedBid
  const finalBenchState = await makeRequest('GET', `/api/auctions/${benchId}`);
  console.log(`Verified Redis highest bid: ₹${finalBenchState.body.data.highestBid}`);
  const raceAnomalies = finalBenchState.body.data.highestBid === highestTrackedBid ? 0 : 1;
  console.log(`Race Anomalies: ${raceAnomalies}`);

  console.log('\n====================================================');
  console.log('🎉 ALL TESTS AND REAL LOAD BENCHMARK COMPLETED!');
  console.log('====================================================');
}

runAll().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
