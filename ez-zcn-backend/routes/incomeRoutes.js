// ============================================
// PennyWise — Income Routes
// POST /api/income/work-profile
// GET  /api/income/work-profile
// POST /api/income/sources
// GET  /api/income/sources
// DELETE /api/income/sources/:id
// ============================================

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const incomeController = require('../controllers/incomeController');

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
// Work Profile validation
// ──────────────────────────────────────────
const workProfileValidation = [
  body('daily_work_hours')
    .notEmpty().withMessage('Daily work hours is required.')
    .isFloat({ min: 0.5, max: 24 }).withMessage('Daily work hours must be between 0.5 and 24.'),

  body('work_days_per_month')
    .notEmpty().withMessage('Work days per month is required.')
    .isInt({ min: 1, max: 31 }).withMessage('Work days per month must be between 1 and 31.'),

  body('vehicle_type')
    .notEmpty().withMessage('Vehicle type is required.')
    .isIn(['car', 'motorcycle', 'public', 'wfh'])
    .withMessage('Vehicle type must be one of: car, motorcycle, public, wfh.'),

  body('fuel_type')
    .notEmpty().withMessage('Fuel type is required.')
    .isIn(['petrol', 'diesel', 'cng', 'electric'])
    .withMessage('Fuel type must be one of: petrol, diesel, cng, electric.'),

  body('vehicle_fuel_avg')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Vehicle fuel average must be a positive number.'),

  body('home_address')
    .optional({ nullable: true })
    .isString(),

  body('office_address')
    .optional({ nullable: true })
    .isString(),
];

// ──────────────────────────────────────────
// Income Source validation
// ──────────────────────────────────────────
const incomeSourceValidation = [
  body('source_name')
    .trim()
    .notEmpty().withMessage('Source name is required.')
    .isLength({ min: 2, max: 255 }).withMessage('Source name must be between 2 and 255 characters.'),

  body('amount')
    .notEmpty().withMessage('Amount is required.')
    .isFloat({ gt: 0 }).withMessage('Amount must be greater than 0.'),

  body('frequency')
    .notEmpty().withMessage('Frequency is required.')
    .isIn(['monthly', 'irregular'])
    .withMessage('Frequency must be either "monthly" or "irregular".'),

  body('income_type')
    .notEmpty().withMessage('Income type is required.')
    .isIn(['fixed', 'variable'])
    .withMessage('Income type must be either "fixed" or "variable".'),

  body('expected_month_day')
    .optional({ nullable: true })
    .isInt({ min: 1, max: 31 }).withMessage('Expected month day must be between 1 and 31.'),

  body('notes')
    .optional({ nullable: true })
    .isString(),
];

// ──────────────────────────────────────────
// Delete param validation
// ──────────────────────────────────────────
const deleteValidation = [
  param('id')
    .isUUID().withMessage('Invalid income source ID.'),
];

// ============================================
// WORK PROFILE ROUTES
// ============================================

router.post(
  '/work-profile',
  workProfileValidation,
  handleValidationErrors,
  incomeController.upsertWorkProfile
);

router.get(
  '/work-profile',
  incomeController.getWorkProfile
);

// ============================================
// INCOME SOURCE ROUTES
// ============================================

router.post(
  '/sources',
  incomeSourceValidation,
  handleValidationErrors,
  incomeController.createIncomeSource
);

router.get(
  '/sources',
  incomeController.getIncomeSources
);

router.delete(
  '/sources/:id',
  deleteValidation,
  handleValidationErrors,
  incomeController.deleteIncomeSource
);

// ============================================
// ONE-TIME INCOME ROUTES
// ============================================

const oneTimeValidation = [
  body('description')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('Description must be under 255 characters.'),

  body('amount')
    .notEmpty().withMessage('Amount is required.')
    .isFloat({ gt: 0 }).withMessage('Amount must be greater than 0.'),

  body('received_date')
    .optional()
    .isISO8601().withMessage('Received date must be a valid date.'),
];

router.post(
  '/one-time',
  oneTimeValidation,
  handleValidationErrors,
  incomeController.createOneTimeIncome
);

router.get(
  '/one-time',
  incomeController.getOneTimeIncome
);

module.exports = router;

