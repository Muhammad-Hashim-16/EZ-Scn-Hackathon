// ============================================
// PennyWise — Monthly Record Controller
// Manages cumulative savings tracking per month
// ============================================

const db = require('../config/db');

// ============================================
// Ensure the monthly_records table exists
// Called once on app startup
// ============================================
async function ensureTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS monthly_records (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
        month               DATE NOT NULL,
        income              DECIMAL(12,2) DEFAULT 0,
        expected_expenses   DECIMAL(12,2) DEFAULT 0,
        actual_expenses     DECIMAL(12,2) DEFAULT 0,
        monthly_net         DECIMAL(12,2) DEFAULT 0,
        cumulative_savings  DECIMAL(12,2) DEFAULT 0,
        confirmed           BOOLEAN DEFAULT FALSE,
        created_at          TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, month)
      );
    `);
    // Add confirmed column if table already existed without it
    await db.query(`
      ALTER TABLE monthly_records ADD COLUMN IF NOT EXISTS confirmed BOOLEAN DEFAULT FALSE;
    `);
    // One-time income table
    await db.query(`
      CREATE TABLE IF NOT EXISTS one_time_income (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
        description     VARCHAR(255),
        amount          DECIMAL(12,2) NOT NULL,
        received_date   DATE DEFAULT CURRENT_DATE,
        created_at      TIMESTAMP DEFAULT NOW()
      );
    `);
  } catch (err) {
    console.error('MonthlyRecord — ensureTable error:', err.message);
  }
}

// ============================================
// Helper: get first day of current month
// ============================================
function currentMonthDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

// ============================================
// Helper: get first day of previous month
// ============================================
function prevMonthDate() {
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

// ============================================
// Ensure a record exists for the current month
// If not, create one from user's baseline data
// and compute cumulative savings from prior months
// ============================================
async function ensureCurrentMonth(userId) {
  const monthStr = currentMonthDate();

  // Check if record already exists
  const existing = await db.query(
    `SELECT * FROM monthly_records WHERE user_id = $1 AND month = $2`,
    [userId, monthStr]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  // Fetch user's baseline income
  const incomeResult = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM income_sources
     WHERE user_id = $1`,
    [userId]
  );
  const income = parseFloat(incomeResult.rows[0].total) || 0;

  // Fetch user's baseline expected expenses
  const expenseResult = await db.query(
    `SELECT COALESCE(SUM(monthly_amount), 0) AS total
     FROM user_expenses
     WHERE user_id = $1`,
    [userId]
  );
  const expectedExpenses = parseFloat(expenseResult.rows[0].total) || 0;

  // Compute this month's net
  const monthlyNet = income - expectedExpenses;

  // Get cumulative savings from the most recent prior month
  const prevRecord = await db.query(
    `SELECT cumulative_savings FROM monthly_records
     WHERE user_id = $1 AND month < $2
     ORDER BY month DESC LIMIT 1`,
    [userId, monthStr]
  );
  const prevCumulative = prevRecord.rows.length > 0
    ? parseFloat(prevRecord.rows[0].cumulative_savings) || 0
    : 0;

  const cumulativeSavings = prevCumulative + monthlyNet;

  // Insert the new record
  const insertResult = await db.query(
    `INSERT INTO monthly_records (user_id, month, income, expected_expenses, monthly_net, cumulative_savings)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, month) DO NOTHING
     RETURNING *`,
    [userId, monthStr, income, expectedExpenses, monthlyNet, cumulativeSavings]
  );

  return insertResult.rows[0] || (await db.query(
    `SELECT * FROM monthly_records WHERE user_id = $1 AND month = $2`,
    [userId, monthStr]
  )).rows[0];
}

// ============================================
// GET /api/monthly-record/current
// Returns the current month's record
// Auto-creates if it doesn't exist
// ============================================
async function getCurrentRecord(req, res) {
  try {
    const userId = req.user.id;
    const record = await ensureCurrentMonth(userId);

    return res.status(200).json({
      success: true,
      record: {
        month: record.month,
        income: parseFloat(record.income),
        expected_expenses: parseFloat(record.expected_expenses),
        actual_expenses: parseFloat(record.actual_expenses),
        monthly_net: parseFloat(record.monthly_net),
        cumulative_savings: parseFloat(record.cumulative_savings),
        confirmed: record.confirmed === true,
      },
    });
  } catch (error) {
    console.error('MonthlyRecord — getCurrentRecord error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch monthly record.',
      code: 'SERVER_ERROR',
    });
  }
}

// ============================================
// POST /api/monthly-record/seed-history
// Seeds records for all months since the user's
// account creation (backfills cumulative savings).
// Idempotent — skips months that already exist.
// ============================================
async function seedHistory(req, res) {
  try {
    const userId = req.user.id;

    // Get user creation date
    const userResult = await db.query(
      `SELECT created_at FROM users WHERE id = $1`,
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const createdAt = new Date(userResult.rows[0].created_at);
    const now = new Date();

    // Fetch baseline income and expenses
    const incomeResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM income_sources WHERE user_id = $1`,
      [userId]
    );
    const income = parseFloat(incomeResult.rows[0].total) || 0;

    const expenseResult = await db.query(
      `SELECT COALESCE(SUM(monthly_amount), 0) AS total FROM user_expenses WHERE user_id = $1`,
      [userId]
    );
    const expectedExpenses = parseFloat(expenseResult.rows[0].total) || 0;
    const monthlyNet = income - expectedExpenses;

    // Iterate from createdAt month to current month
    let cursor = new Date(createdAt.getFullYear(), createdAt.getMonth(), 1);
    let cumulative = 0;
    let seeded = 0;

    while (cursor <= now) {
      const monthStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-01`;

      // Check if exists
      const exists = await db.query(
        `SELECT cumulative_savings FROM monthly_records WHERE user_id = $1 AND month = $2`,
        [userId, monthStr]
      );

      if (exists.rows.length > 0) {
        cumulative = parseFloat(exists.rows[0].cumulative_savings) || 0;
      } else {
        cumulative += monthlyNet;
        await db.query(
          `INSERT INTO monthly_records (user_id, month, income, expected_expenses, monthly_net, cumulative_savings)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (user_id, month) DO NOTHING`,
          [userId, monthStr, income, expectedExpenses, monthlyNet, cumulative]
        );
        seeded++;
      }

      cursor.setMonth(cursor.getMonth() + 1);
    }

    return res.status(200).json({
      success: true,
      message: `Seeded ${seeded} monthly records.`,
      months_seeded: seeded,
    });
  } catch (error) {
    console.error('MonthlyRecord — seedHistory error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to seed monthly records.',
      code: 'SERVER_ERROR',
    });
  }
}

// ============================================
// PUT /api/monthly-record/confirm
// User confirms or updates this month's figures
// Body: { income, expected_expenses } or { same: true }
// ============================================
async function confirmRecord(req, res) {
  try {
    const userId = req.user.id;
    const monthStr = currentMonthDate();

    // Ensure a record exists first
    await ensureCurrentMonth(userId);

    const { same, income, expected_expenses } = req.body;

    if (same) {
      // User says "same as last month" — just mark confirmed
      await db.query(
        `UPDATE monthly_records SET confirmed = TRUE WHERE user_id = $1 AND month = $2`,
        [userId, monthStr]
      );
    } else {
      // User provided updated values
      const newIncome = parseFloat(income) || 0;
      const newExpenses = parseFloat(expected_expenses) || 0;
      const newNet = newIncome - newExpenses;

      // Get previous cumulative
      const prevRecord = await db.query(
        `SELECT cumulative_savings FROM monthly_records
         WHERE user_id = $1 AND month < $2
         ORDER BY month DESC LIMIT 1`,
        [userId, monthStr]
      );
      const prevCumulative = prevRecord.rows.length > 0
        ? parseFloat(prevRecord.rows[0].cumulative_savings) || 0
        : 0;

      const newCumulative = prevCumulative + newNet;

      // ── SCALE UNDERLYING ARRAYS SO CHARTS UPDATE ──
      // 1. Scale User Expenses
      const expResult = await db.query(`SELECT SUM(monthly_amount) as total FROM user_expenses WHERE user_id = $1 AND is_active = TRUE`, [userId]);
      const oldExpTotal = parseFloat(expResult.rows[0].total) || 0;

      if (oldExpTotal > 0 && newExpenses > 0) {
        const expRatio = newExpenses / oldExpTotal;
        await db.query(`UPDATE user_expenses SET monthly_amount = monthly_amount * $1 WHERE user_id = $2 AND is_active = TRUE`, [expRatio, userId]);
      } else if (oldExpTotal === 0 && newExpenses > 0) {
        await db.query(`INSERT INTO user_expenses (user_id, custom_label, monthly_amount) VALUES ($1, 'Manual Adjustment', $2)`, [userId, newExpenses]);
      } else if (newExpenses === 0) {
        await db.query(`UPDATE user_expenses SET monthly_amount = 0 WHERE user_id = $1 AND is_active = TRUE`, [userId]);
      }

      // 2. Scale User Income
      const incResult = await db.query(`SELECT SUM(amount) as total FROM income_sources WHERE user_id = $1 AND frequency = 'monthly' AND is_active = TRUE`, [userId]);
      const oldIncTotal = parseFloat(incResult.rows[0].total) || 0;

      if (oldIncTotal > 0 && newIncome > 0) {
        const incRatio = newIncome / oldIncTotal;
        await db.query(`UPDATE income_sources SET amount = amount * $1 WHERE user_id = $2 AND frequency = 'monthly' AND is_active = TRUE`, [incRatio, userId]);
      } else if (oldIncTotal === 0 && newIncome > 0) {
        await db.query(`INSERT INTO income_sources (user_id, source_name, amount, frequency, income_type) VALUES ($1, 'Manual Adjustment', $2, 'monthly', 'fixed')`, [userId, newIncome]);
      } else if (newIncome === 0) {
        await db.query(`UPDATE income_sources SET amount = 0 WHERE user_id = $1 AND frequency = 'monthly' AND is_active = TRUE`, [userId]);
      }
      // ───────────────────────────────────────────────

      await db.query(
        `UPDATE monthly_records
         SET income = $3, expected_expenses = $4, monthly_net = $5,
             cumulative_savings = $6, confirmed = TRUE
         WHERE user_id = $1 AND month = $2`,
        [userId, monthStr, newIncome, newExpenses, newNet, newCumulative]
      );
    }

    // Fetch updated record
    const updated = await db.query(
      `SELECT * FROM monthly_records WHERE user_id = $1 AND month = $2`,
      [userId, monthStr]
    );
    const record = updated.rows[0];

    return res.status(200).json({
      success: true,
      message: 'Monthly record confirmed.',
      record: {
        month: record.month,
        income: parseFloat(record.income),
        expected_expenses: parseFloat(record.expected_expenses),
        actual_expenses: parseFloat(record.actual_expenses),
        monthly_net: parseFloat(record.monthly_net),
        cumulative_savings: parseFloat(record.cumulative_savings),
        confirmed: true,
      },
    });
  } catch (error) {
    console.error('MonthlyRecord — confirmRecord error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to confirm monthly record.',
      code: 'SERVER_ERROR',
    });
  }
}

module.exports = {
  ensureTable,
  getCurrentRecord,
  seedHistory,
  confirmRecord,
};
