// ============================================
// PennyWise — Weekly Tracker Routes
// POST /api/weekly/entry
// GET  /api/weekly/entries
// GET  /api/weekly/current-week
// PUT  /api/weekly/opt-in
// ============================================

const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const weeklyController = require('../controllers/weeklyController');

const router = express.Router();

router.use(protect);

router.post('/entry', weeklyController.createEntry);
router.get('/entries', weeklyController.getEntries);
router.get('/current-week', weeklyController.getCurrentWeek);
router.put('/opt-in', weeklyController.toggleOptIn);

module.exports = router;
