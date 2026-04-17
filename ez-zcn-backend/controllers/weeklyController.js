// ============================================
// PennyWise — Weekly Tracker Controller
// ============================================

const db = require('../config/db');

// ── Helper: get Monday of a given week ──
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
  return d.toISOString().split('T')[0];
}

// ============================================
// POST /api/weekly/entry
// ============================================
async function createEntry(req, res) {
  try {
    const userId = req.user.id;
    const { week_start_date, entries } = req.body;

    // ── Validate week_start_date is a Monday ──
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

    // ── Validate each entry ──
    const validEntries = [];
    for (const entry of entries) {
      const amount = parseFloat(entry.amount);
      if (!amount || amount <= 0) continue; // skip zero/empty entries

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

    // ── Delete existing entries for this week (upsert behavior) ──
    await db.query(
      'DELETE FROM weekly_expense_entries WHERE user_id = $1 AND week_start_date = $2',
      [userId, weekStart]
    );

    // ── Insert all entries ──
    const insertedIds = [];
    for (const entry of validEntries) {
      const result = await db.query(
        `INSERT INTO weekly_expense_entries
           (user_id, week_start_date, week_end_date, category_id, custom_label, amount, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [userId, weekStart, weekEnd, entry.category_id, entry.custom_label, entry.amount, entry.notes]
      );
      insertedIds.push(result.rows[0].id);
    }

    // ── Calculate totals and compare to budget ──
    const weeklyTotal = validEntries.reduce((s, e) => s + e.amount, 0);

    // Get monthly budget (total monthly expenses)
    const budgetResult = await db.query(
      `SELECT COALESCE(SUM(monthly_amount), 0) AS total
       FROM user_expenses WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    );
    const monthlyBudget = parseFloat(budgetResult.rows[0].total);
    const weeklyBudget = Math.round((monthlyBudget / 4) * 100) / 100;
    const overBudget = weeklyTotal > weeklyBudget;
    const overBy = overBudget ? Math.round((weeklyTotal - weeklyBudget) * 100) / 100 : 0;

    return res.status(201).json({
      success: true,
      saved: true,
      entries_count: validEntries.length,
      weekly_total: Math.round(weeklyTotal * 100) / 100,
      monthly_budget_weekly: weeklyBudget,
      over_budget: overBudget,
      over_by: overBy,
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
      // Default: last 2 months
      dateFilter = `AND week_start_date >= NOW() - INTERVAL '2 months'`;
    }

    const result = await db.query(
      `SELECT we.*, ec.category_name
       FROM weekly_expense_entries we
       LEFT JOIN expense_categories ec ON we.category_id = ec.id
       WHERE we.user_id = $1 ${dateFilter}
       ORDER BY we.week_start_date DESC, we.created_at ASC`,
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

    // Running monthly total
    const runningTotal = weeklyData.reduce((s, w) => s + w.total, 0);

    return res.status(200).json({
      success: true,
      weeks: weeklyData,
      weeks_count: weeklyData.length,
      running_monthly_total: Math.round(runningTotal * 100) / 100,
    });
  } catch (error) {
    console.error('Weekly Controller — getEntries error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch entries.', code: 'SERVER_ERROR' });
  }
}

// ============================================
// GET /api/weekly/current-week
// ============================================
async function getCurrentWeek(req, res) {
  try {
    const userId = req.user.id;

    // Get most recent Monday
    const monday = getMondayOfWeek(new Date());
    const weekStart = toDateStr(monday);
    const weekEnd = toDateStr(getSundayOfWeek(monday));

    const result = await db.query(
      `SELECT we.*, ec.category_name
       FROM weekly_expense_entries we
       LEFT JOIN expense_categories ec ON we.category_id = ec.id
       WHERE we.user_id = $1 AND we.week_start_date = $2
       ORDER BY we.created_at ASC`,
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

    const total = entries.reduce((s, e) => s + e.amount, 0);

    // Get weekly budget
    const budgetResult = await db.query(
      `SELECT COALESCE(SUM(monthly_amount), 0) AS total
       FROM user_expenses WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    );
    const weeklyBudget = Math.round((parseFloat(budgetResult.rows[0].total) / 4) * 100) / 100;

    return res.status(200).json({
      success: true,
      week_start: weekStart,
      week_end: weekEnd,
      logged: entries.length > 0,
      entries,
      weekly_total: Math.round(total * 100) / 100,
      weekly_budget: weeklyBudget,
      over_budget: total > weeklyBudget,
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
