'use strict';
const express = require('express');
const router  = express.Router();
const { placeBid, getAuction, seedAuction } = require('../services/auction');

// ── POST /api/bids ────────────────────────────────────────────────────────────
// Body: { auctionId: string, bidderId: string, amount: number }
router.post('/', async (req, res) => {
  const { auctionId, bidderId, amount } = req.body;

  // ── Basic input validation (before hitting Redis) ─────────────────────────
  if (!auctionId || typeof auctionId !== 'string') {
    return res.status(400).json({ status: 'REJECTED', message: 'auctionId is required' });
  }
  if (!bidderId || typeof bidderId !== 'string') {
    return res.status(400).json({ status: 'REJECTED', message: 'bidderId is required' });
  }
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ status: 'REJECTED', message: 'amount must be a positive number' });
  }

  try {
    const result = await placeBid(auctionId, bidderId, numAmount);

    // ── Broadcast via Socket.IO if ACCEPTED ──────────────────────────────────
    if (result.status === 'ACCEPTED') {
      req.io.to(`auction:${auctionId}`).emit('bid:accepted', {
        auctionId     : result.auctionId,
        bidderId      : result.bidderId,
        amount        : result.amount,
        highestBid    : result.highestBid,
        highestBidder : result.highestBidder,
        ts            : result.ts,
      });
    }

    const httpStatus = result.status === 'ACCEPTED' ? 200 : 400;
    return res.status(httpStatus).json(result);

  } catch (err) {
    console.error('[POST /api/bids] Error:', err.message);
    return res.status(500).json({ status: 'ERROR', message: 'Internal server error' });
  }
});

// ── GET /api/bids/:auctionId — current state ──────────────────────────────────
router.get('/:auctionId', async (req, res) => {
  const { auctionId } = req.params;
  try {
    const auction = await getAuction(auctionId);
    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }
    return res.json(auction);
  } catch (err) {
    console.error('[GET /api/bids/:id] Error:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// ── POST /api/bids/seed — create a test auction ───────────────────────────────
// Only for dev/demo — remove or guard in production
router.post('/seed', async (req, res) => {
  const { auctionId, durationMs, title } = req.body;
  if (!auctionId) {
    return res.status(400).json({ message: 'auctionId required' });
  }
  try {
    const now = Date.now();
    await seedAuction(auctionId, {
      title   : title || `Auction ${auctionId}`,
      endTime : now + (durationMs || 60 * 60 * 1000),
    });
    const auction = await getAuction(auctionId);
    return res.json({ message: 'Auction seeded', auction });
  } catch (err) {
    console.error('[POST /api/bids/seed] Error:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
