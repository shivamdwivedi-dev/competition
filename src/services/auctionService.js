const { v4: uuidv4 } = require('uuid');
const redis = require('../config/redis');
const { persistAuction, inMemoryStore } = require('../config/db');
const { broadcastAuctionCreated } = require('../sockets/auctionSocket');

async function createAuction({ title, startingPrice, durationSeconds, endTime, imageUrl, description }) {
  if (!title || typeof title !== 'string' || title.trim() === '') {
    throw new Error('Title is required and must be a non-empty string');
  }

  const numStartingPrice = Number(startingPrice);
  if (isNaN(numStartingPrice) || numStartingPrice < 0) {
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
  const itemImageUrl = imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== ''
    ? imageUrl.trim()
    : 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=1200&q=80';
  const itemDescription = description && typeof description === 'string' && description.trim() !== ''
    ? description.trim()
    : 'Live auction item managed atomically by Redis Lua script on Port 5001.';

  // Store in Redis Hash
  await redis.hmset(auctionKey, {
    id: auctionId,
    title: title.trim(),
    description: itemDescription,
    image_url: itemImageUrl,
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
    description: itemDescription,
    imageUrl: itemImageUrl,
    startingPrice: numStartingPrice,
    highestBid: 0,
    highestBidder: null,
    endTime: computedEndTime,
    createdAt: now,
    timeRemainingMs: Math.max(0, computedEndTime - now),
    isEnded: false,
  };

  // Broadcast to all connected clients immediately
  broadcastAuctionCreated(auctionData);

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
    description: data.description || 'Live auction item managed atomically by Redis Lua script on Port 5001.',
    imageUrl: data.image_url || data.imageUrl || 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=1200&q=80',
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
  const results = [];

  for (const id of auctionIds) {
    const auction = await getAuction(id);
    if (auction) {
      results.push(auction);
    }
  }

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
