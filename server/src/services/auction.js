'use strict';
const fs          = require('fs');
const path        = require('path');
const { v4: uuidv4 } = require('uuid');
const redis       = require('../redis/client');

// Load Lua script once at startup
const LUA_SCRIPT  = fs.readFileSync(
  path.join(__dirname, '../redis/bidScript.lua'),
  'utf8'
);

// ── Auction seed helper (creates a test auction if none exists) ───────────────
async function seedAuction(auctionId, overrides = {}) {
  const key      = `auction:${auctionId}`;
  const exists   = await redis.exists(key);
  if (exists) return;

  const now      = Date.now();
  const defaults = {
    id           : auctionId,
    title        : 'Test Auction',
    description  : 'Hackathon demo auction',
    status       : 'active',
    startTime    : now,
    endTime      : now + 60 * 60 * 1000, // 1 hour from now
    startingPrice: 0,
    highestBid   : 0,
    highestBidder: '',
    bidCount     : 0,
    createdAt    : now,
  };

  await redis.hmset(key, { ...defaults, ...overrides });
  console.log(`[Auction] Seeded auction:${auctionId}`);
}

// ── Place bid (atomic via Lua EVAL) ─────────────────────────────────────────
async function placeBid(auctionId, bidderId, amount) {
  const key    = `auction:${auctionId}`;
  const nowMs  = Date.now();

  const result = await redis.eval(
    LUA_SCRIPT,
    1,           // number of KEYS
    key,         // KEYS[1]
    amount,      // ARGV[1]
    bidderId,    // ARGV[2]
    nowMs        // ARGV[3]
  );

  // result = [ status, message, highestBid, highestBidder ]
  return {
    status        : result[0],
    message       : result[1],
    highestBid    : parseFloat(result[2]),
    highestBidder : result[3],
    auctionId,
    bidderId,
    amount        : parseFloat(amount),
    ts            : nowMs,
  };
}

// ── Get auction state ────────────────────────────────────────────────────────
async function getAuction(auctionId) {
  const data = await redis.hgetall(`auction:${auctionId}`);
  if (!data || Object.keys(data).length === 0) return null;
  return {
    ...data,
    highestBid   : parseFloat(data.highestBid   || 0),
    startingPrice: parseFloat(data.startingPrice || 0),
    startTime    : parseInt(data.startTime, 10),
    endTime      : parseInt(data.endTime,   10),
    bidCount     : parseInt(data.bidCount   || 0, 10),
  };
}

module.exports = { placeBid, getAuction, seedAuction };
