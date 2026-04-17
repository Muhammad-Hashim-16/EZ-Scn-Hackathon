// ============================================
// PennyWise — Goals Controller
// ============================================

const db = require('../config/db');

// ============================================
// POST /api/goals — Create a new goal
// ============================================
async function createGoal(req, res) {
  try {
    const userId = req.user.id;
    const { goal_name, target_amount, target_months, priority_order } = req.body;

    // ── Validate ──
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

    // ── Auto-calculate ──
    const monthlyDeduction = Math.ceil((amount / months) * 100) / 100;
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + months);

    // ── Check achievability ──
    let warning = null;
    try {
      const incomeResult = await db.query(
        `SELECT COALESCE(SUM(amount), 0) AS total
         FROM income_sources
         WHERE user_id = $1 AND is_active = TRUE AND frequency = 'monthly' AND income_type = 'fixed'`,
        [userId]
      );
      const expenseResult = await db.query(
        `SELECT COALESCE(SUM(monthly_amount), 0) AS total FROM user_expenses WHERE user_id = $1 AND is_active = TRUE`,
        [userId]
      );
      const existingGoalsResult = await db.query(
        `SELECT COALESCE(SUM(monthly_deduction), 0) AS total FROM savings_goals WHERE user_id = $1 AND is_achieved = FALSE`,
        [userId]
      );

      const totalIncome = parseFloat(incomeResult.rows[0].total);
      const totalExpenses = parseFloat(expenseResult.rows[0].total);
      const existingGoalDeductions = parseFloat(existingGoalsResult.rows[0].total);
      const netSavings = totalIncome - totalExpenses - existingGoalDeductions;

      if (monthlyDeduction > netSavings && netSavings > 0) {
        const revisedMonths = Math.ceil(amount / netSavings);
        warning = `This goal requires PKR ${monthlyDeduction.toLocaleString()}/month but you only save PKR ${Math.round(netSavings).toLocaleString()}/month. Revised timeline: ${revisedMonths} months.`;
      } else if (netSavings <= 0) {
        warning = `You currently have no net savings. This goal may not be achievable without increasing income or reducing expenses.`;
      }
    } catch {
      // Achievability check failed — non-fatal, proceed
    }

    // ── Insert ──
    const result = await db.query(
      `INSERT INTO savings_goals
         (user_id, goal_name, target_amount, target_months, monthly_deduction, target_date, priority_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, goal_name.trim(), amount, months, monthlyDeduction, targetDate, priority_order || 1]
    );

    const goal = result.rows[0];

    return res.status(201).json({
      success: true,
      goal: formatGoal(goal),
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
    let annualInflation = 12.0;
    try {
      const inflResult = await db.query(
        `SELECT value FROM inflation_cache WHERE data_type = 'cpi' ORDER BY fetched_at DESC LIMIT 1`
      );
      if (inflResult.rows.length > 0) annualInflation = parseFloat(inflResult.rows[0].value);
    } catch { /* fallback */ }

    const monthlyInf = Math.pow(1 + annualInflation / 100, 1 / 12) - 1;

    const goals = result.rows.map((g) => {
      const formatted = formatGoal(g);

      // Inflation-adjusted target
      const monthsRemaining = formatted.months_remaining > 0 ? formatted.months_remaining : 0;
      const adjustedTarget = parseFloat(g.target_amount) * Math.pow(1 + monthlyInf, monthsRemaining);
      formatted.inflation_adjusted_target = Math.round(adjustedTarget * 100) / 100;
      formatted.inflation_rate = annualInflation;

      return formatted;
    });

    return res.status(200).json({ success: true, goals, count: goals.length });
  } catch (error) {
    console.error('Goals Controller — getGoals error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch goals.', code: 'SERVER_ERROR' });
  }
}

// ============================================
// PUT /api/goals/:id/contribute
// ============================================
async function contributeToGoal(req, res) {
  try {
    const userId = req.user.id;
    const goalId = req.params.id;
    const { amount } = req.body;

    const contributionAmount = parseFloat(amount);
    if (!contributionAmount || contributionAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Contribution amount must be > 0.', code: 'VALIDATION_ERROR' });
    }

    // Verify ownership
    const existing = await db.query(
      'SELECT * FROM savings_goals WHERE id = $1 AND user_id = $2',
      [goalId, userId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Goal not found.', code: 'NOT_FOUND' });
    }

    const goal = existing.rows[0];
    const newSaved = parseFloat(goal.amount_saved) + contributionAmount;
    const isAchieved = newSaved >= parseFloat(goal.target_amount);

    const result = await db.query(
      `UPDATE savings_goals
       SET amount_saved = $1, is_achieved = $2
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [Math.min(newSaved, parseFloat(goal.target_amount)), isAchieved, goalId, userId]
    );

    return res.status(200).json({
      success: true,
      goal: formatGoal(result.rows[0]),
      ...(isAchieved && { message: '🎉 Congratulations! You achieved this goal!' }),
    });
  } catch (error) {
    console.error('Goals Controller — contribute error:', error);
    return res.status(500).json({ success: false, error: 'Failed to contribute.', code: 'SERVER_ERROR' });
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
  const monthly = parseFloat(g.monthly_deduction || 0);
  const progress = target > 0 ? Math.round((saved / target) * 10000) / 100 : 0;

  // Months remaining
  const now = new Date();
  const targetDate = g.target_date ? new Date(g.target_date) : null;
  let monthsRemaining = 0;
  if (targetDate && targetDate > now) {
    monthsRemaining = Math.max(0, Math.ceil((targetDate - now) / (30.44 * 24 * 60 * 60 * 1000)));
  }

  // On pace?
  let status = 'on_track';
  if (g.is_achieved) {
    status = 'achieved';
  } else if (monthly <= 0 || (target - saved > 0 && monthsRemaining <= 0)) {
    status = 'impossible';
  } else {
    const requiredMonthly = monthsRemaining > 0 ? (target - saved) / monthsRemaining : Infinity;
    if (requiredMonthly > monthly * 1.25) {
      status = 'behind';
    }
  }

  return {
    id: g.id,
    goal_name: g.goal_name,
    target_amount: target,
    amount_saved: saved,
    monthly_deduction: monthly,
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

module.exports = { createGoal, getGoals, contributeToGoal, deleteGoal };
