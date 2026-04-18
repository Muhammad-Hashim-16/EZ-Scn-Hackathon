// ============================================
// PennyWise — Goals Controller (v2)
//
// Goals are funded ONLY by manual transfers
// from cumulative savings. No auto-deductions.
// ============================================

const db = require('../config/db');

// ── Ensure goal_transfers table exists ──
async function ensureGoalTables() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS goal_transfers (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
        goal_id         UUID REFERENCES savings_goals(id) ON DELETE CASCADE,
        amount          DECIMAL(12,2) NOT NULL,
        transfer_date   DATE DEFAULT CURRENT_DATE,
        created_at      TIMESTAMP DEFAULT NOW()
      );
    `);
  } catch (err) {
    console.error('Goals — ensureGoalTables error:', err.message);
  }
}

// ── Helper: current month string ──
function currentMonthStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

// ============================================
// POST /api/goals — Create a new goal
// ============================================
async function createGoal(req, res) {
  try {
    const userId = req.user.id;
    const { goal_name, target_amount, target_months, priority_order } = req.body;

    if (!goal_name || typeof goal_name !== 'string' || goal_name.trim().length < 1) {
      return res.status(400).json({ success: false, error: 'Goal name is required.', code: 'VALIDATION_ERROR' });
    }

    const amount = parseFloat(target_amount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Target amount must be greater than 0.', code: 'VALIDATION_ERROR' });
    }

    const months = parseInt(target_months, 10);
    if (!months || months < 1 || months > 120) {
      return res.status(400).json({ success: false, error: 'Target months must be between 1 and 120.', code: 'VALIDATION_ERROR' });
    }

    // Monthly transfer suggestion (not enforced — user transfers manually)
    const suggestedMonthly = Math.ceil((amount / months) * 100) / 100;
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + months);

    // Check if savings can support this goal
    let warning = null;
    try {
      const monthStr = currentMonthStr();
      const savingsResult = await db.query(
        `SELECT cumulative_savings FROM monthly_records WHERE user_id = $1 AND month = $2`,
        [userId, monthStr]
      );
      const currentSavings = savingsResult.rows.length > 0
        ? parseFloat(savingsResult.rows[0].cumulative_savings)
        : 0;

      if (currentSavings <= 0) {
        warning = 'You currently have no savings. Transfer funds to this goal as your savings grow.';
      }
    } catch { /* non-fatal */ }

    const result = await db.query(
      `INSERT INTO savings_goals
         (user_id, goal_name, target_amount, target_months, monthly_deduction, target_date, priority_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, goal_name.trim(), amount, months, suggestedMonthly, targetDate, priority_order || 1]
    );

    return res.status(201).json({
      success: true,
      goal: formatGoal(result.rows[0]),
      ...(warning && { warning }),
    });
  } catch (error) {
    console.error('Goals Controller — createGoal error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create goal.', code: 'SERVER_ERROR' });
  }
}

// ============================================
// GET /api/goals — List all goals
// ============================================
async function getGoals(req, res) {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT * FROM savings_goals WHERE user_id = $1 ORDER BY priority_order ASC, created_at DESC`,
      [userId]
    );

    // Get inflation rate for adjusted target
    let annualInflation = 1.4;
    try {
      const inflResult = await db.query(
        `SELECT value FROM inflation_cache WHERE data_type = 'inflation_rate' ORDER BY fetched_at DESC LIMIT 1`
      );
      if (inflResult.rows.length > 0) annualInflation = parseFloat(inflResult.rows[0].value);
    } catch { /* fallback */ }

    const monthlyInf = Math.pow(1 + annualInflation / 100, 1 / 12) - 1;

    // Get cumulative savings for the "available" display
    const monthStr = currentMonthStr();
    const savingsResult = await db.query(
      `SELECT cumulative_savings FROM monthly_records WHERE user_id = $1 AND month = $2`,
      [userId, monthStr]
    );
    const cumulativeSavings = savingsResult.rows.length > 0
      ? parseFloat(savingsResult.rows[0].cumulative_savings)
      : 0;

    const goals = result.rows.map((g) => {
      const formatted = formatGoal(g);

      const monthsRemaining = formatted.months_remaining > 0 ? formatted.months_remaining : 0;
      const adjustedTarget = parseFloat(g.target_amount) * Math.pow(1 + monthlyInf, monthsRemaining);
      formatted.inflation_adjusted_target = Math.round(adjustedTarget * 100) / 100;
      formatted.inflation_rate = annualInflation;

      return formatted;
    });

    return res.status(200).json({
      success: true,
      goals,
      count: goals.length,
      cumulative_savings: cumulativeSavings,
    });
  } catch (error) {
    console.error('Goals Controller — getGoals error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch goals.', code: 'SERVER_ERROR' });
  }
}

// ============================================
// POST /api/goals/:id/transfer
//
// Transfer money FROM savings TO a goal.
// Uses a database transaction for atomicity.
// ============================================
async function transferToGoal(req, res) {
  const client = await db.getClient();
  try {
    const userId = req.user.id;
    const goalId = req.params.id;
    const { amount } = req.body;

    const transferAmount = parseFloat(amount);
    if (!transferAmount || transferAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Transfer amount must be greater than 0.', code: 'VALIDATION_ERROR' });
    }

    await client.query('BEGIN');

    // 1. Check cumulative savings
    const monthStr = currentMonthStr();
    const savingsResult = await client.query(
      `SELECT cumulative_savings FROM monthly_records WHERE user_id = $1 AND month = $2 FOR UPDATE`,
      [userId, monthStr]
    );

    if (savingsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'No monthly record found. Please confirm your monthly check-in first.', code: 'NO_RECORD' });
    }

    const currentSavings = parseFloat(savingsResult.rows[0].cumulative_savings);

    if (transferAmount > currentSavings) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: `Insufficient savings. Available: PKR ${currentSavings.toLocaleString()}, requested: PKR ${transferAmount.toLocaleString()}.`,
        code: 'INSUFFICIENT_SAVINGS',
        available: currentSavings,
      });
    }

    // 2. Verify goal ownership
    const goalResult = await client.query(
      `SELECT * FROM savings_goals WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [goalId, userId]
    );

    if (goalResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Goal not found.', code: 'NOT_FOUND' });
    }

    const goal = goalResult.rows[0];
    if (goal.is_achieved) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'This goal is already achieved.', code: 'ALREADY_ACHIEVED' });
    }

    // 3. Deduct from savings
    const newSavings = currentSavings - transferAmount;
    await client.query(
      `UPDATE monthly_records SET cumulative_savings = $3 WHERE user_id = $1 AND month = $2`,
      [userId, monthStr, newSavings]
    );

    // 4. Add to goal
    const newAmountSaved = parseFloat(goal.amount_saved) + transferAmount;
    const goalTarget = parseFloat(goal.target_amount);
    const cappedSaved = Math.min(newAmountSaved, goalTarget);
    const isAchieved = newAmountSaved >= goalTarget;

    await client.query(
      `UPDATE savings_goals SET amount_saved = $3, is_achieved = $4 WHERE id = $1 AND user_id = $2`,
      [goalId, userId, cappedSaved, isAchieved]
    );

    // 5. Record the transfer
    await client.query(
      `INSERT INTO goal_transfers (user_id, goal_id, amount) VALUES ($1, $2, $3)`,
      [userId, goalId, transferAmount]
    );

    await client.query('COMMIT');

    // Fetch updated goal
    const updatedGoal = await db.query(
      `SELECT * FROM savings_goals WHERE id = $1 AND user_id = $2`,
      [goalId, userId]
    );

    return res.status(200).json({
      success: true,
      message: isAchieved ? '🎉 Congratulations! You achieved this goal!' : 'Transfer successful.',
      new_savings: Math.round(newSavings * 100) / 100,
      goal: formatGoal(updatedGoal.rows[0]),
      is_achieved: isAchieved,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Goals Controller — transferToGoal error:', error);
    return res.status(500).json({ success: false, error: 'Transfer failed.', code: 'SERVER_ERROR' });
  } finally {
    client.release();
  }
}

// ============================================
// GET /api/goals/:id/transfers
// Returns transfer history for a goal
// ============================================
async function getGoalTransfers(req, res) {
  try {
    const userId = req.user.id;
    const goalId = req.params.id;

    const result = await db.query(
      `SELECT id, amount, transfer_date, created_at
       FROM goal_transfers
       WHERE user_id = $1 AND goal_id = $2
       ORDER BY transfer_date DESC`,
      [userId, goalId]
    );

    return res.status(200).json({
      success: true,
      transfers: result.rows.map(r => ({
        id: r.id,
        amount: parseFloat(r.amount),
        transfer_date: r.transfer_date,
        created_at: r.created_at,
      })),
      total: result.rows.reduce((s, r) => s + parseFloat(r.amount), 0),
    });
  } catch (error) {
    console.error('Goals Controller — getGoalTransfers error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch transfers.', code: 'SERVER_ERROR' });
  }
}

// ============================================
// DELETE /api/goals/:id
// ============================================
async function deleteGoal(req, res) {
  try {
    const userId = req.user.id;
    const goalId = req.params.id;

    const result = await db.query(
      'DELETE FROM savings_goals WHERE id = $1 AND user_id = $2 RETURNING id',
      [goalId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Goal not found.', code: 'NOT_FOUND' });
    }

    return res.status(200).json({ success: true, message: 'Goal deleted.' });
  } catch (error) {
    console.error('Goals Controller — delete error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete goal.', code: 'SERVER_ERROR' });
  }
}

// ── Helper: format a goal row ──
function formatGoal(g) {
  const target = parseFloat(g.target_amount);
  const saved = parseFloat(g.amount_saved || 0);
  const suggestedMonthly = parseFloat(g.monthly_deduction || 0);
  const progress = target > 0 ? Math.round((saved / target) * 100) : 0;

  const now = new Date();
  const targetDate = g.target_date ? new Date(g.target_date) : null;
  let monthsRemaining = 0;
  if (targetDate && targetDate > now) {
    monthsRemaining = Math.max(0, Math.ceil((targetDate - now) / (30.44 * 24 * 60 * 60 * 1000)));
  }

  let status = 'on_track';
  if (g.is_achieved) {
    status = 'achieved';
  } else if (monthsRemaining <= 0 && saved < target) {
    status = 'overdue';
  } else if (monthsRemaining > 0) {
    const requiredMonthly = (target - saved) / monthsRemaining;
    if (requiredMonthly > suggestedMonthly * 1.5) {
      status = 'behind';
    }
  }

  return {
    id: g.id,
    goal_name: g.goal_name,
    target_amount: target,
    amount_saved: saved,
    suggested_monthly: suggestedMonthly,
    target_months: g.target_months,
    start_date: g.start_date,
    target_date: g.target_date,
    is_achieved: g.is_achieved,
    priority_order: g.priority_order,
    progress_percent: Math.min(progress, 100),
    months_remaining: monthsRemaining,
    remaining_amount: Math.round((target - saved) * 100) / 100,
    status,
    created_at: g.created_at,
  };
}

module.exports = { createGoal, getGoals, transferToGoal, getGoalTransfers, deleteGoal, ensureGoalTables };
