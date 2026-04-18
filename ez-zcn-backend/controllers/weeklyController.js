// ============================================
// PennyWise — Weekly Tracker Controller (v2)
//
// Implements running-total weekly budget logic:
//   weekly_budget = expected_monthly_expenses / 4
//   Week N running total compared to weekly_budget × N
//   Week 3+ : RED if overspending
//   Week 4  : deduct overspend from cumulative_savings
// ============================================

const db = require('../config/db');

// ── Date helpers ──
function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getSundayOfWeek(monday) {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  return d;
}

function toDateStr(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

// ── Get the 1st of the month for a given date ──
function monthStart(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

// ── Get week number within the month (1-4) ──
function getWeekNumberInMonth(date) {
  const d = new Date(date);
  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
  const firstMonday = getMondayOfWeek(firstDay);
  // If firstMonday is before the month start, shift to next Monday
  const effectiveStart = firstMonday < firstDay
    ? new Date(firstMonday.getTime() + 7 * 24 * 60 * 60 * 1000)
    : firstMonday;

  const currentMonday = getMondayOfWeek(d);
  const weekDiff = Math.round((currentMonday - effectiveStart) / (7 * 24 * 60 * 60 * 1000));
  return Math.min(Math.max(weekDiff + 1, 1), 4);
}

// ── Get monthly budget info for user ──
async function getBudgetInfo(userId) {
  const budgetResult = await db.query(
    `SELECT COALESCE(SUM(monthly_amount), 0) AS total
     FROM user_expenses WHERE user_id = $1 AND is_active = TRUE`,
    [userId]
  );
  const monthlyBudget = parseFloat(budgetResult.rows[0].total);
  const weeklyBudget = Math.round((monthlyBudget / 4) * 100) / 100;
  return { monthlyBudget, weeklyBudget };
}

// ── Get running monthly total from all weeks in the current month ──
async function getRunningMonthlyTotal(userId, monthStr) {
  const result = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM weekly_expense_entries
     WHERE user_id = $1
       AND week_start_date >= $2
       AND week_start_date < ($2::date + INTERVAL '1 month')`,
    [userId, monthStr]
  );
  return parseFloat(result.rows[0].total);
}

// ── Determine status color based on week/spending ──
function getStatus(weekNumber, runningTotal, weeklyBudget, monthlyBudget) {
  const allowance = weeklyBudget * weekNumber;
  const remaining = monthlyBudget - runningTotal;

  if (weekNumber >= 3 && runningTotal > allowance) {
    return {
      color: 'red',
      label: 'Overspending',
      message: `You are overspending this month. Try to spend less than PKR ${Math.max(0, remaining).toLocaleString()} in the remaining weeks to stay on track.`,
    };
  }
  if (runningTotal > allowance) {
    return {
      color: 'yellow',
      label: 'Slightly Over',
      message: `You are PKR ${(runningTotal - allowance).toLocaleString()} over the week ${weekNumber} target. Try to compensate next week.`,
    };
  }
  return {
    color: 'green',
    label: 'On Track',
    message: 'Great! You are within your budget.',
  };
}

// ============================================
// POST /api/weekly/entry
// ============================================
async function createEntry(req, res) {
  try {
    const userId = req.user.id;
    const { week_start_date, entries } = req.body;

    // Validate week_start_date is a Monday
    if (!week_start_date) {
      return res.status(400).json({ success: false, error: 'week_start_date is required.', code: 'VALIDATION_ERROR' });
    }

    const startDate = new Date(week_start_date);
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid date format.', code: 'VALIDATION_ERROR' });
    }
    if (startDate.getDay() !== 1) {
      return res.status(400).json({ success: false, error: 'week_start_date must be a Monday.', code: 'VALIDATION_ERROR' });
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one entry is required.', code: 'VALIDATION_ERROR' });
    }

    const endDate = getSundayOfWeek(startDate);
    const weekStart = toDateStr(startDate);
    const weekEnd = toDateStr(endDate);

    // Validate entries
    const validEntries = [];
    for (const entry of entries) {
      const amount = parseFloat(entry.amount);
      if (!amount || amount <= 0) continue;
      validEntries.push({
        category_id: entry.category_id || null,
        custom_label: entry.custom_label || null,
        amount,
        notes: entry.notes || null,
      });
    }

    if (validEntries.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid entries with positive amounts.', code: 'VALIDATION_ERROR' });
    }

    // Delete existing entries for this week (upsert behavior)
    await db.query(
      'DELETE FROM weekly_expense_entries WHERE user_id = $1 AND week_start_date = $2',
      [userId, weekStart]
    );

    // Insert all entries
    for (const entry of validEntries) {
      await db.query(
        `INSERT INTO weekly_expense_entries
           (user_id, week_start_date, week_end_date, category_id, custom_label, amount, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, weekStart, weekEnd, entry.category_id, entry.custom_label, entry.amount, entry.notes]
      );
    }

    // Calculate running totals
    const weeklyTotal = validEntries.reduce((s, e) => s + e.amount, 0);
    const { monthlyBudget, weeklyBudget } = await getBudgetInfo(userId);
    const currentMonthStr = monthStart(startDate);
    const runningMonthlyTotal = await getRunningMonthlyTotal(userId, currentMonthStr);
    const weekNumber = getWeekNumberInMonth(startDate);
    const status = getStatus(weekNumber, runningMonthlyTotal, weeklyBudget, monthlyBudget);
    const remainingBudget = Math.max(0, monthlyBudget - runningMonthlyTotal);

    // ── Week 4 end-of-month logic: deduct overspend from savings ──
    let overspentDeduction = null;
    if (weekNumber === 4 && runningMonthlyTotal > monthlyBudget) {
      const overspent = Math.round((runningMonthlyTotal - monthlyBudget) * 100) / 100;
      const monthStr = currentMonthStr;

      const updateResult = await db.query(
        `UPDATE monthly_records
         SET actual_expenses = $3,
             cumulative_savings = cumulative_savings - $4
         WHERE user_id = $1 AND month = $2
         RETURNING cumulative_savings`,
        [userId, monthStr, runningMonthlyTotal, overspent]
      );

      const newSavings = updateResult.rows.length > 0
        ? parseFloat(updateResult.rows[0].cumulative_savings)
        : null;

      overspentDeduction = {
        overspent,
        new_savings: newSavings,
        message: `You overspent by PKR ${overspent.toLocaleString()} this month. This has been deducted from your savings. Savings remaining: PKR ${(newSavings || 0).toLocaleString()}`,
      };
    }

    return res.status(201).json({
      success: true,
      saved: true,
      week_number: weekNumber,
      weekly_total: Math.round(weeklyTotal * 100) / 100,
      weekly_budget: weeklyBudget,
      monthly_budget: monthlyBudget,
      running_monthly_total: Math.round(runningMonthlyTotal * 100) / 100,
      remaining_budget: Math.round(remainingBudget * 100) / 100,
      status,
      overspent_deduction: overspentDeduction,
      week_start: weekStart,
      week_end: weekEnd,
    });
  } catch (error) {
    console.error('Weekly Controller — createEntry error:', error);
    return res.status(500).json({ success: false, error: 'Failed to save weekly entries.', code: 'SERVER_ERROR' });
  }
}

// ============================================
// GET /api/weekly/entries?month=YYYY-MM
// Returns all weeks for a month with running totals
// ============================================
async function getEntries(req, res) {
  try {
    const userId = req.user.id;
    const month = req.query.month; // YYYY-MM

    let dateFilter = '';
    let params = [userId];

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      dateFilter = `AND week_start_date >= $2 AND week_start_date < ($2::date + INTERVAL '1 month')`;
      params.push(`${month}-01`);
    } else {
      dateFilter = `AND week_start_date >= NOW() - INTERVAL '2 months'`;
    }

    const result = await db.query(
      `SELECT we.*, ec.category_name
       FROM weekly_expense_entries we
       LEFT JOIN expense_categories ec ON we.category_id = ec.id
       WHERE we.user_id = $1 ${dateFilter}
       ORDER BY we.week_start_date DESC, we.submitted_at ASC`,
      params
    );

    // Group by week
    const weeks = {};
    for (const row of result.rows) {
      const key = row.week_start_date instanceof Date
        ? row.week_start_date.toISOString().split('T')[0]
        : String(row.week_start_date).split('T')[0];

      if (!weeks[key]) {
        weeks[key] = {
          week_start: key,
          week_end: row.week_end_date instanceof Date
            ? row.week_end_date.toISOString().split('T')[0]
            : String(row.week_end_date).split('T')[0],
          week_number: getWeekNumberInMonth(new Date(key)),
          entries: [],
          total: 0,
        };
      }
      const amount = parseFloat(row.amount);
      weeks[key].entries.push({
        id: row.id,
        category_id: row.category_id,
        category_name: row.category_name || row.custom_label || 'Other',
        custom_label: row.custom_label,
        amount,
        notes: row.notes,
      });
      weeks[key].total = Math.round((weeks[key].total + amount) * 100) / 100;
    }

    const weeklyData = Object.values(weeks);
    const runningTotal = weeklyData.reduce((s, w) => s + w.total, 0);
    const { monthlyBudget, weeklyBudget } = await getBudgetInfo(userId);

    return res.status(200).json({
      success: true,
      weeks: weeklyData,
      weeks_count: weeklyData.length,
      running_monthly_total: Math.round(runningTotal * 100) / 100,
      monthly_budget: monthlyBudget,
      weekly_budget: weeklyBudget,
      remaining_budget: Math.round(Math.max(0, monthlyBudget - runningTotal) * 100) / 100,
    });
  } catch (error) {
    console.error('Weekly Controller — getEntries error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch entries.', code: 'SERVER_ERROR' });
  }
}

// ============================================
// GET /api/weekly/current-week
// Returns current week data with full budget context
// ============================================
async function getCurrentWeek(req, res) {
  try {
    const userId = req.user.id;

    const monday = getMondayOfWeek(new Date());
    const weekStart = toDateStr(monday);
    const weekEnd = toDateStr(getSundayOfWeek(monday));
    const weekNumber = getWeekNumberInMonth(new Date());

    const result = await db.query(
      `SELECT we.*, ec.category_name
       FROM weekly_expense_entries we
       LEFT JOIN expense_categories ec ON we.category_id = ec.id
       WHERE we.user_id = $1 AND we.week_start_date = $2
       ORDER BY we.submitted_at ASC`,
      [userId, weekStart]
    );

    const entries = result.rows.map((row) => ({
      id: row.id,
      category_id: row.category_id,
      category_name: row.category_name || row.custom_label || 'Other',
      custom_label: row.custom_label,
      amount: parseFloat(row.amount),
      notes: row.notes,
    }));

    const weeklyTotal = entries.reduce((s, e) => s + e.amount, 0);
    const { monthlyBudget, weeklyBudget } = await getBudgetInfo(userId);
    const currentMonthStr = monthStart(new Date());
    const runningMonthlyTotal = await getRunningMonthlyTotal(userId, currentMonthStr);
    const status = getStatus(weekNumber, runningMonthlyTotal, weeklyBudget, monthlyBudget);
    const remainingBudget = Math.max(0, monthlyBudget - runningMonthlyTotal);

    // Fetch user's expense categories (for form pre-population)
    const categoriesResult = await db.query(
      `SELECT ue.id, ue.category_id, ue.custom_label, ue.monthly_amount,
              ec.category_name
       FROM user_expenses ue
       LEFT JOIN expense_categories ec ON ue.category_id = ec.id
       WHERE ue.user_id = $1 AND ue.is_active = TRUE AND ue.monthly_amount > 0
       ORDER BY ue.monthly_amount DESC`,
      [userId]
    );

    const userCategories = categoriesResult.rows.map((row) => ({
      expense_id: row.id,
      category_id: row.category_id,
      label: row.category_name || row.custom_label || 'Other',
      monthly_amount: parseFloat(row.monthly_amount),
    }));

    return res.status(200).json({
      success: true,
      week_start: weekStart,
      week_end: weekEnd,
      week_number: weekNumber,
      logged: entries.length > 0,
      entries,
      weekly_total: Math.round(weeklyTotal * 100) / 100,
      weekly_budget: weeklyBudget,
      monthly_budget: monthlyBudget,
      running_monthly_total: Math.round(runningMonthlyTotal * 100) / 100,
      remaining_budget: Math.round(remainingBudget * 100) / 100,
      status,
      user_categories: userCategories,
    });
  } catch (error) {
    console.error('Weekly Controller — getCurrentWeek error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch current week.', code: 'SERVER_ERROR' });
  }
}

// ============================================
// PUT /api/weekly/opt-in
// ============================================
async function toggleOptIn(req, res) {
  try {
    const userId = req.user.id;
    const { opt_in } = req.body;

    await db.query(
      'UPDATE users SET weekly_tracker_opt_in = $1 WHERE id = $2',
      [opt_in === true, userId]
    );

    return res.status(200).json({
      success: true,
      weekly_tracker_opt_in: opt_in === true,
    });
  } catch (error) {
    console.error('Weekly Controller — toggleOptIn error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update preference.', code: 'SERVER_ERROR' });
  }
}

module.exports = { createEntry, getEntries, getCurrentWeek, toggleOptIn };
