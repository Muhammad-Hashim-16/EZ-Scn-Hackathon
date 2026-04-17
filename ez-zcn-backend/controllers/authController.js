// ============================================
// PennyWise — Auth Controller
// Handles registration, login, refresh, logout
// ============================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// ──────────────────────────────────────────
// Helper: Generate access + refresh token pair
// ──────────────────────────────────────────
function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
}

// ──────────────────────────────────────────
// Helper: Set refresh token as httpOnly cookie
// ──────────────────────────────────────────
function setRefreshCookie(res, refreshToken) {
  res.cookie('rw_refresh', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,   // 7 days in ms
    path: '/',
  });
}

// ============================================
// POST /api/auth/register
// ============================================
async function register(req, res) {
  try {
    const { email, full_name, password } = req.body;

    // ── 1. Check if email already exists ──
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists.',
        code: 'EMAIL_DUPLICATE',
      });
    }

    // ── 2. Hash password ──
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // ── 3. Insert user ──
    const result = await db.query(
      `INSERT INTO users (
        email,
        password_hash,
        full_name,
        is_verified,
        profile_complete,
        cookies_accepted,
        terms_accepted
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, full_name, profile_complete, created_at`,
      [
        email.toLowerCase().trim(),
        passwordHash,
        full_name.trim(),
        false,    // is_verified
        false,    // profile_complete
        false,    // cookies_accepted
        false,    // terms_accepted
      ]
    );

    const newUser = result.rows[0];

    // ── 4. Generate tokens ──
    const { accessToken, refreshToken } = generateTokens(newUser);

    // ── 5. Set refresh token cookie ──
    setRefreshCookie(res, refreshToken);

    // ── 6. Return success ──
    return res.status(201).json({
      success: true,
      accessToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        profile_complete: newUser.profile_complete,
      },
    });
  } catch (error) {
    console.error('Auth Controller — register error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error. Please try again later.',
      code: 'SERVER_ERROR',
    });
  }
}

// ============================================
// POST /api/auth/login
// ============================================
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // ── 1. Find user by email ──
    const result = await db.query(
      'SELECT id, email, password_hash, full_name, profile_complete FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      // Generic message — never reveal whether the email exists
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    const user = result.rows[0];

    // ── 2. Compare password with stored hash ──
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // ── 3. Update last_login timestamp ──
    await db.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // ── 4. Generate tokens ──
    const { accessToken, refreshToken } = generateTokens(user);

    // ── 5. Set refresh token cookie ──
    setRefreshCookie(res, refreshToken);

    // ── 6. Return success ──
    return res.status(200).json({
      success: true,
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        profile_complete: user.profile_complete,
      },
    });
  } catch (error) {
    console.error('Auth Controller — login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error. Please try again later.',
      code: 'SERVER_ERROR',
    });
  }
}

// ============================================
// POST /api/auth/logout
// ============================================
async function logout(req, res) {
  res.clearCookie('rw_refresh', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: '/',
  });

  return res.status(200).json({
    success: true,
    message: 'Logged out',
  });
}

// ============================================
// POST /api/auth/refresh
// ============================================
async function refresh(req, res) {
  try {
    const token = req.cookies.rw_refresh;

    // ── 1. Check cookie exists ──
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token is missing.',
        code: 'REFRESH_MISSING',
      });
    }

    // ── 2. Verify refresh token ──
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token is invalid or expired.',
        code: 'REFRESH_INVALID',
      });
    }

    // ── 3. Confirm user still exists ──
    const result = await db.query(
      'SELECT id, email FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User no longer exists.',
        code: 'USER_NOT_FOUND',
      });
    }

    const user = result.rows[0];

    // ── 4. Issue new access token ──
    const accessToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    return res.status(200).json({
      success: true,
      accessToken,
    });
  } catch (error) {
    console.error('Auth Controller — refresh error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error. Please try again later.',
      code: 'SERVER_ERROR',
    });
  }
}

// ============================================
// Exports
// ============================================
module.exports = {
  register,
  login,
  logout,
  refresh,
  // me,           // TODO
};
