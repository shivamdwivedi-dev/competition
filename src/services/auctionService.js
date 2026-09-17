const { v4: uuidv4 } = require('uuid');
const redis = require('../config/redis');
const { persistAuction, inMemoryStore } = require('../config/db');

async function createAuction(payload) {
  const {
    title,
    name,
    itemName,
    startingPrice,
    starting_price,
    price,
    initialPrice,
    durationSeconds,
    duration,
    durationMinutes,
    endTime,
    imageUrl,
    image,
    description,
    createdBy,
    userId,
    hostId,
  } = payload || {};

  const itemTitle = (title || name || itemName || '').toString().trim();
  if (!itemTitle) {
    throw new Error('Title or name is required and must be a non-empty string');
  }

  const rawStartingPrice = startingPrice !== undefined
    ? startingPrice
    : (starting_price !== undefined ? starting_price : (price !== undefined ? price : initialPrice));

  if (typeof rawStartingPrice === 'boolean') {
    throw new Error('startingPrice must be a non-negative number');
  }

  const numStartingPrice = Number(rawStartingPrice);
  if (isNaN(numStartingPrice) || !isFinite(numStartingPrice) || numStartingPrice < 0) {
    throw new Error('startingPrice must be a non-negative number');
  }

  const MAX_ALLOWED_PRICE = 10000000000;
  if (numStartingPrice > MAX_ALLOWED_PRICE || numStartingPrice > Number.MAX_SAFE_INTEGER) {
    throw new Error('startingPrice must not exceed ₹1,000 Crores');
  }

  const now = Date.now();
  let computedEndTime = null;

  if (endTime) {
    computedEndTime = new Date(endTime).getTime();
    if (isNaN(computedEndTime) || computedEndTime <= now) {
      throw new Error('endTime must be a valid future date/timestamp');
    }
  } else {
    const rawDuration = durationSeconds !== undefined
      ? durationSeconds
      : (duration !== undefined ? duration : (durationMinutes !== undefined ? Number(durationMinutes) * 60 : 300));

    const durSeconds = Number(rawDuration) || 300;
    if (durSeconds <= 0) {
      throw new Error('duration must be greater than 0');
    }
    computedEndTime = now + durSeconds * 1000;
  }

  const finalImageUrl = (imageUrl || image || '').toString().trim();
  const finalDesc = (description || '').toString().trim();
  const finalHost = (createdBy || userId || hostId || 'anonymous').toString().trim();

  const auctionId = uuidv4();
  const auctionKey = `auction:${auctionId}`;

  // Store in Redis Hash
  await redis.hmset(auctionKey, {
    id: auctionId,
    title: itemTitle,
    starting_price: numStartingPrice.toString(),
    highest_bid: '0',
    highest_bidder: '',
    end_time: computedEndTime.toString(),
    created_at: now.toString(),
    image_url: finalImageUrl,
    description: finalDesc,
    created_by: finalHost,
  });

  // Track auction in active set
  await redis.sadd('active_auctions', auctionId);

  const auctionData = {
    id: auctionId,
    title: itemTitle,
    name: itemTitle,
    startingPrice: numStartingPrice,
    highestBid: numStartingPrice,
    highestBidder: null,
    endTime: computedEndTime,
    createdAt: now,
    timeRemainingMs: Math.max(0, computedEndTime - now),
    isEnded: false,
    imageUrl: finalImageUrl,
    description: finalDesc,
    createdBy: finalHost,
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
    name: data.title,
    startingPrice,
    highestBid: highestBid > 0 ? highestBid : startingPrice,
    highestBidder: data.highest_bidder || null,
    endTime,
    createdAt: parseInt(data.created_at, 10),
    timeRemainingMs: Math.max(0, endTime - now),
    isEnded: now >= endTime,
    imageUrl: data.image_url || '',
    description: data.description || '',
    createdBy: data.created_by || '',
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
