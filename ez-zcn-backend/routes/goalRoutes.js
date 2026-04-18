// ============================================
// PennyWise — Savings Goal Routes (v2)
// POST   /api/goals
// GET    /api/goals
// POST   /api/goals/:id/transfer
// GET    /api/goals/:id/transfers
// DELETE /api/goals/:id
// ============================================

const express = require('express');
const { body, param } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validators');
const goalController = require('../controllers/goalController');

const router = express.Router();

router.use(protect);

// Create goal
router.post(
  '/',
  [
    body('goal_name')
      .trim()
      .notEmpty().withMessage('Goal name is required.')
      .isLength({ max: 255 }).withMessage('Goal name too long.'),
    body('target_amount')
      .isFloat({ min: 1 })
      .withMessage('Target amount must be at least 1.'),
    body('target_months')
      .isInt({ min: 1, max: 120 })
      .withMessage('Target months must be between 1 and 120.'),
    handleValidationErrors,
  ],
  goalController.createGoal
);

// List goals
router.get('/', goalController.getGoals);

// Transfer from savings to goal
router.post(
  '/:id/transfer',
  [
    param('id').isUUID().withMessage('Invalid goal ID.'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Transfer amount must be positive.'),
    handleValidationErrors,
  ],
  goalController.transferToGoal
);

// Transfer history for a goal
router.get(
  '/:id/transfers',
  [
    param('id').isUUID().withMessage('Invalid goal ID.'),
    handleValidationErrors,
  ],
  goalController.getGoalTransfers
);

// Delete goal
router.delete(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid goal ID.'),
    handleValidationErrors,
  ],
  goalController.deleteGoal
);

module.exports = router;
