const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const db = require('../config/db');

// GET /api/savings
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM savings_goals WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ goals: result.rows });
  } catch (error) {
    console.error('Get savings error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/savings
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, target_amount, current_amount, deadline } = req.body;

    const result = await db.query(
      'INSERT INTO savings_goals (user_id, title, target_amount, current_amount, deadline) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, title, target_amount, current_amount || 0, deadline]
    );

    res.status(201).json({ goal: result.rows[0] });
  } catch (error) {
    console.error('Create savings goal error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/savings/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { title, target_amount, current_amount, deadline } = req.body;

    const result = await db.query(
      'UPDATE savings_goals SET title = $1, target_amount = $2, current_amount = $3, deadline = $4, updated_at = NOW() WHERE id = $5 AND user_id = $6 RETURNING *',
      [title, target_amount, current_amount, deadline, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Savings goal not found' });
    }

    res.json({ goal: result.rows[0] });
  } catch (error) {
    console.error('Update savings goal error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/savings/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM savings_goals WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Savings goal not found' });
    }

    res.json({ message: 'Savings goal deleted' });
  } catch (error) {
    console.error('Delete savings goal error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
