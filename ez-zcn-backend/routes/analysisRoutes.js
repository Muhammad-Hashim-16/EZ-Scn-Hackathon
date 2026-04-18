// ============================================
// PennyWise — Analysis Routes (hardened)
// ============================================

const express = require('express');
const { param } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validators');
const analysisController = require('../controllers/analysisController');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Full monthly analysis (cached 1 hour)
router.get('/monthly', analysisController.getMonthlyAnalysis);

// Full financial analysis (dashboard — compat alias)
router.get('/dashboard', analysisController.getDashboardAnalysis);

// Quick health badge
router.get('/quick-health', analysisController.getQuickHealth);

// History (last 6 months)
router.get('/history', analysisController.getHistory);

// Historical snapshot for a specific month
router.get(
  '/snapshot/:month',
  [
    param('month')
      .matches(/^\d{4}-\d{2}$/)
      .withMessage('Month format must be YYYY-MM.'),
    handleValidationErrors,
  ],
  analysisController.getSnapshot
);

// Last 12 months of trends
router.get('/trends', analysisController.getTrends);

// Force re-analyze
router.post('/refresh', analysisController.refreshAnalysis);

module.exports = router;
