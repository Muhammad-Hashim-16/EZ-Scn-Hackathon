// ============================================
// PennyWise — Savings Goal Routes
// POST   /api/goals
// GET    /api/goals
// PUT    /api/goals/:id/contribute
// DELETE /api/goals/:id
// ============================================

const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const goalController = require('../controllers/goalController');

const router = express.Router();

router.use(protect);

router.post('/', goalController.createGoal);
router.get('/', goalController.getGoals);
router.put('/:id/contribute', goalController.contributeToGoal);
router.delete('/:id', goalController.deleteGoal);

module.exports = router;
