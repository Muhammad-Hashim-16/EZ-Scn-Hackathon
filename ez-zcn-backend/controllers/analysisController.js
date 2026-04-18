// ============================================
// PennyWise — Analysis Controller
// With in-memory cache (Redis-compatible interface)
// ============================================

const { analyzeFinances, quickHealth } = require('../services/analysisService');
const db = require('../config/db');

// ──────────────────────────────────────────
// In-memory cache with TTL (swap for Redis later)
// To use Redis instead, replace this block with:
//   const Redis = require('ioredis');
//   const cache = new Redis(process.env.REDIS_URL);
// ──────────────────────────────────────────
const cacheStore = new Map();

const cache = {
  async get(key) {
    const entry = cacheStore.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      cacheStore.delete(key);
      return null;
    }
    return entry.value;
  },
  async set(key, value, ttlSeconds) {
    cacheStore.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  },
  async del(key) {
    // Delete all keys matching a prefix pattern
    for (const k of cacheStore.keys()) {
      if (k.startsWith(key)) cacheStore.delete(k);
    }
  },
};

// Helper: cache key for current month
function getCacheKey(userId) {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `analysis_${userId}_${month}`;
}

// Helper: explicit cache flush for other controllers
async function clearAnalysisCache(userId) {
  await cache.del(`analysis_${userId}`);
}

// ============================================
// GET /api/analysis/monthly
// Full analysis — cached for 1 hour
// ============================================
async function getMonthlyAnalysis(req, res) {
  try {
    const userId = req.user.id;
    const cacheKey = getCacheKey(userId);

    // Try cache first
    try {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.status(200).json({
          success: true,
          cached: true,
          analysis: typeof cached === 'string' ? JSON.parse(cached) : cached,
        });
      }
    } catch {
      // Cache unavailable — continue without it
    }

    // Run fresh analysis
    const analysis = await analyzeFinances(userId);

    // Store in cache (1 hour = 3600 seconds)
    try {
      await cache.set(cacheKey, JSON.stringify(analysis), 3600);
    } catch {
      // Cache write failed — non-fatal
    }

    return res.status(200).json({
      success: true,
      cached: false,
      analysis,
    });
  } catch (error) {
    console.error('Analysis Controller — getMonthlyAnalysis error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate financial analysis.',
      code: 'SERVER_ERROR',
    });
  }
}

// ============================================
// GET /api/analysis/history
// Last 6 monthly snapshots for trend charts
// ============================================
async function getHistory(req, res) {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT snapshot_month, total_income, total_expenses,
              total_savings, inflation_rate, savings_rate
       FROM monthly_snapshots
       WHERE user_id = $1
       ORDER BY snapshot_month DESC
       LIMIT 6`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      snapshots: result.rows.reverse(), // chronological order
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Analysis Controller — getHistory error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
      code: 'SERVER_ERROR',
    });
  }
}

// ============================================
// POST /api/analysis/refresh
// Force fresh analysis — bypasses cache
// ============================================
async function refreshAnalysis(req, res) {
  try {
    const userId = req.user.id;

    // Invalidate cache
    try {
      await cache.del(`analysis_${userId}`);
    } catch {
      // Cache unavailable — continue
    }

    // Run fresh analysis
    const analysis = await analyzeFinances(userId);

    // Re-cache the fresh result
    try {
      await cache.set(getCacheKey(userId), JSON.stringify(analysis), 3600);
    } catch {
      // Cache write failed — non-fatal
    }

    return res.status(200).json({
      success: true,
      message: 'Analysis refreshed and snapshot saved.',
      analysis,
    });
  } catch (error) {
    console.error('Analysis Controller — refreshAnalysis error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to refresh analysis.',
      code: 'SERVER_ERROR',
    });
  }
}

// ============================================
// GET /api/analysis/quick-health
// Lightweight — dashboard header badge
// Returns only: health_status, net_savings,
//   savings_rate, financial_health_score
// ============================================
async function getQuickHealth(req, res) {
  try {
    const health = await quickHealth(req.user.id);

    return res.status(200).json({
      success: true,
      ...health,
    });
  } catch (error) {
    console.error('Analysis Controller — getQuickHealth error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate health status.',
      code: 'SERVER_ERROR',
    });
  }
}

// ============================================
// GET /api/analysis/dashboard  (kept for compat)
// ============================================
async function getDashboardAnalysis(req, res) {
  return getMonthlyAnalysis(req, res);
}

// ============================================
// GET /api/analysis/snapshot/:month
// ============================================
async function getSnapshot(req, res) {
  try {
    const { month } = req.params;
    const userId = req.user.id;

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid month format. Use YYYY-MM.',
        code: 'VALIDATION_ERROR',
      });
    }

    const result = await db.query(
      `SELECT * FROM monthly_snapshots
       WHERE user_id = $1 AND snapshot_month = $2`,
      [userId, `${month}-01`]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No snapshot found for this month.',
        code: 'NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      snapshot: result.rows[0],
    });
  } catch (error) {
    console.error('Analysis Controller — getSnapshot error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
      code: 'SERVER_ERROR',
    });
  }
}

// ============================================
// GET /api/analysis/trends (12 months)
// ============================================
async function getTrends(req, res) {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT snapshot_month, total_income, total_expenses,
              total_savings, inflation_rate, savings_rate
       FROM monthly_snapshots
       WHERE user_id = $1
       ORDER BY snapshot_month DESC
       LIMIT 12`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      trends: result.rows.reverse(),
    });
  } catch (error) {
    console.error('Analysis Controller — getTrends error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
      code: 'SERVER_ERROR',
    });
  }
}

module.exports = {
  getMonthlyAnalysis,
  getHistory,
  refreshAnalysis,
  getQuickHealth,
  getDashboardAnalysis,
  getSnapshot,
  getTrends,
  clearAnalysisCache,
};
