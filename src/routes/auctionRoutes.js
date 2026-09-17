const express = require('express');
const router = express.Router();
const auctionService = require('../services/auctionService');
const { getAuditBids } = require('../config/db');

// POST /api/auctions - Create a new auction
router.post('/', async (req, res, next) => {
  try {
    const { title, startingPrice, durationSeconds, endTime, imageUrl, description } = req.body;
    const auction = await auctionService.createAuction({
      title,
      startingPrice,
      durationSeconds,
      endTime,
      imageUrl,
      description,
    });

    res.status(201).json({
      success: true,
      data: auction,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

// GET /api/auctions - List active auctions
router.get('/', async (req, res, next) => {
  try {
    const auctions = await auctionService.listAuctions();
    res.json({
      success: true,
      count: auctions.length,
      data: auctions,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auctions/:id - Get auction details and current live state
router.get('/:id', async (req, res, next) => {
  try {
    const auction = await auctionService.getAuction(req.params.id);
    if (!auction) {
      return res.status(404).json({
        success: false,
        error: 'Auction not found',
      });
    }

    res.json({
      success: true,
      data: auction,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auctions/:id/bids - Get audit bid history from database
router.get('/:id/bids', async (req, res, next) => {
  try {
    const bids = await getAuditBids(req.params.id);
    res.json({
      success: true,
      count: bids.length,
      data: bids,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
