// ============================================
// PennyWise — User Routes
// GET  /api/user/profile
// PUT  /api/user/profile
// PUT  /api/user/consent
// PUT  /api/user/complete-profile
// GET  /api/user/export-data
// DELETE /api/user/account
// ============================================

const express = require('express');
const { body, validationResult } = require('express-validator');
const authenticate = require('../middleware/auth');
const db = require('../config/db');

const router = express.Router();

// ── Helper: validation error formatter ──
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed.',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

// ============================================
// GET /api/user/profile
// ============================================
router.get('/profile', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, email, full_name, city, has_children, weekly_tracker_opt_in,
              notification_enabled, profile_complete, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Also fetch work profile
    const wp = await db.query(
      'SELECT daily_work_hours, work_days_per_month FROM work_profiles WHERE user_id = $1',
      [req.user.id]
    );

    res.json({
      success: true,
      user: result.rows[0],
      work_profile: wp.rows[0] || null,
    });
  } catch (error) {
    console.error('User profile GET error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================
// PUT /api/user/profile  (update name, city)
// ============================================
router.put('/profile', authenticate, [
  body('full_name').optional().trim().isLength({ min: 2, max: 100 }),
  body('city').optional().trim().isLength({ max: 100 }),
], handleValidationErrors, async (req, res) => {
  try {
    const { full_name, city } = req.body;
    const result = await db.query(
      `UPDATE users SET
         full_name = COALESCE($1, full_name),
         city = COALESCE($2, city),
         updated_at = NOW()
       WHERE id = $3
       RETURNING id, email, full_name, city, profile_complete`,
      [full_name || null, city || null, req.user.id]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('User profile PUT error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================
// PUT /api/user/consent
// ============================================
router.put('/consent', authenticate, async (req, res) => {
  try {
    const { cookies_accepted } = req.body;
    await db.query(
      'UPDATE users SET cookies_accepted = $1, updated_at = NOW() WHERE id = $2',
      [cookies_accepted === true, req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('User consent PUT error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================
// PUT /api/user/complete-profile
// ============================================
router.put('/complete-profile', authenticate, async (req, res) => {
  try {
    const { weekly_tracker_opt_in, notification_enabled } = req.body;
    await db.query(
      `UPDATE users SET
         profile_complete = true,
         weekly_tracker_opt_in = COALESCE($1, weekly_tracker_opt_in),
         notification_enabled = COALESCE($2, notification_enabled),
         updated_at = NOW()
       WHERE id = $3`,
      [
        weekly_tracker_opt_in != null ? weekly_tracker_opt_in : null,
        notification_enabled != null ? notification_enabled : null,
        req.user.id,
      ]
    );
    res.json({ success: true, profile_complete: true });
  } catch (error) {
    console.error('Complete profile error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================
// GET /api/user/export-data
// ============================================
router.get('/export-data', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const [userRes, wpRes, incRes, expRes, goalsRes, weeklyRes, snapRes] = await Promise.all([
      db.query('SELECT id, email, full_name, city, has_children, created_at FROM users WHERE id = $1', [userId]),
      db.query('SELECT * FROM work_profiles WHERE user_id = $1', [userId]),
      db.query('SELECT * FROM income_sources WHERE user_id = $1', [userId]),
      db.query('SELECT * FROM user_expenses WHERE user_id = $1', [userId]),
      db.query('SELECT * FROM savings_goals WHERE user_id = $1', [userId]),
      db.query('SELECT * FROM weekly_expense_entries WHERE user_id = $1', [userId]),
      db.query('SELECT * FROM monthly_snapshots WHERE user_id = $1', [userId]),
    ]);

    res.json({
      success: true,
      exported_at: new Date().toISOString(),
      data: {
        user: userRes.rows[0],
        work_profile: wpRes.rows[0] || null,
        income_sources: incRes.rows,
        expenses: expRes.rows,
        goals: goalsRes.rows,
        weekly_entries: weeklyRes.rows,
        monthly_snapshots: snapRes.rows,
      },
    });
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================
// DELETE /api/user/account
// ============================================
router.delete('/account', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // CASCADE will handle child tables, but be explicit
    await db.query('DELETE FROM notifications_log WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM weekly_expense_entries WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM monthly_snapshots WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM savings_goals WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM user_expenses WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM income_sources WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM work_profiles WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM users WHERE id = $1', [userId]);

    // Clear refresh cookie
    res.clearCookie('rw_refresh', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      path: '/',
    });

    res.json({ success: true, message: 'Account and all data deleted.' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
