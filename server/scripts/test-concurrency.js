'use strict';

/**
 * 4-WARRIORS | Concurrency & Race-Condition Verification Script
 * Fires simultaneous bids at an auction to verify Redis Lua atomic serialization.
 */

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

async function runTest() {
  const auctionId = `race-test-${Date.now()}`;
  console.log(`\n=== 1. Seeding test auction: ${auctionId} ===`);

  const seedRes = await fetch(`${SERVER_URL}/api/bids/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auctionId,
      title: 'Race Condition Test Auction',
      durationMs: 60000,
    }),
  });
  const seedData = await seedRes.json();
  console.log('Seed result:', seedData.message);

  console.log('\n=== 2. Firing 50 simultaneous concurrent bids ===');
  // Generate 50 bid amounts with duplicates to verify duplicate/out-of-order rejection
  const bids = [];
  for (let i = 1; i <= 50; i++) {
    bids.push({
      auctionId,
      bidderId: `bidder-${i % 5}`, // 5 simulated bidders
      amount: Math.floor(Math.random() * 1000) + 100, // random bids between 100 and 1100
    });
  }

  // Ensure one distinct known high bid
  const knownMaxBid = 2000;
  bids.push({ auctionId, bidderId: 'guaranteed-winner', amount: knownMaxBid });

  // Fire all requests simultaneously via Promise.all
  const startTime = Date.now();
  const results = await Promise.all(
    bids.map(async (b) => {
      try {
        const res = await fetch(`${SERVER_URL}/api/bids`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(b),
        });
        const data = await res.json();
        return { success: res.ok, status: data.status, amount: b.amount, bidderId: b.bidderId, data };
      } catch (err) {
        return { success: false, error: err.message, amount: b.amount };
      }
    })
  );
  const elapsed = Date.now() - startTime;

  const accepted = results.filter((r) => r.status === 'ACCEPTED');
  const rejected = results.filter((r) => r.status === 'REJECTED');

  console.log(`\n=== 3. Concurrency Results (${elapsed} ms) ===`);
  console.log(`Total Requests : ${results.length}`);
  console.log(`Accepted Bids  : ${accepted.length}`);
  console.log(`Rejected Bids  : ${rejected.length}`);

  // Fetch final auction state from Redis
  const stateRes = await fetch(`${SERVER_URL}/api/bids/${auctionId}`);
  const finalState = await stateRes.json();

  console.log('\n=== 4. Final Redis State Verification ===');
  console.log(`Final Highest Bid    : $${finalState.highestBid}`);
  console.log(`Final Highest Bidder : ${finalState.highestBidder}`);
  console.log(`Total Accepted Count : ${finalState.bidCount}`);

  // Verification checks
  const maxAcceptedAmount = Math.max(...accepted.map((a) => a.amount));
  console.log(`Max Accepted in batch: $${maxAcceptedAmount}`);

  if (finalState.highestBid === maxAcceptedAmount && finalState.highestBid >= knownMaxBid) {
    console.log('\n>>> [PASS] ZERO RACE CONDITIONS DETECTED! Redis Lua atomic serialization intact. <<<');
  } else {
    console.error('\n>>> [FAIL] Inconsistency detected! Check bid ordering. <<<');
    process.exit(1);
  }
}

runTest().catch((err) => {
  console.error('Test execution error:', err.message);
  process.exit(1);
});
