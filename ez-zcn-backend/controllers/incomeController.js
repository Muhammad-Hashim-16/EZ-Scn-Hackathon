// ============================================
// PennyWise — Income Controller
// Work profile + income sources CRUD
// ============================================

const db = require('../config/db');

// ──────────────────────────────────────────
// Helper: Calculate hourly wage
// ──────────────────────────────────────────
async function calculateHourlyWage(userId, dailyHours, monthlyDays) {
  const result = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS total_monthly
     FROM income_sources
     WHERE user_id = $1 AND is_active = TRUE AND frequency = 'monthly'`,
    [userId]
  );

  const totalMonthly = parseFloat(result.rows[0].total_monthly);
  if (!dailyHours || !monthlyDays || dailyHours <= 0 || monthlyDays <= 0) {
    return 0;
  }

  return Math.round((totalMonthly / (dailyHours * monthlyDays)) * 100) / 100;
}

// ============================================
// POST /api/income/work-profile
// Upsert work profile for authenticated user
// ============================================
async function upsertWorkProfile(req, res) {
  try {
    const userId = req.user.id;
    const {
      daily_work_hours,
      work_days_per_month,
      home_address,
      office_address,
      vehicle_type,
      fuel_type,
      vehicle_fuel_avg,
    } = req.body;

    // Calculate hourly wage from income sources
    const hourlyWage = await calculateHourlyWage(userId, daily_work_hours, work_days_per_month);

    // Check if profile already exists
    const existing = await db.query(
      'SELECT id FROM work_profiles WHERE user_id = $1',
      [userId]
    );

    let result;

    if (existing.rows.length > 0) {
      // UPDATE
      result = await db.query(
        `UPDATE work_profiles SET
          daily_work_hours = $1,
          work_days_per_month = $2,
          home_address = $3,
          office_address = $4,
          vehicle_type = $5,
          fuel_type = $6,
          vehicle_fuel_avg = $7,
          updated_at = NOW()
        WHERE user_id = $8
        RETURNING *`,
        [
          daily_work_hours,
          work_days_per_month,
          home_address || null,
          office_address || null,
          vehicle_type,
          fuel_type,
          vehicle_fuel_avg || null,
          userId,
        ]
      );
    } else {
      // INSERT
      result = await db.query(
        `INSERT INTO work_profiles (
          user_id, daily_work_hours, work_days_per_month,
          home_address, office_address,
          vehicle_type, fuel_type, vehicle_fuel_avg
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          userId,
          daily_work_hours,
          work_days_per_month,
          home_address || null,
          office_address || null,
          vehicle_type,
          fuel_type,
          vehicle_fuel_avg || null,
        ]
      );
    }

    return res.status(200).json({
      success: true,
      workProfile: result.rows[0],
      calculated_hourly_wage: hourlyWage,
    });
  } catch (error) {
    console.error('Income Controller — upsertWorkProfile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
      code: 'SERVER_ERROR',
    });
  }
}

// ============================================
// GET /api/income/work-profile
// Return work profile for authenticated user
// ============================================
async function getWorkProfile(req, res) {
  try {
    const userId = req.user.id;

    const result = await db.query(
      'SELECT * FROM work_profiles WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Work profile not found. Please set up your work profile.',
        code: 'WORK_PROFILE_NOT_FOUND',
      });
    }

    const profile = result.rows[0];

    // Also return calculated hourly wage
    const hourlyWage = await calculateHourlyWage(
      userId,
      parseFloat(profile.daily_work_hours),
      profile.work_days_per_month
    );

    return res.status(200).json({
      success: true,
      workProfile: profile,
      calculated_hourly_wage: hourlyWage,
    });
  } catch (error) {
    console.error('Income Controller — getWorkProfile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
      code: 'SERVER_ERROR',
    });
  }
}

// ============================================
// POST /api/income/sources
// Create a new income source
// ============================================
async function createIncomeSource(req, res) {
  try {
    const userId = req.user.id;
    const { source_name, amount, frequency, income_type, expected_month_day, notes } = req.body;

    const result = await db.query(
      `INSERT INTO income_sources (
        user_id, source_name, amount, frequency, income_type,
        expected_month_day, notes, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
      RETURNING *`,
      [
        userId,
        source_name.trim(),
        amount,
        frequency,
        income_type,
        expected_month_day || null,
        notes || null,
      ]
    );

    return res.status(201).json({
      success: true,
      incomeSource: result.rows[0],
    });
  } catch (error) {
    console.error('Income Controller — createIncomeSource error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
      code: 'SERVER_ERROR',
    });
  }
}

// ============================================
// GET /api/income/sources
// List all active income sources + aggregates
// ============================================
async function getIncomeSources(req, res) {
  try {
    const userId = req.user.id;

    // Fetch all active sources
    const sourcesResult = await db.query(
      `SELECT * FROM income_sources
       WHERE user_id = $1 AND is_active = TRUE
       ORDER BY created_at DESC`,
      [userId]
    );

    // Calculate aggregates
    const aggResult = await db.query(
      `SELECT
         COALESCE(SUM(CASE WHEN income_type = 'fixed' AND frequency = 'monthly' THEN amount ELSE 0 END), 0) AS total_fixed_income,
         COALESCE(SUM(CASE WHEN income_type = 'variable' THEN amount ELSE 0 END), 0) AS total_variable_income
       FROM income_sources
       WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    );

    const { total_fixed_income, total_variable_income } = aggResult.rows[0];

    // Calculate hourly wage from work profile
    let calculatedHourlyWage = 0;
    const wpResult = await db.query(
      'SELECT daily_work_hours, work_days_per_month FROM work_profiles WHERE user_id = $1',
      [userId]
    );

    if (wpResult.rows.length > 0) {
      const wp = wpResult.rows[0];
      calculatedHourlyWage = await calculateHourlyWage(
        userId,
        parseFloat(wp.daily_work_hours),
        wp.work_days_per_month
      );
    }

    return res.status(200).json({
      success: true,
      sources: sourcesResult.rows,
      total_fixed_income: parseFloat(total_fixed_income),
      total_variable_income: parseFloat(total_variable_income),
      calculated_hourly_wage: calculatedHourlyWage,
    });
  } catch (error) {
    console.error('Income Controller — getIncomeSources error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
      code: 'SERVER_ERROR',
    });
  }
}

// ============================================
// DELETE /api/income/sources/:id
// Soft delete (set is_active = false)
// ============================================
async function deleteIncomeSource(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await db.query(
      `UPDATE income_sources
       SET is_active = FALSE
       WHERE id = $1 AND user_id = $2 AND is_active = TRUE
       RETURNING id, source_name`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Income source not found or already deleted.',
        code: 'NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Income source "${result.rows[0].source_name}" removed.`,
      deleted: result.rows[0],
    });
  } catch (error) {
    console.error('Income Controller — deleteIncomeSource error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
      code: 'SERVER_ERROR',
    });
  }
}

module.exports = {
  upsertWorkProfile,
  getWorkProfile,
  createIncomeSource,
  getIncomeSources,
  deleteIncomeSource,
};
