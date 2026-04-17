// ============================================
// PennyWise — Inflation Routes
// GET  /api/inflation/latest
// GET  /api/inflation/history/:item
// GET  /api/inflation/impact
// ============================================

const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const inflationController = require('../controllers/inflationController');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Current prices (fast DB read)
router.get('/latest', inflationController.getLatest);

// 30-day price history for a specific item
router.get('/history/:item', inflationController.getHistory);

// Per-user inflation impact analysis
router.get('/impact', inflationController.getImpact);

module.exports = router;
