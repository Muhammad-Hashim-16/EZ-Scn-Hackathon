const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const db = require('../config/db');

// GET /api/budgets
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM budgets WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ budgets: result.rows });
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/budgets
router.post('/', authenticate, async (req, res) => {
  try {
    const { category, amount, month, year } = req.body;

    const result = await db.query(
      'INSERT INTO budgets (user_id, category, amount, month, year) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, category, amount, month, year]
    );

    res.status(201).json({ budget: result.rows[0] });
  } catch (error) {
    console.error('Create budget error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/budgets/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { category, amount } = req.body;

    const result = await db.query(
      'UPDATE budgets SET category = $1, amount = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING *',
      [category, amount, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    res.json({ budget: result.rows[0] });
  } catch (error) {
    console.error('Update budget error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/budgets/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    res.json({ message: 'Budget deleted' });
  } catch (error) {
    console.error('Delete budget error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
