const http = require('http');
const { io } = require('socket.io-client');

const BASE_URL = 'http://localhost:5001';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
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

async function runAllTests() {
  console.log("==================================================");
  console.log("PRINCE QA SUITE — ROUND 2 FEATURE VERIFICATION");
  console.log("Backend:", BASE_URL);
  console.log("==================================================\n");

  const results = {};

  // TEST 1 — HOST / CREATE AUCTION
  console.log(">>> EXECUTING TEST 1: HOST / CREATE AUCTION");
  const t1Res = await request('POST', '/api/auctions', {
    title: 'Mechanical Keyboard',
    startingPrice: 1000,
    durationSeconds: 600,
  });
  console.log("HTTP Status:", t1Res.status);
  console.log("Response Body:", JSON.stringify(t1Res.body, null, 2));

  const auction = t1Res.body.data;
  const auctionId = auction.id;
  results.test1 = { status: t1Res.status, body: t1Res.body };

  // Inspect state right after creation
  const t1Get = await request('GET', `/api/auctions/${auctionId}`);
  console.log("Initial GET /api/auctions/:id ->", JSON.stringify(t1Get.body, null, 2));
  results.test1_get = t1Get.body;

  // TEST 2 — BID BELOW STARTING PRICE (₹900)
  console.log("\n>>> EXECUTING TEST 2: BID BELOW STARTING PRICE (₹900)");
  const t2Res = await request('POST', '/api/bids', {
    auctionId,
    userId: 'user_prince',
    amount: 900,
  });
  console.log("HTTP Status:", t2Res.status);
  console.log("Response Body:", JSON.stringify(t2Res.body, null, 2));
  const t2Get = await request('GET', `/api/auctions/${auctionId}`);
  console.log("Post-Test2 Highest Bid:", t2Get.body.data.highestBid, "Highest Bidder:", t2Get.body.data.highestBidder);
  results.test2 = { status: t2Res.status, body: t2Res.body, state: t2Get.body.data };

  // TEST 3 — VALID CUSTOM BID (₹1200 by user_prince)
  console.log("\n>>> EXECUTING TEST 3: VALID CUSTOM BID (₹1200)");
  const t3Res = await request('POST', '/api/bids', {
    auctionId,
    userId: 'user_prince',
    amount: 1200,
  });
  console.log("HTTP Status:", t3Res.status);
  console.log("Response Body:", JSON.stringify(t3Res.body, null, 2));
  const t3Get = await request('GET', `/api/auctions/${auctionId}`);
  console.log("Post-Test3 Highest Bid:", t3Get.body.data.highestBid, "Highest Bidder:", t3Get.body.data.highestBidder);
  results.test3 = { status: t3Res.status, body: t3Res.body, state: t3Get.body.data };

  // TEST 4 — EQUAL BID (₹1200 by user_another)
  console.log("\n>>> EXECUTING TEST 4: EQUAL BID (₹1200)");
  const t4Res = await request('POST', '/api/bids', {
    auctionId,
    userId: 'user_another',
    amount: 1200,
  });
  console.log("HTTP Status:", t4Res.status);
  console.log("Response Body:", JSON.stringify(t4Res.body, null, 2));
  const t4Get = await request('GET', `/api/auctions/${auctionId}`);
  console.log("Post-Test4 Highest Bid:", t4Get.body.data.highestBid, "Highest Bidder:", t4Get.body.data.highestBidder);
  results.test4 = { status: t4Res.status, body: t4Res.body, state: t4Get.body.data };

  // TEST 5 — LOWER BID AFTER ACCEPTED (₹1100 by user_another)
  console.log("\n>>> EXECUTING TEST 5: LOWER BID AFTER ACCEPTED (₹1100)");
  const t5Res = await request('POST', '/api/bids', {
    auctionId,
    userId: 'user_another',
    amount: 1100,
  });
  console.log("HTTP Status:", t5Res.status);
  console.log("Response Body:", JSON.stringify(t5Res.body, null, 2));
  const t5Get = await request('GET', `/api/auctions/${auctionId}`);
  console.log("Post-Test5 Highest Bid:", t5Get.body.data.highestBid, "Highest Bidder:", t5Get.body.data.highestBidder);
  results.test5 = { status: t5Res.status, body: t5Res.body, state: t5Get.body.data };

  // TEST 6 — HIGHER CUSTOM BID (₹1500 by user_another)
  console.log("\n>>> EXECUTING TEST 6: HIGHER CUSTOM BID (₹1500)");
  const t6Res = await request('POST', '/api/bids', {
    auctionId,
    userId: 'user_another',
    amount: 1500,
  });
  console.log("HTTP Status:", t6Res.status);
  console.log("Response Body:", JSON.stringify(t6Res.body, null, 2));
  const t6Get = await request('GET', `/api/auctions/${auctionId}`);
  console.log("Post-Test6 Highest Bid:", t6Get.body.data.highestBid, "Highest Bidder:", t6Get.body.data.highestBidder);
  results.test6 = { status: t6Res.status, body: t6Res.body, state: t6Get.body.data };

  // TEST 7 — INVALID BID VALUES
  console.log("\n>>> EXECUTING TEST 7: INVALID BID VALUES");
  const invalidTests = [
    { label: "Zero bid (amount: 0)", payload: { auctionId, userId: 'user_test7', amount: 0 } },
    { label: "Negative bid (amount: -100)", payload: { auctionId, userId: 'user_test7', amount: -100 } },
    { label: "Missing amount", payload: { auctionId, userId: 'user_test7' } },
    { label: "Non-numeric amount", payload: { auctionId, userId: 'user_test7', amount: 'not_a_number' } },
  ];

  results.test7 = [];
  for (const it of invalidTests) {
    const res = await request('POST', '/api/bids', it.payload);
    console.log(`- ${it.label}: Status ${res.status}, Reason: ${res.body.reason || res.body.message}`);
    results.test7.push({ label: it.label, status: res.status, body: res.body });
  }
  const t7Get = await request('GET', `/api/auctions/${auctionId}`);
  console.log("Post-Test7 State Preserved:", t7Get.body.data.highestBid === 1500 && t7Get.body.data.highestBidder === 'user_another');

  // TEST 8 — AUCTION DETAILS / HISTORY
  console.log("\n>>> EXECUTING TEST 8: AUCTION DETAILS / HISTORY");
  const t8Details = await request('GET', `/api/auctions/${auctionId}`);
  const t8Bids = await request('GET', `/api/auctions/${auctionId}/bids`);
  console.log("Details Status:", t8Details.status, "Highest Bid:", t8Details.body.data.highestBid, "Bidder:", t8Details.body.data.highestBidder);
  console.log("Bids History Status:", t8Bids.status, "Count of bids recorded:", t8Bids.body.data ? t8Bids.body.data.length : 'none');
  console.log("History records:", JSON.stringify(t8Bids.body.data, null, 2));
  results.test8 = { details: t8Details.body, history: t8Bids.body };

  // TEST 10 — SOCKET.IO REAL-TIME UPDATE (Run before concurrent so clients are clean)
  console.log("\n>>> EXECUTING TEST 10: SOCKET.IO MULTI-CLIENT REAL-TIME UPDATE");
  const socketClientA = io(BASE_URL, { transports: ['websocket'], reconnection: false });
  const socketClientB = io(BASE_URL, { transports: ['websocket'], reconnection: false });

  await Promise.all([
    new Promise((resolve) => socketClientA.on('connect', resolve)),
    new Promise((resolve) => socketClientB.on('connect', resolve)),
  ]);

  socketClientA.emit('join:auction', auctionId);
  socketClientB.emit('join:auction', auctionId);

  const clientBPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timeout waiting for Client B bid:update")), 5000);
    socketClientB.on('bid:update', (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

  await new Promise((r) => setTimeout(r, 300)); // Ensure room join propagation

  // Post higher bid from user_socket_a
  const socketBidAmount = 1800;
  const socketBidRes = await request('POST', '/api/bids', {
    auctionId,
    userId: 'user_socket_a',
    amount: socketBidAmount,
  });
  console.log("Socket Bid Placed Status:", socketBidRes.status, "Body:", socketBidRes.body);

  const clientBEvent = await clientBPromise;
  console.log("Client B Received bid:update:", JSON.stringify(clientBEvent, null, 2));
  socketClientA.close();
  socketClientB.close();
  results.test10 = { received: clientBEvent };

  // TEST 11 — AUCTION EXPIRY
  console.log("\n>>> EXECUTING TEST 11: AUCTION EXPIRY");
  const expiryAuctionRes = await request('POST', '/api/auctions', {
    title: 'Expiring Auction',
    startingPrice: 500,
    durationSeconds: 3,
  });
  const expAuctionId = expiryAuctionRes.body.data.id;
  console.log("Created 3-second auction:", expAuctionId);
  console.log("Sleeping 4 seconds for expiry...");
  await new Promise((r) => setTimeout(r, 4000));

  const postExpiryBid = await request('POST', '/api/bids', {
    auctionId: expAuctionId,
    userId: 'user_prince',
    amount: 1000,
  });
  console.log("Post-Expiry Bid Status:", postExpiryBid.status);
  console.log("Post-Expiry Bid Body:", JSON.stringify(postExpiryBid.body, null, 2));
  results.test11 = { status: postExpiryBid.status, body: postExpiryBid.body };

  // TEST 9 — CONCURRENT BIDDING
  console.log("\n>>> EXECUTING TEST 9: CONCURRENT BIDDING");
  // Step 9.1: Burst of 6 concurrent bids (1000, 1100, 1200, 1300, 1400, 1500)
  const concurrentAuctionRes = await request('POST', '/api/auctions', {
    title: 'Concurrency Test Auction',
    startingPrice: 500,
    durationSeconds: 600,
  });
  const concAuctionId = concurrentAuctionRes.body.data.id;
  console.log("Created Concurrency Test Auction:", concAuctionId);

  const burstAmounts = [1000, 1100, 1200, 1300, 1400, 1500];
  console.log("Firing burst of 6 bids concurrently:", burstAmounts);
  const burstResults = await Promise.all(
    burstAmounts.map((amt, idx) =>
      request('POST', '/api/bids', {
        auctionId: concAuctionId,
        userId: `bidder_burst_${idx}`,
        amount: amt,
      })
    )
  );

  console.log("Burst Results:");
  burstResults.forEach((r, i) => {
    console.log(`  Bid ₹${burstAmounts[i]} -> Status: ${r.status}, outcome: ${r.body.status || r.body.reason}`);
  });

  const postBurstGet = await request('GET', `/api/auctions/${concAuctionId}`);
  console.log("Final Highest Bid After Burst:", postBurstGet.body.data.highestBid, "Bidder:", postBurstGet.body.data.highestBidder);

  return { results, finalBurst: postBurstGet.body.data };
}

runAllTests()
  .then((data) => {
    console.log("\n==================================================");
    console.log("ALL FUNCTIONAL ROUND 2 TESTS COMPLETED SUCCESSFULLY");
    console.log("==================================================");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
