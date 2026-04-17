const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const db = require('../config/db');

// GET /api/inflation/rates
// Returns historical inflation rates for Pakistan
router.get('/rates', authenticate, async (req, res) => {
  try {
    const { year, category } = req.query;

    let query = 'SELECT * FROM inflation_rates WHERE 1=1';
    const params = [];

    if (year) {
      params.push(year);
      query += ` AND year = $${params.length}`;
    }

    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    query += ' ORDER BY year DESC, month DESC';

    const result = await db.query(query, params);
    res.json({ rates: result.rows });
  } catch (error) {
    console.error('Get inflation rates error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/inflation/current
// Returns the latest inflation rate
router.get('/current', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM inflation_rates ORDER BY year DESC, month DESC LIMIT 1'
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No inflation data available' });
    }

    res.json({ rate: result.rows[0] });
  } catch (error) {
    console.error('Get current inflation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/inflation/adjust
// Calculate inflation-adjusted value
router.get('/adjust', authenticate, async (req, res) => {
  try {
    const { amount, from_year, to_year } = req.query;

    if (!amount || !from_year || !to_year) {
      return res.status(400).json({ message: 'amount, from_year, and to_year are required' });
    }

    // Fetch average annual inflation rates between years
    const result = await db.query(
      'SELECT year, AVG(rate) as avg_rate FROM inflation_rates WHERE year >= $1 AND year <= $2 GROUP BY year ORDER BY year',
      [from_year, to_year]
    );

    let adjustedAmount = parseFloat(amount);
    for (const row of result.rows) {
      adjustedAmount *= (1 + row.avg_rate / 100);
    }

    res.json({
      original_amount: parseFloat(amount),
      adjusted_amount: Math.round(adjustedAmount * 100) / 100,
      from_year: parseInt(from_year),
      to_year: parseInt(to_year),
      inflation_rates: result.rows,
    });
  } catch (error) {
    console.error('Adjust inflation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
