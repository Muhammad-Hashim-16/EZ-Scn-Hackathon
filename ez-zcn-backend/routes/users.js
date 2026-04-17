const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const db = require('../config/db');

// GET /api/users/profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, created_at, updated_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/users/profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name } = req.body;

    const result = await db.query(
      'UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, updated_at',
      [name, req.user.id]
    );

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
