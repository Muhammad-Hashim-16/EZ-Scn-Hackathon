// ============================================
// PennyWise — Weekly Tracker Routes (hardened)
// POST /api/weekly/entry    (rate limited: 10/day/user)
// GET  /api/weekly/entries
// GET  /api/weekly/current-week
// PUT  /api/weekly/opt-in
// ============================================

const express = require('express');
const { body, query } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validators');
const weeklyController = require('../controllers/weeklyController');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Per-user rate limit for weekly entry creation: 10/day
const weeklyEntryLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    success: false,
    error: 'Daily limit reached for weekly entries. Try again tomorrow.',
  },
});

// Create/update weekly entries
router.post(
  '/entry',
  weeklyEntryLimiter,
  [
    body('week_start_date')
      .notEmpty().withMessage('Week start date is required.')
      .isISO8601().withMessage('Invalid date format.'),
    body('entries')
      .isArray({ min: 1 })
      .withMessage('At least one entry is required.'),
    body('entries.*.amount')
      .isFloat({ min: 0 })
      .withMessage('Amount must be non-negative.'),
    handleValidationErrors,
  ],
  weeklyController.createEntry
);

// Get entries for a month
router.get(
  '/entries',
  [
    query('month')
      .optional()
      .matches(/^\d{4}-\d{2}$/)
      .withMessage('Month format must be YYYY-MM.'),
    handleValidationErrors,
  ],
  weeklyController.getEntries
);

// Get current week
router.get('/current-week', weeklyController.getCurrentWeek);

// Opt in/out
router.put(
  '/opt-in',
  [
    body('opt_in')
      .isBoolean()
      .withMessage('opt_in must be true or false.'),
    handleValidationErrors,
  ],
  weeklyController.toggleOptIn
);

module.exports = router;
