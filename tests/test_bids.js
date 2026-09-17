const http = require('http');

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
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting Backend Verification Tests ---');

  try {
    // 1. Health check
    console.log('\n[Test 1] Health Check...');
    const health = await makeRequest('GET', '/health');
    console.log('Health Response:', health.body);
    if (health.status !== 200) throw new Error('Health check failed');

    // 2. Create Auction
    console.log('\n[Test 2] Create Auction...');
    const createRes = await makeRequest('POST', '/api/auctions', {
      title: 'Automated Test Auction',
      startingPrice: 500,
      durationSeconds: 120,
    });
    console.log('Auction Created:', createRes.body);
    const auctionId = createRes.body.data.id;

    // 3. Fetch Auction
    console.log('\n[Test 3] Fetch Auction Details...');
    const getRes = await makeRequest('GET', `/api/auctions/${auctionId}`);
    console.log('Fetched Auction:', getRes.body);

    // 4. Place Valid Bid
    console.log('\n[Test 4] Place Valid Bid (600)...');
    const bid1 = await makeRequest('POST', '/api/bids', {
      auctionId,
      userId: 'user_alice',
      amount: 600,
    });
    console.log('Bid 1 Result:', bid1.body);
    if (bid1.body.status !== 'ACCEPTED') throw new Error('Expected bid 1 to be accepted');

    // 5. Place Lower Bid (Should Reject)
    console.log('\n[Test 5] Place Lower Bid (550)...');
    const bidLower = await makeRequest('POST', '/api/bids', {
      auctionId,
      userId: 'user_bob',
      amount: 550,
    });
    console.log('Lower Bid Result:', bidLower.body);
    if (bidLower.body.status !== 'REJECTED' || bidLower.body.reason !== 'BID_TOO_LOW') {
      throw new Error('Expected lower bid to be rejected with BID_TOO_LOW');
    }

    // 6. Place Equal Bid (Should Reject)
    console.log('\n[Test 6] Place Equal Bid (600)...');
    const bidEqual = await makeRequest('POST', '/api/bids', {
      auctionId,
      userId: 'user_charlie',
      amount: 600,
    });
    console.log('Equal Bid Result:', bidEqual.body);
    if (bidEqual.body.status !== 'REJECTED' || bidEqual.body.reason !== 'BID_TOO_LOW') {
      throw new Error('Expected equal bid to be rejected with BID_TOO_LOW');
    }

    // 7. Place Invalid Bid (Negative/Zero)
    console.log('\n[Test 7] Place Invalid Bid (-10)...');
    const bidInvalid = await makeRequest('POST', '/api/bids', {
      auctionId,
      userId: 'user_dave',
      amount: -10,
    });
    console.log('Invalid Bid Result:', bidInvalid.body);
    if (bidInvalid.body.status !== 'REJECTED') {
      throw new Error('Expected invalid bid to be rejected');
    }

    // 8. Place Bid on Non-existent Auction
    console.log('\n[Test 8] Place Bid on Non-existent Auction...');
    const bidNonExistent = await makeRequest('POST', '/api/bids', {
      auctionId: '00000000-0000-0000-0000-000000000000',
      userId: 'user_eve',
      amount: 1000,
    });
    console.log('Non-existent Auction Bid Result:', bidNonExistent.body);
    if (bidNonExistent.body.reason !== 'AUCTION_NOT_FOUND') {
      throw new Error('Expected AUCTION_NOT_FOUND');
    }

    // 9. Concurrency Test: 10 Rapid Concurrent Bids
    console.log('\n[Test 9] Concurrency Test: 10 Concurrent Bids...');
    const concurrentAmounts = [650, 700, 680, 750, 720, 800, 790, 850, 810, 900];
    const promises = concurrentAmounts.map((amount, idx) =>
      makeRequest('POST', '/api/bids', {
        auctionId,
        userId: `concurrent_user_${idx + 1}`,
        amount,
      })
    );

    const concurrentResults = await Promise.all(promises);
    const acceptedBids = concurrentResults.filter((r) => r.body.status === 'ACCEPTED');
    console.log(`Accepted ${acceptedBids.length} out of ${concurrentAmounts.length} concurrent bids.`);

    // Verify final highest bid
    const finalAuction = await makeRequest('GET', `/api/auctions/${auctionId}`);
    console.log('Final Auction State:', finalAuction.body.data);
    if (finalAuction.body.data.highestBid !== 900) {
      throw new Error(`Expected highest bid to be 900, got ${finalAuction.body.data.highestBid}`);
    }

    // 10. Expired Auction Test
    console.log('\n[Test 10] Expired Auction Test...');
    const shortAuction = await makeRequest('POST', '/api/auctions', {
      title: 'Short 2-Second Auction',
      startingPrice: 100,
      durationSeconds: 2,
    });
    const shortId = shortAuction.body.data.id;
    console.log('Waiting 2.5 seconds for auction to expire...');
    await new Promise((r) => setTimeout(r, 2500));

    const expiredBid = await makeRequest('POST', '/api/bids', {
      auctionId: shortId,
      userId: 'user_late',
      amount: 500,
    });
    console.log('Expired Bid Result:', expiredBid.body);
    if (expiredBid.body.reason !== 'AUCTION_ENDED') {
      throw new Error('Expected AUCTION_ENDED');
    }

    console.log('\n========================================');
    console.log('🎉 ALL 10 TESTS PASSED SUCCESSFULLY!');
    console.log('========================================');
  } catch (err) {
    console.error('\n❌ Test Suite Failed:', err.message);
    process.exit(1);
  }
}

runTests();
