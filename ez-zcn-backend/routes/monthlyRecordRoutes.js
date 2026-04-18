// ============================================
// PennyWise — Monthly Record Routes
// ============================================

const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const monthlyRecordController = require('../controllers/monthlyRecordController');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get current month's record (auto-creates if needed)
router.get('/current', monthlyRecordController.getCurrentRecord);

// Confirm or update this month's record (monthly check-in)
router.put('/confirm', monthlyRecordController.confirmRecord);

// Seed history from account creation to now (backfill)
router.post('/seed-history', monthlyRecordController.seedHistory);

module.exports = router;
