// ============================================
// PennyWise — Expense Routes
// GET    /api/expenses/categories
// POST   /api/expenses/bulk
// GET    /api/expenses
// PUT    /api/expenses/:id
// DELETE /api/expenses/:id
// POST   /api/expenses/custom
// ============================================

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const expenseController = require('../controllers/expenseController');

const router = express.Router();

// All routes are protected
router.use(protect);

// ──────────────────────────────────────────
// Validation error handler
// ──────────────────────────────────────────
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed.',
      code: 'VALIDATION_ERROR',
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  next();
}

// ──────────────────────────────────────────
// Validation: bulk expenses
// ──────────────────────────────────────────
const bulkValidation = [
  body('expenses')
    .isArray({ min: 1 })
    .withMessage('Expenses must be a non-empty array.'),

  body('expenses.*.category_id')
    .notEmpty().withMessage('Category ID is required for each expense.')
    .isUUID().withMessage('Category ID must be a valid UUID.'),

  body('expenses.*.monthly_amount')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Monthly amount must be a non-negative number.'),

  body('expenses.*.custom_label')
    .optional({ nullable: true })
    .isString(),

  body('expenses.*.area_of_living')
    .optional({ nullable: true })
    .isString(),

  body('expenses.*.grocery_area')
    .optional({ nullable: true })
    .isString(),

  body('expenses.*.notes')
    .optional({ nullable: true })
    .isString(),
];

// ──────────────────────────────────────────
// Validation: update expense
// ──────────────────────────────────────────
const updateValidation = [
  param('id')
    .isUUID().withMessage('Invalid expense ID.'),

  body('monthly_amount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Monthly amount must be a non-negative number.'),

  body('notes')
    .optional({ nullable: true })
    .isString(),

  body('custom_label')
    .optional({ nullable: true })
    .isString(),

  body('area_of_living')
    .optional({ nullable: true })
    .isString(),

  body('grocery_area')
    .optional({ nullable: true })
    .isString(),
];

// ──────────────────────────────────────────
// Validation: delete expense
// ──────────────────────────────────────────
const deleteValidation = [
  param('id')
    .isUUID().withMessage('Invalid expense ID.'),
];

// ──────────────────────────────────────────
// Validation: custom expense
// ──────────────────────────────────────────
const customValidation = [
  body('custom_label')
    .trim()
    .notEmpty().withMessage('Custom label is required.')
    .isLength({ min: 2, max: 255 }).withMessage('Custom label must be between 2 and 255 characters.'),

  body('monthly_amount')
    .notEmpty().withMessage('Monthly amount is required.')
    .isFloat({ gt: 0 }).withMessage('Monthly amount must be greater than 0.'),

  body('notes')
    .optional({ nullable: true })
    .isString(),
];

// ============================================
// ROUTES
// ============================================

// Categories tree (no validation needed)
router.get('/categories', expenseController.getCategories);

// Bulk upsert (onboarding)
router.post(
  '/bulk',
  bulkValidation,
  handleValidationErrors,
  expenseController.bulkUpsertExpenses
);

// List all expenses
router.get('/', expenseController.getExpenses);

// Custom expense
router.post(
  '/custom',
  customValidation,
  handleValidationErrors,
  expenseController.addCustomExpense
);

// Update single expense
router.put(
  '/:id',
  updateValidation,
  handleValidationErrors,
  expenseController.updateExpense
);

// Redistribute expenses proportionally
const redistributeValidation = [
  body('new_total_expenses')
    .notEmpty().withMessage('new_total_expenses is required.')
    .isFloat({ gt: 0 }).withMessage('new_total_expenses must be greater than 0.'),
];

router.post(
  '/redistribute',
  redistributeValidation,
  handleValidationErrors,
  expenseController.redistributeExpenses
);

// Soft delete
router.delete(
  '/:id',
  deleteValidation,
  handleValidationErrors,
  expenseController.deleteExpense
);

module.exports = router;
