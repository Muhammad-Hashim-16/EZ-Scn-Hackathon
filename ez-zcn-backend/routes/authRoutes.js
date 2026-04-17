// ============================================
// PennyWise — Auth Routes
// POST /api/auth/register
// POST /api/auth/login
// POST /api/auth/refresh
// POST /api/auth/logout
// GET  /api/auth/me           (TODO)
// ============================================

const express = require('express');
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');

const router = express.Router();

// ──────────────────────────────────────────
// Validation middleware: formats errors into
// a consistent { success, errors[] } shape
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
// Validation rules for registration
// ──────────────────────────────────────────
const registerValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('full_name')
    .trim()
    .notEmpty().withMessage('Full name is required.')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters.'),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long.')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter.')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter.')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one digit.')
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)
    .withMessage('Password must contain at least one special character.'),
];

// ──────────────────────────────────────────
// Validation rules for login
// ──────────────────────────────────────────
const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.'),
];

// ============================================
// POST /api/auth/register
// ============================================
router.post(
  '/register',
  registerValidation,
  handleValidationErrors,
  authController.register
);

// ============================================
// POST /api/auth/login
// ============================================
router.post(
  '/login',
  loginValidation,
  handleValidationErrors,
  authController.login
);

// ============================================
// POST /api/auth/refresh
// ============================================
router.post('/refresh', authController.refresh);

// ============================================
// POST /api/auth/logout
// ============================================
router.post('/logout', authController.logout);

module.exports = router;

