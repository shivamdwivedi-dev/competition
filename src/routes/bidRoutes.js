const express = require('express');
const router = express.Router();
const bidService = require('../services/bidService');

// POST /api/bids - Atomically place a bid
router.post('/', async (req, res) => {
  const { auctionId, userId, amount } = req.body;
  const result = await bidService.processBid({ auctionId, userId, amount });

  res.status(result.statusCode || 200).json(result);
});

module.exports = router;
