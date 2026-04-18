// ============================================
// PennyWise — Expense Controller
// Categories tree, bulk upsert, CRUD, custom
// ============================================

const db = require('../config/db');

// UUID of the "Custom Expenses" parent category from seed data
const CUSTOM_CATEGORY_ID = 'a0000000-0000-4000-8000-000000000014';

// ============================================
// GET /api/expenses/categories
// Nested tree: parent → children
// ============================================
async function getCategories(req, res) {
  try {
    // Fetch all categories in one query
    const result = await db.query(
      `SELECT id, category_name, parent_category_id, is_system_defined, display_order
       FROM expense_categories
       ORDER BY display_order ASC, category_name ASC`
    );

    const all = result.rows;

    // Separate parents (no parent_category_id) and children
    const parents = all.filter((c) => c.parent_category_id === null);
    const childMap = {};

    for (const child of all.filter((c) => c.parent_category_id !== null)) {
      if (!childMap[child.parent_category_id]) {
        childMap[child.parent_category_id] = [];
      }
      childMap[child.parent_category_id].push({
        id: child.id,
        category_name: child.category_name,
        display_order: child.display_order,
      });
    }

    // Build nested tree
    const tree = parents.map((parent) => ({
      id: parent.id,
      category_name: parent.category_name,
      display_order: parent.display_order,
      children: (childMap[parent.id] || []).sort((a, b) => a.display_order - b.display_order),
    }));

    return res.status(200).json({
      success: true,
      categories: tree,
    });
  } catch (error) {
    console.error('Expense Controller — getCategories error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
      code: 'SERVER_ERROR',
    });
  }
}

// ============================================
// POST /api/expenses/bulk
// Onboarding: save all expenses at once (upsert)
// ============================================
async function bulkUpsertExpenses(req, res) {
  try {
    const userId = req.user.id;
    const { expenses } = req.body;

    if (!Array.isArray(expenses) || expenses.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Expenses array is required and must not be empty.',
        code: 'VALIDATION_ERROR',
      });
    }

    // Filter out entries with 0 or null amounts
    const validExpenses = expenses.filter(
      (e) => e.monthly_amount !== null && e.monthly_amount !== undefined && parseFloat(e.monthly_amount) > 0
    );

    if (validExpenses.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No expenses with valid amounts provided.',
        code: 'VALIDATION_ERROR',
      });
    }

    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      const savedExpenses = [];

      for (const expense of validExpenses) {
        const {
          category_id,
          monthly_amount,
          custom_label,
          area_of_living,
          grocery_area,
          notes,
        } = expense;

        // Check if user already has an expense for this category
        const existing = await client.query(
          `SELECT id FROM user_expenses
           WHERE user_id = $1 AND category_id = $2 AND is_active = TRUE
           LIMIT 1`,
          [userId, category_id]
        );

        let result;

        if (existing.rows.length > 0) {
          // UPDATE existing
          result = await client.query(
            `UPDATE user_expenses SET
              monthly_amount = $1,
              custom_label = $2,
              area_of_living = $3,
              grocery_area = $4,
              notes = $5,
              updated_at = NOW()
            WHERE id = $6 AND user_id = $7
            RETURNING *`,
            [
              monthly_amount,
              custom_label || null,
              area_of_living || null,
              grocery_area || null,
              notes || null,
              existing.rows[0].id,
              userId,
            ]
          );
        } else {
          // INSERT new
          result = await client.query(
            `INSERT INTO user_expenses (
              user_id, category_id, monthly_amount,
              custom_label, area_of_living, grocery_area, notes, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
            RETURNING *`,
            [
              userId,
              category_id,
              monthly_amount,
              custom_label || null,
              area_of_living || null,
              grocery_area || null,
              notes || null,
            ]
          );
        }

        savedExpenses.push(result.rows[0]);
      }

      // ── Calculate and store category percentages ──
      await recalcPercentages(client, userId);

      await client.query('COMMIT');

      // Fetch saved expenses with category names
      const ids = savedExpenses.map((e) => e.id);
      const withNames = await db.query(
        `SELECT ue.*, ec.category_name
         FROM user_expenses ue
         LEFT JOIN expense_categories ec ON ue.category_id = ec.id
         WHERE ue.id = ANY($1)
         ORDER BY ec.display_order ASC`,
        [ids]
      );

      return res.status(200).json({
        success: true,
        saved_count: withNames.rows.length,
        expenses: withNames.rows,
      });
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Expense Controller — bulkUpsertExpenses error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
      code: 'SERVER_ERROR',
    });
  }
}

// ============================================
// GET /api/expenses
// All active expenses + totals + grouped
// ============================================
async function getExpenses(req, res) {
  try {
    const userId = req.user.id;

    // Fetch all active expenses with category info
    const expensesResult = await db.query(
      `SELECT
         ue.id,
         ue.category_id,
         ue.custom_label,
         ue.monthly_amount,
         ue.area_of_living,
         ue.grocery_area,
         ue.notes,
         ue.created_at,
         ue.updated_at,
         ec.category_name,
         ec.parent_category_id,
         ec.display_order AS sub_display_order,
         COALESCE(pc.category_name, ec.category_name) AS parent_category_name,
         COALESCE(pc.id, ec.id) AS parent_id,
         COALESCE(pc.display_order, ec.display_order) AS parent_display_order
       FROM user_expenses ue
       LEFT JOIN expense_categories ec ON ue.category_id = ec.id
       LEFT JOIN expense_categories pc ON ec.parent_category_id = pc.id
       WHERE ue.user_id = $1 AND ue.is_active = TRUE
       ORDER BY parent_display_order ASC, sub_display_order ASC`,
      [userId]
    );

    const expenses = expensesResult.rows;

    // Calculate total
    const totalMonthly = expenses.reduce(
      (sum, e) => sum + parseFloat(e.monthly_amount || 0),
      0
    );

    // Group by parent category
    const grouped = {};
    for (const exp of expenses) {
      const parentName = exp.parent_category_name;
      const parentId = exp.parent_id;

      if (!grouped[parentId]) {
        grouped[parentId] = {
          parent_id: parentId,
          parent_category_name: parentName,
          parent_display_order: exp.parent_display_order,
          subtotal: 0,
          items: [],
        };
      }

      grouped[parentId].subtotal += parseFloat(exp.monthly_amount || 0);
      grouped[parentId].items.push({
        id: exp.id,
        category_id: exp.category_id,
        category_name: exp.category_name,
        custom_label: exp.custom_label,
        monthly_amount: parseFloat(exp.monthly_amount),
        area_of_living: exp.area_of_living,
        grocery_area: exp.grocery_area,
        notes: exp.notes,
      });
    }

    // Convert to sorted array
    const expensesByCategory = Object.values(grouped).sort(
      (a, b) => a.parent_display_order - b.parent_display_order
    );

    // Round subtotals
    expensesByCategory.forEach((g) => {
      g.subtotal = Math.round(g.subtotal * 100) / 100;
    });

    return res.status(200).json({
      success: true,
      expenses,
      total_monthly_expenses: Math.round(totalMonthly * 100) / 100,
      expenses_by_category: expensesByCategory,
    });
  } catch (error) {
    console.error('Expense Controller — getExpenses error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
      code: 'SERVER_ERROR',
    });
  }
}

// ============================================
// PUT /api/expenses/:id
// Update amount or notes
// ============================================
async function updateExpense(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { monthly_amount, notes, custom_label, area_of_living, grocery_area } = req.body;

    // Build dynamic SET clause for only provided fields
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (monthly_amount !== undefined) {
      updates.push(`monthly_amount = $${paramIndex++}`);
      values.push(monthly_amount);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(notes);
    }
    if (custom_label !== undefined) {
      updates.push(`custom_label = $${paramIndex++}`);
      values.push(custom_label);
    }
    if (area_of_living !== undefined) {
      updates.push(`area_of_living = $${paramIndex++}`);
      values.push(area_of_living);
    }
    if (grocery_area !== undefined) {
      updates.push(`grocery_area = $${paramIndex++}`);
      values.push(grocery_area);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update.',
        code: 'VALIDATION_ERROR',
      });
    }

    updates.push(`updated_at = NOW()`);

    values.push(id);       // $N for WHERE id
    values.push(userId);   // $N+1 for WHERE user_id

    const query = `
      UPDATE user_expenses
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND user_id = $${paramIndex} AND is_active = TRUE
      RETURNING *
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found.',
        code: 'NOT_FOUND',
      });
    }

    // Recalculate all category percentages since amounts changed
    await recalcPercentages(db, userId);

    return res.status(200).json({
      success: true,
      expense: result.rows[0],
    });
  } catch (error) {
    console.error('Expense Controller — updateExpense error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
      code: 'SERVER_ERROR',
    });
  }
}

// ============================================
// DELETE /api/expenses/:id
// Soft delete
// ============================================
async function deleteExpense(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await db.query(
      `UPDATE user_expenses
       SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND is_active = TRUE
       RETURNING id, custom_label, category_id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found or already deleted.',
        code: 'NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Expense removed.',
      deleted: result.rows[0],
    });
  } catch (error) {
    console.error('Expense Controller — deleteExpense error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
      code: 'SERVER_ERROR',
    });
  }
}

// ============================================
// POST /api/expenses/custom
// Add a custom expense under "Custom Expenses"
// ============================================
async function addCustomExpense(req, res) {
  try {
    const userId = req.user.id;
    const { custom_label, monthly_amount, notes } = req.body;

    const result = await db.query(
      `INSERT INTO user_expenses (
        user_id, category_id, custom_label, monthly_amount, notes, is_active
      ) VALUES ($1, $2, $3, $4, $5, TRUE)
      RETURNING *`,
      [userId, CUSTOM_CATEGORY_ID, custom_label.trim(), monthly_amount, notes || null]
    );

    return res.status(201).json({
      success: true,
      expense: result.rows[0],
    });
  } catch (error) {
    console.error('Expense Controller — addCustomExpense error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
      code: 'SERVER_ERROR',
    });
  }
}

// ============================================
// Helper: recalculate all category_percentage
// values for a user based on current amounts.
// `conn` can be a client (inside txn) or db.
// ============================================
async function recalcPercentages(conn, userId) {
  // Ensure column exists (idempotent)
  try {
    await conn.query(
      `ALTER TABLE user_expenses ADD COLUMN IF NOT EXISTS category_percentage DECIMAL(8,4)`
    );
  } catch { /* already exists */ }

  const totalResult = await conn.query(
    `SELECT SUM(monthly_amount) AS total FROM user_expenses WHERE user_id = $1 AND is_active = TRUE`,
    [userId]
  );
  const total = parseFloat(totalResult.rows[0].total) || 0;

  if (total > 0) {
    await conn.query(
      `UPDATE user_expenses
       SET category_percentage = ROUND((monthly_amount / $1) * 100, 4)
       WHERE user_id = $2 AND is_active = TRUE`,
      [total, userId]
    );
  } else {
    await conn.query(
      `UPDATE user_expenses SET category_percentage = 0 WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    );
  }
}

// ============================================
// POST /api/expenses/redistribute
// Proportionally redistribute all active
// expenses to match a new total amount.
// ============================================
async function redistributeExpenses(req, res) {
  try {
    const userId = req.user.id;
    const { new_total_expenses } = req.body;

    const newTotal = parseFloat(new_total_expenses);
    if (!newTotal || newTotal <= 0) {
      return res.status(400).json({
        success: false,
        error: 'new_total_expenses must be greater than 0.',
        code: 'VALIDATION_ERROR',
      });
    }

    // Ensure column exists
    try {
      await db.query(
        `ALTER TABLE user_expenses ADD COLUMN IF NOT EXISTS category_percentage DECIMAL(8,4)`
      );
    } catch { /* */ }

    // Fetch all active expenses
    const expResult = await db.query(
      `SELECT ue.id, ue.monthly_amount, ue.category_percentage,
              ue.custom_label, ec.category_name
       FROM user_expenses ue
       LEFT JOIN expense_categories ec ON ue.category_id = ec.id
       WHERE ue.user_id = $1 AND ue.is_active = TRUE
       ORDER BY ue.monthly_amount DESC`,
      [userId]
    );

    if (expResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No expenses found to redistribute. Add expenses first.',
        code: 'NO_EXPENSES',
      });
    }

    // Edge case 5: if any row has null percentage, recalculate from current amounts
    const hasNullPct = expResult.rows.some((r) => r.category_percentage == null);
    if (hasNullPct) {
      await recalcPercentages(db, userId);
      // Re-fetch
      const refreshed = await db.query(
        `SELECT ue.id, ue.monthly_amount, ue.category_percentage,
                ue.custom_label, ec.category_name
         FROM user_expenses ue
         LEFT JOIN expense_categories ec ON ue.category_id = ec.id
         WHERE ue.user_id = $1 AND ue.is_active = TRUE
         ORDER BY ue.monthly_amount DESC`,
        [userId]
      );
      expResult.rows = refreshed.rows;
    }

    // Calculate new amounts using stored percentages
    const updates = expResult.rows.map((row) => {
      const pct = parseFloat(row.category_percentage) || 0;
      return {
        id: row.id,
        category_name: row.category_name || row.custom_label || 'Other',
        old_amount: parseFloat(row.monthly_amount),
        new_amount: Math.round((pct / 100) * newTotal),
        category_percentage: pct,
      };
    });

    // Edge case 1: rounding fix — adjust largest category
    const runningSum = updates.reduce((s, u) => s + u.new_amount, 0);
    const roundingDiff = Math.round(newTotal) - runningSum;
    if (roundingDiff !== 0 && updates.length > 0) {
      // Find the largest category
      let largestIdx = 0;
      for (let i = 1; i < updates.length; i++) {
        if (updates[i].new_amount > updates[largestIdx].new_amount) {
          largestIdx = i;
        }
      }
      updates[largestIdx].new_amount += roundingDiff;
    }

    // Apply updates to database
    for (const u of updates) {
      await db.query(
        `UPDATE user_expenses SET monthly_amount = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`,
        [u.new_amount, u.id, userId]
      );
    }

    // Update current month's monthly_record
    const monthStr = (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    })();

    // Get current income to recalculate net
    const recResult = await db.query(
      `SELECT income, cumulative_savings FROM monthly_records WHERE user_id = $1 AND month = $2`,
      [userId, monthStr]
    );

    if (recResult.rows.length > 0) {
      const currentIncome = parseFloat(recResult.rows[0].income) || 0;
      const newNet = currentIncome - newTotal;

      // Get previous cumulative
      const prevRecord = await db.query(
        `SELECT cumulative_savings FROM monthly_records
         WHERE user_id = $1 AND month < $2 ORDER BY month DESC LIMIT 1`,
        [userId, monthStr]
      );
      const prevCumulative = prevRecord.rows.length > 0
        ? parseFloat(prevRecord.rows[0].cumulative_savings) || 0
        : 0;
      const newCumulative = prevCumulative + newNet;

      await db.query(
        `UPDATE monthly_records
         SET expected_expenses = $3, monthly_net = $4, cumulative_savings = $5
         WHERE user_id = $1 AND month = $2`,
        [userId, monthStr, newTotal, newNet, newCumulative]
      );
    }

    return res.status(200).json({
      success: true,
      new_total: Math.round(newTotal),
      updated_expenses: updates,
    });
  } catch (error) {
    console.error('Expense Controller — redistributeExpenses error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
      code: 'SERVER_ERROR',
    });
  }
}

module.exports = {
  getCategories,
  bulkUpsertExpenses,
  getExpenses,
  updateExpense,
  deleteExpense,
  addCustomExpense,
  redistributeExpenses,
};
