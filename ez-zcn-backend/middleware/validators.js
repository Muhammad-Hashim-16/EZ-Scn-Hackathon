// ============================================
// PennyWise — Validation Rules
// Centralized express-validator chains for all routes
// ============================================

const { body, param, query } = require('express-validator');

// ── Shared validate middleware ──
const { validationResult } = require('express-validator');

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
      })),
    });
  }
  next();
}

// ── Income validators ──
const validateWorkProfile = [
  body('daily_work_hours')
    .isFloat({ min: 1, max: 16 })
    .withMessage('Daily work hours must be between 1 and 16.'),
  body('work_days_per_month')
    .isInt({ min: 1, max: 31 })
    .withMessage('Work days per month must be between 1 and 31.'),
  body('vehicle_type')
    .optional()
    .isString().trim()
    .isLength({ max: 50 }),
  body('fuel_type')
    .optional()
    .isString().trim()
    .isLength({ max: 50 }),
  handleValidationErrors,
];

const validateIncomeSource = [
  body('source_name')
    .trim()
    .notEmpty().withMessage('Source name is required.')
    .isLength({ max: 100 }).withMessage('Source name too long.'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number.'),
  body('frequency')
    .isIn(['monthly', 'weekly', 'bi-weekly', 'annual', 'one-time'])
    .withMessage('Invalid frequency.'),
  body('income_type')
    .isIn(['fixed', 'variable'])
    .withMessage('Income type must be fixed or variable.'),
  handleValidationErrors,
];

// ── Expense validators ──
const validateBulkExpenses = [
  body('expenses')
    .isArray({ min: 1 })
    .withMessage('Expenses array is required.'),
  body('expenses.*.category_id')
    .isUUID()
    .withMessage('Invalid category ID.'),
  body('expenses.*.monthly_amount')
    .isFloat({ min: 0 })
    .withMessage('Monthly amount must be non-negative.'),
  handleValidationErrors,
];

const validateUpdateExpense = [
  param('id')
    .isUUID()
    .withMessage('Invalid expense ID.'),
  body('monthly_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Monthly amount must be non-negative.'),
  handleValidationErrors,
];

const validateDeleteExpense = [
  param('id')
    .isUUID()
    .withMessage('Invalid expense ID.'),
  handleValidationErrors,
];

const validateCustomExpense = [
  body('custom_label')
    .trim()
    .notEmpty().withMessage('Label is required.')
    .isLength({ max: 255 }).withMessage('Label too long.'),
  body('monthly_amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be positive.'),
  handleValidationErrors,
];

// ── Goal validators ──
const validateCreateGoal = [
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
];

const validateContribution = [
  param('id')
    .isUUID()
    .withMessage('Invalid goal ID.'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Contribution must be positive.'),
  handleValidationErrors,
];

const validateDeleteGoal = [
  param('id')
    .isUUID()
    .withMessage('Invalid goal ID.'),
  handleValidationErrors,
];

// ── Weekly validators ──
const validateWeeklyEntry = [
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
];

// ── Analysis validators ──
const validateSnapshotMonth = [
  param('month')
    .matches(/^\d{4}-\d{2}$/)
    .withMessage('Invalid format. Use YYYY-MM.'),
  handleValidationErrors,
];

// ── Notification validators ──
const validateFcmToken = [
  body('token')
    .notEmpty().withMessage('Token is required.')
    .isString().withMessage('Token must be a string.')
    .isLength({ min: 10, max: 500 }).withMessage('Invalid token length.'),
  handleValidationErrors,
];

const validateNotifId = [
  param('id')
    .isUUID()
    .withMessage('Invalid notification ID.'),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validateWorkProfile,
  validateIncomeSource,
  validateBulkExpenses,
  validateUpdateExpense,
  validateDeleteExpense,
  validateCustomExpense,
  validateCreateGoal,
  validateContribution,
  validateDeleteGoal,
  validateWeeklyEntry,
  validateSnapshotMonth,
  validateFcmToken,
  validateNotifId,
};
