// ============================================
// PennyWise — Auth Middleware
// JWT verification for protected routes
// ============================================

const jwt = require('jsonwebtoken');
const db = require('../config/db');

/**
 * Middleware to protect routes that require authentication.
 *
 * 1. Reads Authorization header (Bearer <token>)
 * 2. Verifies JWT using JWT_SECRET
 * 3. Fetches full user row from database
 * 4. Attaches user object (without password_hash) to req.user
 * 5. Calls next()
 */
async function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  // ── 1. Check header exists and is well-formed ──
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'No token provided',
      code: 'NO_TOKEN',
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No token provided',
      code: 'NO_TOKEN',
    });
  }

  // ── 2. Verify JWT ──
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      code: 'TOKEN_INVALID',
    });
  }

  // ── 3. Fetch user from database ──
  try {
    const result = await db.query(
      `SELECT id, email, full_name, phone_number, city,
              has_children, weekly_tracker_opt_in, notification_enabled,
              cookies_accepted, terms_accepted, terms_accepted_at,
              created_at, updated_at, last_login,
              is_verified, profile_complete
       FROM users WHERE id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    // ── 4. Attach user to request ──
    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Auth Middleware — database error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
    });
  }
}

module.exports = { protect };
