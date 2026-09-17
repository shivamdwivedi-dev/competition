const { v4: uuidv4 } = require('uuid');
const redis = require('../config/redis');
const { persistAuction, inMemoryStore } = require('../config/db');

async function createAuction({ title, startingPrice, durationSeconds, endTime }) {
  if (!title || typeof title !== 'string' || title.trim() === '') {
    throw new Error('Title is required and must be a non-empty string');
  }

  if (typeof startingPrice === 'boolean') {
    throw new Error('startingPrice must be a non-negative number');
  }

  const numStartingPrice = Number(startingPrice);
  if (isNaN(numStartingPrice) || !isFinite(numStartingPrice) || numStartingPrice < 0) {
    throw new Error('startingPrice must be a non-negative number');
  }

  const now = Date.now();
  let computedEndTime = null;

  if (endTime) {
    computedEndTime = new Date(endTime).getTime();
    if (isNaN(computedEndTime) || computedEndTime <= now) {
      throw new Error('endTime must be a valid future date/timestamp');
    }
  } else {
    const duration = Number(durationSeconds) || 300; // Default 5 minutes
    if (duration <= 0) {
      throw new Error('durationSeconds must be greater than 0');
    }
    computedEndTime = now + duration * 1000;
  }

  const auctionId = uuidv4();
  const auctionKey = `auction:${auctionId}`;

  // Store in Redis Hash
  await redis.hmset(auctionKey, {
    id: auctionId,
    title: title.trim(),
    starting_price: numStartingPrice.toString(),
    highest_bid: '0',
    highest_bidder: '',
    end_time: computedEndTime.toString(),
    created_at: now.toString(),
  });

  // Track auction in active set
  await redis.sadd('active_auctions', auctionId);

  const auctionData = {
    id: auctionId,
    title: title.trim(),
    startingPrice: numStartingPrice,
    highestBid: 0,
    highestBidder: null,
    endTime: computedEndTime,
    createdAt: now,
    timeRemainingMs: Math.max(0, computedEndTime - now),
    isEnded: false,
  };

  // Asynchronously persist to database
  persistAuction(auctionData).catch((err) => {
    console.error(`[AuctionService] Database persist failed for ${auctionId}:`, err.message);
  });

  return auctionData;
}

async function getAuction(auctionId) {
  if (!auctionId) {
    throw new Error('Auction ID is required');
  }

  const auctionKey = `auction:${auctionId}`;
  const data = await redis.hgetall(auctionKey);

  if (!data || Object.keys(data).length === 0) {
    // Check fallback store if exists
    const fallback = inMemoryStore.auctions.get(auctionId);
    if (!fallback) {
      return null;
    }
    return fallback;
  }

  const now = Date.now();
  const endTime = parseInt(data.end_time, 10);
  const highestBid = parseFloat(data.highest_bid) || 0;
  const startingPrice = parseFloat(data.starting_price) || 0;

  // Retrieve last 50 bids from Redis list
  const rawBids = await redis.lrange(`${auctionKey}:bids`, 0, 49);
  const recentBids = rawBids.map((b) => {
    try {
      return JSON.parse(b);
    } catch {
      return b;
    }
  });

  return {
    id: data.id || auctionId,
    title: data.title,
    startingPrice,
    highestBid: highestBid > 0 ? highestBid : startingPrice,
    highestBidder: data.highest_bidder || null,
    endTime,
    createdAt: parseInt(data.created_at, 10),
    timeRemainingMs: Math.max(0, endTime - now),
    isEnded: now >= endTime,
    recentBids,
  };
}

async function listAuctions() {
  const auctionIds = await redis.smembers('active_auctions');
  const auctionPromises = auctionIds.map((id) => getAuction(id));
  const rawResults = await Promise.all(auctionPromises);
  const results = rawResults.filter(Boolean);

  // Sort by active first, then closest end time
  results.sort((a, b) => {
    if (a.isEnded !== b.isEnded) return a.isEnded ? 1 : -1;
    return a.endTime - b.endTime;
  });

  return results;
}

module.exports = {
  createAuction,
  getAuction,
  listAuctions,
};
