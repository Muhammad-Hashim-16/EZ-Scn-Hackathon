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

// ============================================
// PUT /api/auth/change-password
// ============================================
router.put(
  '/change-password',
  [
    body('currentPassword').notEmpty().withMessage('Current password is required.'),
    body('newPassword')
      .notEmpty().withMessage('New password is required.')
      .isLength({ min: 8 }).withMessage('New password must be at least 8 characters.')
      .matches(/[A-Z]/).withMessage('New password must contain an uppercase letter.')
      .matches(/[a-z]/).withMessage('New password must contain a lowercase letter.')
      .matches(/[0-9]/).withMessage('New password must contain a digit.')
      .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/).withMessage('New password must contain a special character.'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      // Need to authenticate first - get token from header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
      }
      const token = authHeader.split(' ')[1];
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const bcrypt = require('bcryptjs');
      const db = require('../config/db');
      
      // Get current password hash
      const userResult = await db.query('SELECT id, password_hash FROM users WHERE id = $1', [decoded.id]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found.' });
      }
      
      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
      if (!isMatch) {
        return res.status(400).json({ success: false, error: 'Current password is incorrect.' });
      }
      
      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
      const newHash = await bcrypt.hash(newPassword, saltRounds);
      
      await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, decoded.id]);
      
      return res.status(200).json({ success: true, message: 'Password changed successfully.' });
    } catch (error) {
      console.error('Auth — change-password error:', error);
      return res.status(500).json({ success: false, error: 'Failed to change password.' });
    }
  }
);
// ============================================
// POST /api/auth/forgot-password
// Always returns success (never reveal if email exists)
// In production, this would send a password reset email
// ============================================
router.post(
  '/forgot-password',
  [
    body('email').trim().isEmail().withMessage('Valid email is required.'),
  ],
  handleValidationErrors,
  async (req, res) => {
    // Always return success to prevent email enumeration
    // In production: generate reset token, send email
    console.log('Forgot password request for:', req.body.email);
    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email, reset instructions have been sent.',
    });
  }
);

module.exports = router;

