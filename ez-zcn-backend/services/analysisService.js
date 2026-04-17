// ============================================
// PennyWise — Financial Analysis Engine
// Core service: analyzeFinances(userId)
// ============================================

const db = require('../config/db');

// ──────────────────────────────────────────
// MAIN: analyzeFinances(userId)
// ──────────────────────────────────────────
async function analyzeFinances(userId) {

  // ═══════════════════════════════════════════
  // STEP 1 — Gather Data
  // ═══════════════════════════════════════════

  // 1a. Income sources
  const incomeResult = await db.query(
    `SELECT id, source_name, amount, frequency, income_type
     FROM income_sources
     WHERE user_id = $1 AND is_active = TRUE`,
    [userId]
  );
  const incomeSources = incomeResult.rows;

  // 1b. All active expenses with category info
  const expenseResult = await db.query(
    `SELECT
       ue.id, ue.category_id, ue.monthly_amount, ue.custom_label,
       ec.category_name,
       ec.parent_category_id,
       COALESCE(pc.category_name, ec.category_name) AS parent_category_name,
       COALESCE(pc.id, ec.id) AS parent_id
     FROM user_expenses ue
     LEFT JOIN expense_categories ec ON ue.category_id = ec.id
     LEFT JOIN expense_categories pc ON ec.parent_category_id = pc.id
     WHERE ue.user_id = $1 AND ue.is_active = TRUE`,
    [userId]
  );
  const expenses = expenseResult.rows;

  // 1c. Savings goals
  const goalsResult = await db.query(
    `SELECT id, goal_name, target_amount, current_amount, monthly_deduction,
            target_date, is_completed
     FROM savings_goals
     WHERE user_id = $1`,
    [userId]
  );
  const goals = goalsResult.rows;

  // 1d. Work profile
  const wpResult = await db.query(
    `SELECT daily_work_hours, work_days_per_month
     FROM work_profiles WHERE user_id = $1`,
    [userId]
  );
  const workProfile = wpResult.rows[0] || null;

  // ═══════════════════════════════════════════
  // STEP 2 — Calculate Core Numbers
  // ═══════════════════════════════════════════

  const totalIncome = incomeSources
    .filter((s) => s.frequency === 'monthly' && s.income_type === 'fixed')
    .reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);

  const totalExpenses = expenses.reduce(
    (sum, e) => sum + parseFloat(e.monthly_amount || 0), 0
  );

  const goalDeductions = goals.reduce(
    (sum, g) => sum + parseFloat(g.monthly_deduction || 0), 0
  );

  const netSavings = totalIncome - totalExpenses - goalDeductions;
  const savingsRate = totalIncome > 0
    ? Math.round((netSavings / totalIncome) * 10000) / 100
    : 0;

  // Expenses grouped by parent category
  const categoryMap = {};
  for (const exp of expenses) {
    const parentName = exp.parent_category_name;
    const parentId = exp.parent_id;
    if (!categoryMap[parentId]) {
      categoryMap[parentId] = {
        parent_id: parentId,
        parent_category_name: parentName,
        total: 0,
        items: [],
      };
    }
    const amt = parseFloat(exp.monthly_amount || 0);
    categoryMap[parentId].total += amt;
    categoryMap[parentId].items.push({
      id: exp.id,
      category_name: exp.category_name,
      custom_label: exp.custom_label,
      monthly_amount: amt,
    });
  }

  const expensesBreakdown = Object.values(categoryMap).map((cat) => ({
    ...cat,
    total: round2(cat.total),
    percentage: totalIncome > 0
      ? round2((cat.total / totalIncome) * 100)
      : 0,
  }));

  // ═══════════════════════════════════════════
  // STEP 3 — Get Inflation Rate
  // ═══════════════════════════════════════════

  let annualInflationRate = 12.0; // fallback default for Pakistan
  try {
    const inflResult = await db.query(
      `SELECT value FROM inflation_cache
       WHERE data_type = 'cpi'
       ORDER BY fetched_at DESC LIMIT 1`
    );
    if (inflResult.rows.length > 0) {
      annualInflationRate = parseFloat(inflResult.rows[0].value);
    }
  } catch {
    // Use fallback
  }

  // ═══════════════════════════════════════════
  // STEP 4 — Real (Inflation-Adjusted) Savings
  // ═══════════════════════════════════════════

  const monthlyInflation = Math.pow(1 + annualInflationRate / 100, 1 / 12) - 1;
  const realSavings = round2(netSavings * (1 - monthlyInflation));

  // ═══════════════════════════════════════════
  // STEP 5 — Classify Health Status
  // ═══════════════════════════════════════════

  const debtTotal = getCategoryTotal(expensesBreakdown, 'Debt Repayments');
  const groceryTotal = getCategoryTotal(expensesBreakdown, 'Grocery');
  const rentTotal = getCategoryTotal(expensesBreakdown, 'Housing');

  const debtPercentage = totalIncome > 0 ? debtTotal / totalIncome : 0;
  const groceryPercentage = totalIncome > 0 ? groceryTotal / totalIncome : 0;
  const rentPercentage = totalIncome > 0 ? rentTotal / totalIncome : 0;

  const flags = {
    debt_heavy: debtPercentage > 0.25,
    grocery_high: groceryPercentage > 0.25,
    rent_high: rentPercentage > 0.35,
    no_savings: netSavings <= 0,
  };

  // Find max single category percentage
  const maxCategoryPercent = expensesBreakdown.reduce(
    (max, cat) => Math.max(max, cat.percentage), 0
  );

  let healthStatus;
  if (
    savingsRate >= 20 &&
    maxCategoryPercent <= 40 &&
    debtPercentage < 0.30
  ) {
    healthStatus = 'safe';
  } else if (
    savingsRate >= 5 ||
    (savingsRate >= 20 && maxCategoryPercent > 40)
  ) {
    healthStatus = 'edge';
  } else {
    healthStatus = 'red';
  }

  // ═══════════════════════════════════════════
  // STEP 6 — Generate Recommendations
  // ═══════════════════════════════════════════

  const recommendations = [];

  // Grocery > 20%
  if (groceryPercentage > 0.20 && totalIncome > 0) {
    const recommended = round2(totalIncome * 0.20);
    recommendations.push({
      category: 'Grocery & Household Supplies',
      current_amount: round2(groceryTotal),
      recommended_amount: recommended,
      potential_savings: round2(groceryTotal - recommended),
      priority: groceryPercentage > 0.30 ? 'critical' : 'high',
      message: `Your grocery spending is ${round2(groceryPercentage * 100)}% of income. Aim for 20% or below. Consider price comparison across markets.`,
    });
  }

  // Rent > 35%
  if (rentPercentage > 0.35 && totalIncome > 0) {
    recommendations.push({
      category: 'Housing',
      current_amount: round2(rentTotal),
      recommended_amount: round2(totalIncome * 0.35),
      potential_savings: round2(rentTotal - totalIncome * 0.35),
      priority: 'medium',
      message: `Rent/housing is ${round2(rentPercentage * 100)}% of income (above the 35% benchmark). Consider if downsizing or relocating is feasible.`,
    });
  }

  // Subscriptions > 5%
  const subTotal = getCategoryTotal(expensesBreakdown, 'Subscriptions');
  const subPct = totalIncome > 0 ? subTotal / totalIncome : 0;
  if (subPct > 0.05) {
    recommendations.push({
      category: 'Subscriptions & Entertainment',
      current_amount: round2(subTotal),
      recommended_amount: round2(totalIncome * 0.05),
      potential_savings: round2(subTotal - totalIncome * 0.05),
      priority: 'medium',
      message: `Subscriptions are ${round2(subPct * 100)}% of income. Review which services you actively use.`,
    });
  }

  // Debt > 25%
  if (debtPercentage > 0.25) {
    recommendations.push({
      category: 'Debt Repayments',
      current_amount: round2(debtTotal),
      recommended_amount: round2(totalIncome * 0.25),
      potential_savings: round2(debtTotal - totalIncome * 0.25),
      priority: 'critical',
      message: `Debt is ${round2(debtPercentage * 100)}% of income. Consider debt consolidation or the avalanche method to reduce interest.`,
    });
  }

  // Eating out (check individual expense items)
  const eatingOut = findExpenseByName(expenses, 'Eating Out');
  const eatingPct = totalIncome > 0 && eatingOut ? eatingOut / totalIncome : 0;
  if (eatingPct > 0.10) {
    recommendations.push({
      category: 'Eating Out / Restaurants',
      current_amount: round2(eatingOut),
      recommended_amount: round2(eatingOut * 0.5),
      potential_savings: round2(eatingOut * 0.5),
      priority: 'high',
      message: `Eating out is ${round2(eatingPct * 100)}% of income. Reducing by 50% could save PKR ${round2(eatingOut * 0.5).toLocaleString()}/month.`,
    });
  }

  // Household help in edge/red
  if (healthStatus !== 'safe') {
    const helpTotal = getCategoryTotal(expensesBreakdown, 'Household Help');
    if (helpTotal > 0) {
      recommendations.push({
        category: 'Household Help',
        current_amount: round2(helpTotal),
        recommended_amount: round2(helpTotal * 0.7),
        potential_savings: round2(helpTotal * 0.3),
        priority: 'low',
        message: `Consider reducing household help frequency. Reducing by 30% could save PKR ${round2(helpTotal * 0.3).toLocaleString()}/month.`,
      });
    }
  }

  // Custom expense > 15% of income
  for (const exp of expenses) {
    if (exp.custom_label) {
      const amt = parseFloat(exp.monthly_amount || 0);
      const pct = totalIncome > 0 ? amt / totalIncome : 0;
      if (pct > 0.15) {
        recommendations.push({
          category: `Custom: ${exp.custom_label}`,
          current_amount: round2(amt),
          recommended_amount: round2(totalIncome * 0.15),
          potential_savings: round2(amt - totalIncome * 0.15),
          priority: 'high',
          message: `"${exp.custom_label}" is ${round2(pct * 100)}% of income. Review if this can be reduced.`,
        });
      }
    }
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // ═══════════════════════════════════════════
  // STEP 7 — 6-Month Depreciation Projection
  // ═══════════════════════════════════════════

  const sixMonthProjection = [];
  for (let m = 1; m <= 6; m++) {
    const projected = round2(netSavings * Math.pow(1 - monthlyInflation, m));
    sixMonthProjection.push({
      month: m,
      nominal_savings: round2(netSavings),
      real_value: projected,
      purchasing_power_loss: round2(netSavings - projected),
      cumulative_nominal: round2(netSavings * m),
      cumulative_real: round2(projected * m),
    });
  }

  // ═══════════════════════════════════════════
  // STEP 8 — Hourly Wage & Life-Hours
  // ═══════════════════════════════════════════

  let hourlyWage = 0;
  const lifeHoursBreakdown = [];

  if (workProfile) {
    const dailyHours = parseFloat(workProfile.daily_work_hours || 0);
    const monthlyDays = parseInt(workProfile.work_days_per_month || 0, 10);
    const totalMonthlyHours = dailyHours * monthlyDays;

    if (totalMonthlyHours > 0) {
      hourlyWage = round2(totalIncome / totalMonthlyHours);

      // Top 5 expenses by amount
      const sortedExpenses = [...expenses]
        .sort((a, b) => parseFloat(b.monthly_amount || 0) - parseFloat(a.monthly_amount || 0))
        .slice(0, 5);

      for (const exp of sortedExpenses) {
        const amt = parseFloat(exp.monthly_amount || 0);
        const hours = hourlyWage > 0 ? round2(amt / hourlyWage) : 0;
        lifeHoursBreakdown.push({
          expense_name: exp.custom_label || exp.category_name,
          monthly_amount: round2(amt),
          hours_worked: hours,
          days_worked: round2(hours / dailyHours),
        });
      }
    }
  }

  // ═══════════════════════════════════════════
  // STEP 9 — Save Monthly Snapshot
  // ═══════════════════════════════════════════

  try {
    await db.query(
      `INSERT INTO monthly_snapshots (
        user_id, snapshot_month,
        total_income, total_expenses, total_savings,
        inflation_rate, savings_rate
      ) VALUES ($1, date_trunc('month', NOW()), $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, snapshot_month)
      DO UPDATE SET
        total_income = $2,
        total_expenses = $3,
        total_savings = $4,
        inflation_rate = $5,
        savings_rate = $6`,
      [userId, totalIncome, totalExpenses, netSavings, annualInflationRate, savingsRate]
    );
  } catch (err) {
    console.error('Analysis Service — snapshot save error:', err.message);
    // Non-fatal: continue even if snapshot fails
  }

  // ═══════════════════════════════════════════
  // STEP 10 — Financial Health Score (0-100)
  // ═══════════════════════════════════════════

  // Base: savings_rate × 2 (max 40)
  const baseScore = Math.min(40, Math.max(0, savingsRate * 2));

  // Debt score: 20 - (debt_percentage × 0.67) (max 20)
  const debtScore = Math.min(20, Math.max(0, 20 - (debtPercentage * 100 * 0.67)));

  // Category concentration: 20 if no single > 35%, else penalize
  let categoryScore = 20;
  if (maxCategoryPercent > 35) {
    categoryScore = Math.max(0, 20 - ((maxCategoryPercent - 35) * 2));
  }

  // Goal score: 10 on track, 5 behind, 0 none
  let goalScore = 0;
  if (goals.length > 0) {
    const onTrack = goals.filter((g) => {
      const current = parseFloat(g.current_amount || 0);
      const target = parseFloat(g.target_amount || 1);
      return current / target >= 0.5 || g.is_completed;
    });
    goalScore = onTrack.length >= goals.length * 0.5 ? 10 : 5;
  }

  // Inflation score: 10 if real_savings > 0
  const inflationScore = realSavings > 0 ? 10 : 0;

  const financialHealthScore = Math.min(
    100,
    Math.round(baseScore + debtScore + categoryScore + goalScore + inflationScore)
  );

  // ═══════════════════════════════════════════
  // Build goal status
  // ═══════════════════════════════════════════

  const goalStatus = goals.map((g) => {
    const target = parseFloat(g.target_amount || 0);
    const current = parseFloat(g.current_amount || 0);
    const monthly = parseFloat(g.monthly_deduction || 0);
    const progress = target > 0 ? round2((current / target) * 100) : 0;
    const remaining = Math.max(0, target - current);
    const monthsLeft = monthly > 0 ? Math.ceil(remaining / monthly) : Infinity;

    return {
      id: g.id,
      goal_name: g.goal_name,
      target_amount: target,
      current_amount: current,
      monthly_deduction: monthly,
      progress_percent: progress,
      remaining_amount: round2(remaining),
      estimated_months_left: monthsLeft === Infinity ? null : monthsLeft,
      is_completed: g.is_completed,
      status: g.is_completed ? 'completed' : progress >= 50 ? 'on_track' : 'behind',
    };
  });

  // ═══════════════════════════════════════════
  // RETURN COMPLETE ANALYSIS
  // ═══════════════════════════════════════════

  return {
    health_status: healthStatus,
    financial_health_score: financialHealthScore,
    total_income: round2(totalIncome),
    total_expenses: round2(totalExpenses),
    goal_deductions: round2(goalDeductions),
    net_savings: round2(netSavings),
    savings_rate: round2(savingsRate),
    real_savings: realSavings,
    inflation_rate: annualInflationRate,
    monthly_inflation: round2(monthlyInflation * 100),
    expenses_breakdown: expensesBreakdown,
    recommendations,
    flags,
    six_month_projection: sixMonthProjection,
    hourly_wage: hourlyWage,
    life_hours_breakdown: lifeHoursBreakdown,
    goal_status: goalStatus,
    score_breakdown: {
      base: round2(baseScore),
      debt: round2(debtScore),
      category: round2(categoryScore),
      goals: goalScore,
      inflation: inflationScore,
    },
    generated_at: new Date().toISOString(),
  };
}

// ──────────────────────────────────────────
// LIGHTWEIGHT: quickHealth(userId)
// Runs Steps 1-5 + score only (no projections,
// no life-hours, no snapshot). Used by header badge.
// ──────────────────────────────────────────
async function quickHealth(userId) {
  // Income
  const incomeResult = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM income_sources
     WHERE user_id = $1 AND is_active = TRUE
       AND frequency = 'monthly' AND income_type = 'fixed'`,
    [userId]
  );
  const totalIncome = parseFloat(incomeResult.rows[0].total);

  // Expenses
  const expenseResult = await db.query(
    `SELECT COALESCE(SUM(monthly_amount), 0) AS total
     FROM user_expenses
     WHERE user_id = $1 AND is_active = TRUE`,
    [userId]
  );
  const totalExpenses = parseFloat(expenseResult.rows[0].total);

  // Goal deductions
  const goalResult = await db.query(
    `SELECT COALESCE(SUM(monthly_deduction), 0) AS total
     FROM savings_goals WHERE user_id = $1`,
    [userId]
  );
  const goalDeductions = parseFloat(goalResult.rows[0].total);

  // Core math
  const netSavings = totalIncome - totalExpenses - goalDeductions;
  const savingsRate = totalIncome > 0
    ? round2((netSavings / totalIncome) * 100)
    : 0;

  // Debt percentage (single query)
  const debtResult = await db.query(
    `SELECT COALESCE(SUM(ue.monthly_amount), 0) AS total
     FROM user_expenses ue
     JOIN expense_categories ec ON ue.category_id = ec.id
     LEFT JOIN expense_categories pc ON ec.parent_category_id = pc.id
     WHERE ue.user_id = $1 AND ue.is_active = TRUE
       AND (COALESCE(pc.category_name, ec.category_name) ILIKE '%debt%')`,
    [userId]
  );
  const debtTotal = parseFloat(debtResult.rows[0].total);
  const debtPercentage = totalIncome > 0 ? debtTotal / totalIncome : 0;

  // Max category %
  const catResult = await db.query(
    `SELECT COALESCE(pc.category_name, ec.category_name) AS parent_name,
            SUM(ue.monthly_amount) AS cat_total
     FROM user_expenses ue
     JOIN expense_categories ec ON ue.category_id = ec.id
     LEFT JOIN expense_categories pc ON ec.parent_category_id = pc.id
     WHERE ue.user_id = $1 AND ue.is_active = TRUE
     GROUP BY parent_name`,
    [userId]
  );
  const maxCatPct = catResult.rows.reduce((max, r) => {
    const pct = totalIncome > 0 ? (parseFloat(r.cat_total) / totalIncome) * 100 : 0;
    return Math.max(max, pct);
  }, 0);

  // Health status
  let healthStatus;
  if (savingsRate >= 20 && maxCatPct <= 40 && debtPercentage < 0.30) {
    healthStatus = 'safe';
  } else if (savingsRate >= 5 || (savingsRate >= 20 && maxCatPct > 40)) {
    healthStatus = 'edge';
  } else {
    healthStatus = 'red';
  }

  // Inflation
  let realSavings = netSavings;
  try {
    const inflResult = await db.query(
      `SELECT value FROM inflation_cache WHERE data_type = 'cpi' ORDER BY fetched_at DESC LIMIT 1`
    );
    if (inflResult.rows.length > 0) {
      const monthlyInfl = Math.pow(1 + parseFloat(inflResult.rows[0].value) / 100, 1 / 12) - 1;
      realSavings = round2(netSavings * (1 - monthlyInfl));
    }
  } catch { /* fallback */ }

  // Health score (same formula)
  const baseScore = Math.min(40, Math.max(0, savingsRate * 2));
  const debtScore = Math.min(20, Math.max(0, 20 - (debtPercentage * 100 * 0.67)));
  let categoryScore = 20;
  if (maxCatPct > 35) categoryScore = Math.max(0, 20 - ((maxCatPct - 35) * 2));
  const inflationScore = realSavings > 0 ? 10 : 0;

  // Quick goal check
  const goalsCheck = await db.query(
    `SELECT COUNT(*) AS total,
            COUNT(*) FILTER (WHERE current_amount::numeric / GREATEST(target_amount::numeric, 1) >= 0.5 OR is_completed) AS on_track
     FROM savings_goals WHERE user_id = $1`,
    [userId]
  );
  const { total: gTotal, on_track: gOnTrack } = goalsCheck.rows[0];
  const goalScore = parseInt(gTotal) > 0
    ? (parseInt(gOnTrack) >= parseInt(gTotal) * 0.5 ? 10 : 5)
    : 0;

  const financialHealthScore = Math.min(
    100,
    Math.round(baseScore + debtScore + categoryScore + goalScore + inflationScore)
  );

  // Hourly wage for life-hours context
  let hourlyWage = 0;
  try {
    const wageResult = await db.query(
      'SELECT hourly_wage FROM work_profiles WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    if (wageResult.rows.length > 0) {
      hourlyWage = parseFloat(wageResult.rows[0].hourly_wage) || 0;
    }
  } catch { /* fallback */ }

  return {
    health_status: healthStatus,
    financial_health_score: financialHealthScore,
    total_income: round2(totalIncome),
    total_expenses: round2(totalExpenses),
    net_savings: round2(netSavings),
    savings_rate: round2(savingsRate),
    hourly_wage: round2(hourlyWage),
  };
}

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

function round2(n) {
  return Math.round(n * 100) / 100;
}

function getCategoryTotal(breakdown, partialName) {
  const cat = breakdown.find((c) =>
    c.parent_category_name.toLowerCase().includes(partialName.toLowerCase())
  );
  return cat ? cat.total : 0;
}

function findExpenseByName(expenses, partialName) {
  const matches = expenses.filter((e) =>
    (e.category_name || '').toLowerCase().includes(partialName.toLowerCase()) ||
    (e.custom_label || '').toLowerCase().includes(partialName.toLowerCase())
  );
  return matches.reduce((sum, e) => sum + parseFloat(e.monthly_amount || 0), 0);
}

module.exports = { analyzeFinances, quickHealth };
