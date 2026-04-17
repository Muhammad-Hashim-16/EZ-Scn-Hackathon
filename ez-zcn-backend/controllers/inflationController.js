// ============================================
// PennyWise — Inflation Controller
// ============================================

const inflationService = require('../services/inflationService');
const db = require('../config/db');

// ============================================
// GET /api/inflation/latest
// Returns all current prices from cache
// Fast endpoint — just a DB read
// ============================================
async function getLatest(req, res) {
  try {
    const data = await inflationService.getLatestPrices();

    return res.status(200).json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error('Inflation Controller — getLatest error:', error);

    // Even on DB error, return a safe fallback — NEVER error to frontend
    return res.status(200).json({
      success: true,
      petrol: null,
      chicken_broiler: null,
      chicken_desi: null,
      cooking_oil: null,
      atta: null,
      inflation_rate: null,
      last_updated: null,
      stale: true,
      prices: [],
    });
  }
}

// ============================================
// GET /api/inflation/history/:item
// Returns last 30 days of prices for a
// specific item. Used for trend charts.
// ============================================
async function getHistory(req, res) {
  try {
    const { item } = req.params;

    // Whitelist allowed data types
    const allowed = [
      'petrol_price', 'chicken_broiler', 'chicken_desi',
      'cooking_oil', 'atta', 'cpi',
    ];

    if (!allowed.includes(item)) {
      return res.status(400).json({
        success: false,
        error: `Invalid item. Allowed: ${allowed.join(', ')}`,
        code: 'VALIDATION_ERROR',
      });
    }

    const history = await inflationService.getPriceHistory(item, 30);

    return res.status(200).json({
      success: true,
      item,
      data_points: history.length,
      history,
    });
  } catch (error) {
    console.error('Inflation Controller — getHistory error:', error);
    return res.status(200).json({
      success: true,
      item: req.params.item,
      data_points: 0,
      history: [],
      stale: true,
    });
  }
}

// ============================================
// GET /api/inflation/impact/:userId
// Calculates how inflation affects a specific
// user's monthly expenses.
// ============================================
async function getImpact(req, res) {
  try {
    const userId = req.user.id;

    // Get current inflation rate
    const cachedCpi = await inflationService.getCached('cpi');
    const annualRate = cachedCpi ? cachedCpi.value : 12.0;
    const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1;

    // Get user's expenses grouped by parent category
    const expResult = await db.query(
      `SELECT
         COALESCE(pc.category_name, ec.category_name) AS category,
         SUM(ue.monthly_amount) AS total
       FROM user_expenses ue
       JOIN expense_categories ec ON ue.category_id = ec.id
       LEFT JOIN expense_categories pc ON ec.parent_category_id = pc.id
       WHERE ue.user_id = $1 AND ue.is_active = TRUE
       GROUP BY category
       ORDER BY total DESC`,
      [userId]
    );

    const categories = expResult.rows;
    const totalExpenses = categories.reduce(
      (s, c) => s + parseFloat(c.total || 0), 0
    );

    // Monthly inflation impact per category
    const affectedCategories = categories.map((cat) => {
      const amount = parseFloat(cat.total);
      const impact = amount * monthlyRate;
      return {
        category: cat.category,
        monthly_amount: Math.round(amount * 100) / 100,
        monthly_inflation_impact: Math.round(impact * 100) / 100,
        annual_inflation_impact: Math.round(impact * 12 * 100) / 100,
      };
    });

    // Total impact
    const monthlyImpact = Math.round(totalExpenses * monthlyRate * 100) / 100;
    const biggestImpact = affectedCategories.length > 0
      ? affectedCategories[0]
      : null;

    return res.status(200).json({
      success: true,
      inflation_rate: annualRate,
      monthly_inflation_rate: Math.round(monthlyRate * 10000) / 100,
      monthly_impact_pkr: monthlyImpact,
      annual_impact_pkr: Math.round(monthlyImpact * 12 * 100) / 100,
      total_monthly_expenses: Math.round(totalExpenses * 100) / 100,
      affected_categories: affectedCategories,
      biggest_impact_item: biggestImpact,
    });
  } catch (error) {
    console.error('Inflation Controller — getImpact error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate inflation impact.',
      code: 'SERVER_ERROR',
    });
  }
}

module.exports = {
  getLatest,
  getHistory,
  getImpact,
};
