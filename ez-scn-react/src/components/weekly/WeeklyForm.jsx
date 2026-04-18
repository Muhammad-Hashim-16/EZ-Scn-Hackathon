// ============================================
// PennyWise — Weekly Expense Form (v2)
//
// Uses the user's ACTUAL expense categories
// from their profile setup (user_expenses table).
// Falls back to existing entries when editing.
// ============================================

import { useState } from 'react';
import { Plus, X, Save, Loader2 } from 'lucide-react';
import { formatPKR, formatNumber, safePct } from '@/utils/formatters';

// Emoji lookup for common category labels
function getEmoji(label) {
  const l = (label || '').toLowerCase();
  if (l.includes('grocery') || l.includes('sabzi')) return '🛒';
  if (l.includes('fuel') || l.includes('petrol') || l.includes('transport')) return '⛽';
  if (l.includes('eat') || l.includes('restaurant') || l.includes('food') || l.includes('dining')) return '🍽️';
  if (l.includes('medic') || l.includes('doctor') || l.includes('health') || l.includes('pharma')) return '💊';
  if (l.includes('child') || l.includes('school') || l.includes('kid') || l.includes('education')) return '🧒';
  if (l.includes('utility') || l.includes('electric') || l.includes('gas') || l.includes('bill') || l.includes('water')) return '💡';
  if (l.includes('rent') || l.includes('house') || l.includes('home')) return '🏠';
  if (l.includes('phone') || l.includes('internet') || l.includes('mobile')) return '📱';
  if (l.includes('cloth') || l.includes('shopping')) return '👗';
  if (l.includes('entertain') || l.includes('movie') || l.includes('outing')) return '🎬';
  if (l.includes('insurance')) return '🛡️';
  if (l.includes('loan') || l.includes('emi') || l.includes('debt')) return '🏦';
  return '📦';
}

function formatWeekLabel(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  const opts = { month: 'short', day: 'numeric' };
  const year = s.getFullYear();
  return `${s.toLocaleDateString('en-PK', opts)} – ${e.toLocaleDateString('en-PK', opts)}, ${year}`;
}

export default function WeeklyForm({
  weekStart,
  weekEnd,
  weekNumber,
  weeklyBudget,
  monthlyBudget,
  runningMonthlyTotal,
  remainingBudget,
  onSave,
  onCancel,
  existingEntries,
  userCategories,
}) {
  // Initialize rows from user categories (or existing entries when editing)
  const initRows = () => {
    if (existingEntries && existingEntries.length > 0) {
      return existingEntries.map((e, i) => ({
        id: `existing_${i}`,
        label: e.custom_label || e.category_name || 'Item',
        emoji: getEmoji(e.custom_label || e.category_name || ''),
        amount: String(e.amount),
        notes: e.notes || '',
        category_id: e.category_id,
      }));
    }

    // Use user's actual expense categories (only those with amount > 0)
    if (userCategories && userCategories.length > 0) {
      return userCategories.map((cat, i) => ({
        id: `cat_${cat.expense_id || i}`,
        label: cat.label,
        emoji: getEmoji(cat.label),
        amount: '',
        notes: '',
        category_id: cat.category_id,
        monthlyRef: cat.monthly_amount,
      }));
    }

    // Absolute fallback (shouldn't reach here)
    return [{ id: 'fallback_0', label: 'Expense', emoji: '📦', amount: '', notes: '', category_id: null }];
  };

  const [rows, setRows] = useState(initRows);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  function updateRow(id, field, value) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  function addCustomRow() {
    const id = `custom_${Date.now()}`;
    setRows((prev) => [...prev, { id, label: '', emoji: '✏️', amount: '', notes: '', category_id: null }]);
  }

  function removeRow(id) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleSubmit() {
    const entries = rows
      .filter((r) => parseFloat(r.amount) > 0)
      .map((r) => ({
        category_id: r.category_id,
        custom_label: r.label,
        amount: parseFloat(r.amount),
        notes: r.notes,
      }));

    if (entries.length === 0) return;

    setLoading(true);
    try {
      const data = await onSave(weekStart, entries);
      setResult(data);
    } catch (err) {
      setResult({ status: { color: 'red', label: 'Error', message: err.message || 'Failed to save.' } });
    } finally {
      setLoading(false);
    }
  }

  const totalAmount = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const projectedMonthly = (runningMonthlyTotal || 0) + totalAmount;

  return (
    <div className="space-y-5">
      {/* Week label */}
      <div className="p-4 rounded-xl bg-[#01411C]/5 border border-[#01411C]/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">
              Logging for Week {weekNumber || '?'} of 4
            </p>
            <p className="text-base font-bold text-foreground">{formatWeekLabel(weekStart, weekEnd)}</p>
          </div>
          {weeklyBudget > 0 && (
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">Weekly Budget</p>
              <p className="text-sm font-bold text-[#01411C]">{formatPKR(weeklyBudget)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Entry rows */}
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-2">
            <span className="text-lg shrink-0 w-8 text-center">{row.emoji}</span>

            {/* Editable label for custom rows */}
            {row.id.startsWith('custom_') ? (
              <input
                type="text"
                value={row.label}
                onChange={(e) => updateRow(row.id, 'label', e.target.value)}
                placeholder="Item name"
                className="w-28 sm:w-36 h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none
                           focus:border-[#01411C] focus:ring-1 focus:ring-[#01411C]/20 transition-colors"
              />
            ) : (
              <div className="w-28 sm:w-36 truncate">
                <span className="text-sm font-medium text-foreground">{row.label}</span>
                {row.monthlyRef > 0 && (
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Budget: {formatPKR(Math.round(row.monthlyRef / 4))}/wk
                  </p>
                )}
              </div>
            )}

            {/* Amount */}
            <div className="flex-1 flex items-center gap-1">
              <span className="text-xs text-muted-foreground shrink-0">PKR</span>
              <input
                type="number"
                value={row.amount}
                onChange={(e) => updateRow(row.id, 'amount', e.target.value)}
                placeholder="0"
                min="0"
                className="flex-1 h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none
                           text-right font-medium
                           focus:border-[#01411C] focus:ring-1 focus:ring-[#01411C]/20 transition-colors"
              />
            </div>

            {/* Remove */}
            {rows.length > 1 && (
              <button
                onClick={() => removeRow(row.id)}
                className="w-8 h-8 shrink-0 flex items-center justify-center text-muted-foreground
                           hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add custom row */}
      <button
        onClick={addCustomRow}
        className="flex items-center gap-2 text-sm text-[#01411C] font-medium
                   hover:text-[#026b2e] transition-colors cursor-pointer"
      >
        <Plus className="w-4 h-4" /> Add Another Item
      </button>

      {/* Running total */}
      <div className="space-y-2">
        <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-border/60">
          <span className="text-sm font-semibold text-foreground">This Week's Total</span>
          <span className={`text-lg font-bold ${totalAmount > (weeklyBudget || Infinity) ? 'text-red-600' : 'text-foreground'}`}>
            {formatPKR(totalAmount)}
          </span>
        </div>

        {/* Monthly progress bar */}
        {monthlyBudget > 0 && (
          <div className="p-4 rounded-xl bg-gray-50 border border-border/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Monthly Progress</span>
              <span className="font-semibold text-foreground">
                {formatPKR(projectedMonthly)} / {formatPKR(monthlyBudget)}
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  projectedMonthly > monthlyBudget ? 'bg-red-500' :
                  projectedMonthly > monthlyBudget * 0.75 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, (projectedMonthly / monthlyBudget) * 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">
                Remaining: <span className="font-semibold text-foreground">{formatPKR(Math.max(0, monthlyBudget - projectedMonthly))}</span>
              </span>
              <span className="text-muted-foreground">
                Week {weekNumber}/4
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Post-save result */}
      {result && (
        <div className={`p-4 rounded-xl border text-sm ${
          result.status?.color === 'red'
            ? 'bg-red-50 border-red-200 text-red-800'
            : result.status?.color === 'yellow'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-green-50 border-green-200 text-green-800'
        }`}>
          <p className="font-semibold mb-1">
            {result.status?.color === 'red' ? '🔴' : result.status?.color === 'yellow' ? '🟡' : '🟢'}{' '}
            {result.status?.label}
          </p>
          <p>{result.status?.message}</p>

          {result.overspent_deduction && (
            <div className="mt-2 p-3 rounded-lg bg-red-100 border border-red-300 text-red-900">
              <p className="font-bold">⚠️ Month-End Deduction</p>
              <p className="mt-1">{result.overspent_deduction.message}</p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={loading || totalAmount === 0}
          className="flex-1 flex items-center justify-center gap-2 h-11 bg-[#01411C] text-white font-semibold
                     rounded-xl hover:bg-[#026b2e] active:bg-[#012e14] disabled:opacity-50
                     transition-colors cursor-pointer shadow-lg shadow-[#01411C]/20"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {loading ? 'Saving...' : 'Save This Week'}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="h-11 px-5 bg-gray-100 text-sm font-medium text-muted-foreground
                       rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
