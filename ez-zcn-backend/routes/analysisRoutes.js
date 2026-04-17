// ============================================
// PennyWise — Analysis Routes
// GET  /api/analysis/dashboard
// GET  /api/analysis/snapshot/:month
// GET  /api/analysis/trends
// POST /api/analysis/refresh
// ============================================

const express = require('express');
const { param } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const analysisController = require('../controllers/analysisController');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Full financial analysis (dashboard)
router.get('/dashboard', analysisController.getDashboardAnalysis);

// Historical snapshot for a specific month
router.get(
  '/snapshot/:month',
  param('month')
    .matches(/^\d{4}-\d{2}$/)
    .withMessage('Month format must be YYYY-MM.'),
  analysisController.getSnapshot
);

// Last 12 months of trends
router.get('/trends', analysisController.getTrends);

// Force re-analyze
router.post('/refresh', analysisController.refreshAnalysis);

module.exports = router;
