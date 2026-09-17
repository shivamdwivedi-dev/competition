const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const auctionService = require('../services/auctionService');
const { getAuditBids } = require('../config/db');

// Configure upload directory
const uploadDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, 'item-' + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Middleware helper that handles multer upload optionally without breaking JSON requests
function optionalUpload(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next();
  });
}

// POST /api/auctions/upload - Standalone image upload endpoint
router.post('/upload', optionalUpload, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No image file uploaded' });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.status(201).json({ success: true, imageUrl, filename: req.file.filename });
});

// POST /api/auctions - Create/Host a new auction (accepts JSON or multipart/form-data with item image)
router.post('/', optionalUpload, async (req, res, next) => {
  try {
    const payload = { ...req.body };
    if (req.file) {
      payload.imageUrl = `/uploads/${req.file.filename}`;
    }

    const auction = await auctionService.createAuction(payload);

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
