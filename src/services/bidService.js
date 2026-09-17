const { v4: uuidv4 } = require('uuid');
const redis = require('../config/redis');
const { persistBidAudit } = require('../config/db');
const { broadcastBidUpdate } = require('../sockets/auctionSocket');

async function processBid({ auctionId, userId, amount }) {
  // 1. Basic validation
  if (!auctionId || typeof auctionId !== 'string' || auctionId.trim() === '') {
    return {
      success: false,
      statusCode: 400,
      status: 'REJECTED',
      reason: 'INVALID_AUCTION_ID',
      message: 'auctionId is required and must be a non-empty string',
    };
  }

  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    return {
      success: false,
      statusCode: 400,
      status: 'REJECTED',
      reason: 'INVALID_USER_ID',
      message: 'userId is required',
    };
  }

  if (typeof amount === 'boolean') {
    return {
      success: false,
      statusCode: 400,
      status: 'REJECTED',
      reason: 'INVALID_BID',
      message: 'amount must be a valid positive number',
    };
  }

  const MAX_ALLOWED_BID = 10000000000; // ₹1,000 Crores maximum system limit

  const numAmount = Number(amount);
  if (isNaN(numAmount) || !isFinite(numAmount) || numAmount <= 0) {
    return {
      success: false,
      statusCode: 400,
      status: 'REJECTED',
      reason: 'INVALID_BID',
      message: 'amount must be a valid positive number',
    };
  }

  if (numAmount > MAX_ALLOWED_BID || numAmount > Number.MAX_SAFE_INTEGER) {
    return {
      success: false,
      statusCode: 400,
      status: 'REJECTED',
      reason: 'BID_EXCEEDS_MAX_LIMIT',
      message: 'Bid amount must be a positive number under ₹1,000 Crores.',
    };
  }

  const bidId = uuidv4();
  const now = Date.now();
  const cleanAuctionId = auctionId.trim();
  const auctionKey = `auction:${cleanAuctionId}`;

  try {
    // 2. Execute Atomic Redis Lua Script
    const rawResult = await redis.atomicPlaceBid(
      auctionKey,
      userId.trim(),
      numAmount.toString(),
      now.toString(),
      bidId
    );

    const result = typeof rawResult === 'string' ? JSON.parse(rawResult) : rawResult;

    // 3. Handle ACCEPTED Bid
    if (result.status === 'ACCEPTED') {
      const responsePayload = {
        success: true,
        statusCode: 200,
        status: 'ACCEPTED',
        auctionId,
        highestBid: result.currentBid,
        highestBidder: result.highestBidder,
        timestamp: result.timestamp,
      };

      // Broadcast immediately to Socket.IO
      broadcastBidUpdate({
        auctionId,
        highestBid: result.currentBid,
        highestBidder: result.highestBidder,
        timestamp: result.timestamp,
      });

      // Async cold storage persistence (non-blocking for ultra-low latency)
      persistBidAudit({
        id: bidId,
        auctionId,
        userId: userId.trim(),
        amount: numAmount,
        status: 'ACCEPTED',
        timestamp: result.timestamp,
      }).catch((err) => {
        console.error(`[BidService] Failed to persist accepted bid audit ${bidId}:`, err.message);
      });

      return responsePayload;
    }

    // 4. Handle REJECTED Bid
    let httpStatusCode = 400;
    if (result.reason === 'AUCTION_NOT_FOUND') {
      httpStatusCode = 404;
    } else if (result.reason === 'BID_TOO_LOW' || result.reason === 'AUCTION_ENDED') {
      httpStatusCode = 409; // Conflict
    }

    // Async record rejected attempt for audit logs
    persistBidAudit({
      id: bidId,
      auctionId,
      userId: userId.trim(),
      amount: numAmount,
      status: `REJECTED_${result.reason}`,
      timestamp: now,
    }).catch((err) => {
      console.error(`[BidService] Failed to persist rejected bid audit:`, err.message);
    });

    return {
      success: false,
      statusCode: httpStatusCode,
      status: 'REJECTED',
      reason: result.reason,
      currentBid: result.currentBid,
      highestBidder: result.highestBidder,
      timestamp: now,
    };
  } catch (err) {
    console.error('[BidService] Unexpected error processing bid:', err.message);
    return {
      success: false,
      statusCode: 500,
      status: 'ERROR',
      reason: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to process bid atomically',
    };
  }
}

module.exports = {
  processBid,
};
