/**
 * 4-WARRIORS | SYNORA 10-Hour Hackathon
 * Standalone High-Performance Mock Backend
 * Simulates Redis Lua atomic bid engine & Express API
 * Zero external dependencies (pure Node.js)
 */

'use strict';

const http = require('http');
const url = require('url');

const PORT = parseInt(process.env.PORT, 10) || 4000;
const SIMULATE_RACE_BUG = process.argv.includes('--race-bug');

// In-memory state store mimicking Redis hashes
const auctions = new Map();

// Helper to seed an auction
function seedAuction(auctionId, overrides = {}) {
  const now = Date.now();
  const auction = {
    id: auctionId,
    title: overrides.title || `Auction ${auctionId}`,
    status: overrides.status || 'active',
    startTime: overrides.startTime || (now - 10000),
    endTime: overrides.endTime || (now + 60 * 60 * 1000), // 1 hour
    startingPrice: overrides.startingPrice || 0,
    highestBid: overrides.highestBid || 0,
    highestBidder: overrides.highestBidder || '',
    bidCount: overrides.bidCount || 0,
    createdAt: now,
  };
  auctions.set(auctionId, auction);
  return auction;
}

// Pre-seed default auction
seedAuction('auction-1', { highestBid: 100, highestBidder: 'seed-bot' });
seedAuction('auction-stress', { highestBid: 100, highestBidder: 'seed-bot' });
seedAuction('auction-race', { highestBid: 100, highestBidder: 'seed-bot' });
seedAuction('auction-ended', {
  highestBid: 500,
  highestBidder: 'early-bird',
  status: 'ended',
  endTime: Date.now() - 5000,
});

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        req.socket.destroy();
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(payload);
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    });
    return res.end();
  }

  // Health check
  if (method === 'GET' && pathname === '/health') {
    return sendJson(res, 200, { status: 'OK', uptime: process.uptime() });
  }

  // POST /api/bids/seed
  if (method === 'POST' && pathname === '/api/bids/seed') {
    try {
      const body = await parseJsonBody(req);
      const auctionId = body.auctionId || `auction-${Date.now()}`;
      const now = Date.now();
      const auction = seedAuction(auctionId, {
        title: body.title,
        durationMs: body.durationMs,
        endTime: now + (body.durationMs || 3600000),
        startingPrice: body.startingPrice || 0,
        highestBid: body.highestBid || 0,
        status: body.status || 'active',
      });
      return sendJson(res, 200, { message: 'Auction seeded', auction });
    } catch (err) {
      return sendJson(res, 400, { status: 'ERROR', message: err.message });
    }
  }

  // GET /api/bids/:auctionId
  if (method === 'GET' && pathname.startsWith('/api/bids/')) {
    const auctionId = pathname.replace('/api/bids/', '');
    const auction = auctions.get(auctionId);
    if (!auction) {
      return sendJson(res, 404, { status: 'ERROR', message: 'Auction not found' });
    }
    return sendJson(res, 200, auction);
  }

  // POST /api/bids — Atomic Bid Validation (Simulates Redis Lua)
  if (method === 'POST' && (pathname === '/api/bids' || pathname === '/api/bids/')) {
    let body;
    try {
      body = await parseJsonBody(req);
    } catch (err) {
      return sendJson(res, 400, { status: 'REJECTED', message: 'Malformed JSON payload' });
    }

    const { auctionId, bidderId, amount } = body;

    // 1. Basic validation
    if (!auctionId || typeof auctionId !== 'string') {
      return sendJson(res, 400, { status: 'REJECTED', message: 'auctionId is required' });
    }
    if (!bidderId || typeof bidderId !== 'string') {
      return sendJson(res, 400, { status: 'REJECTED', message: 'bidderId is required' });
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return sendJson(res, 400, { status: 'REJECTED', message: 'amount must be a positive number' });
    }

    // 2. Fetch auction
    let auction = auctions.get(auctionId);
    if (!auction) {
      // Auto-seed for convenience if missing
      auction = seedAuction(auctionId);
    }

    const nowMs = Date.now();

    // If simulating race bug (non-atomic read-then-write)
    if (SIMULATE_RACE_BUG) {
      const readHighest = auction.highestBid;
      const readBidder = auction.highestBidder;
      // Introduce an async gap where another concurrent request can read the same state
      return setTimeout(() => {
        if (numAmount <= readHighest) {
          return sendJson(res, 400, {
            status: 'REJECTED',
            message: `Bid too low — must be at least ${readHighest + 1}`,
            highestBid: auction.highestBid,
            highestBidder: auction.highestBidder,
            auctionId,
            bidderId,
            amount: numAmount,
            ts: Date.now(),
          });
        }
        // Bug: overwrites without atomic compare!
        auction.highestBid = numAmount;
        auction.highestBidder = bidderId;
        auction.bidCount++;
        return sendJson(res, 200, {
          status: 'ACCEPTED',
          message: 'Bid accepted',
          highestBid: auction.highestBid,
          highestBidder: auction.highestBidder,
          auctionId,
          bidderId,
          amount: numAmount,
          ts: Date.now(),
        });
      }, Math.floor(Math.random() * 5));
    }

    // ATOMIC LUA SIMULATION (Single-threaded event-loop execution guarantees atomicity)
    // 3. Status check
    if (auction.status !== 'active') {
      return sendJson(res, 400, {
        status: 'REJECTED',
        message: `Auction is not active (status: ${auction.status})`,
        highestBid: auction.highestBid,
        highestBidder: auction.highestBidder,
      });
    }

    // 4. Timing checks
    if (nowMs < auction.startTime) {
      return sendJson(res, 400, {
        status: 'REJECTED',
        message: 'Auction has not started yet',
        highestBid: auction.highestBid,
        highestBidder: auction.highestBidder,
      });
    }
    if (nowMs > auction.endTime) {
      auction.status = 'ended';
      return sendJson(res, 400, {
        status: 'REJECTED',
        message: 'Auction has ended',
        highestBid: auction.highestBid,
        highestBidder: auction.highestBidder,
      });
    }

    // 5. Highest bid comparison
    const minBid = auction.highestBid + 1;
    if (numAmount < minBid) {
      return sendJson(res, 400, {
        status: 'REJECTED',
        message: `Bid too low — must be at least ${minBid}`,
        highestBid: auction.highestBid,
        highestBidder: auction.highestBidder,
        auctionId,
        bidderId,
        amount: numAmount,
        ts: nowMs,
      });
    }

    // 6. Atomic state update
    auction.highestBid = numAmount;
    auction.highestBidder = bidderId;
    auction.bidCount++;

    return sendJson(res, 200, {
      status: 'ACCEPTED',
      message: 'Bid accepted',
      highestBid: auction.highestBid,
      highestBidder: auction.highestBidder,
      auctionId,
      bidderId,
      amount: numAmount,
      ts: nowMs,
    });
  }

  // Not found
  return sendJson(res, 404, { status: 'ERROR', message: 'Route not found' });
});

server.listen(PORT, () => {
  console.log(`[Mock Backend] Running on http://localhost:${PORT}`);
  console.log(`[Mock Backend] Mode: ${SIMULATE_RACE_BUG ? 'WARNING: RACE-BUG SIMULATION ENABLED' : 'STRICT ATOMIC (LUA EMULATION)'}`);
  console.log(`[Mock Backend] Ready to accept bids at POST /api/bids`);
});

// Graceful termination
process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
