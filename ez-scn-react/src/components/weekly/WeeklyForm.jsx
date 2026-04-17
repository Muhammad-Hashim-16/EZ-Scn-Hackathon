// ============================================
// PennyWise — Weekly Expense Form
// Pre-populated category rows with quick entry
// ============================================

import { useState } from 'react';
import { Plus, X, Save, Loader2 } from 'lucide-react';

const DEFAULT_ROWS = [
  { emoji: '🛒', label: 'Grocery', key: 'grocery' },
  { emoji: '⛽', label: 'Fuel', key: 'fuel' },
  { emoji: '🍽️', label: 'Eating Out', key: 'eating_out' },
  { emoji: '💊', label: 'Medicine', key: 'medicine' },
  { emoji: '🧒', label: 'Children (misc)', key: 'children' },
  { emoji: '📦', label: 'Other', key: 'other' },
];

function formatWeekLabel(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  const opts = { month: 'short', day: 'numeric' };
  const year = s.getFullYear();
  return `${s.toLocaleDateString('en-PK', opts)} – ${e.toLocaleDateString('en-PK', opts)}, ${year}`;
}

export default function WeeklyForm({ weekStart, weekEnd, onSave, onCancel, existingEntries }) {
  // Initialize rows with existing data or defaults
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
    return DEFAULT_ROWS.map((r) => ({
      id: r.key,
      label: r.label,
      emoji: r.emoji,
      amount: '',
      notes: '',
      category_id: null,
    }));
  };

  const [rows, setRows] = useState(initRows);
  const [customRows, setCustomRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  function getEmoji(label) {
    const l = (label || '').toLowerCase();
    if (l.includes('grocery') || l.includes('sabzi')) return '🛒';
    if (l.includes('fuel') || l.includes('petrol')) return '⛽';
    if (l.includes('eat') || l.includes('restaurant') || l.includes('food')) return '🍽️';
    if (l.includes('medic') || l.includes('doctor') || l.includes('health')) return '💊';
    if (l.includes('child') || l.includes('school') || l.includes('kid')) return '🧒';
    return '📦';
  }

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
    } catch {
      // handled by parent
    } finally {
      setLoading(false);
    }
  }

  const totalAmount = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  return (
    <div className="space-y-5">
      {/* Week label */}
      <div className="p-4 rounded-xl bg-[#01411C]/5 border border-[#01411C]/10 text-center">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Logging for</p>
        <p className="text-base font-bold text-foreground">{formatWeekLabel(weekStart, weekEnd)}</p>
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
              <span className="w-28 sm:w-36 text-sm font-medium text-foreground truncate">{row.label}</span>
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

            {/* Remove (only for non-default or custom) */}
            {(row.id.startsWith('custom_') || rows.length > 1) && (
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
      <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-border/60">
        <span className="text-sm font-semibold text-foreground">This Week's Total</span>
        <span className="text-lg font-bold text-foreground">PKR {totalAmount.toLocaleString()}</span>
      </div>

      {/* Post-save result */}
      {result && (
        <div className={`p-4 rounded-xl border text-sm ${
          result.over_budget
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-green-50 border-green-200 text-green-800'
        }`}>
          <p className="font-semibold mb-1">
            {result.over_budget ? '⚠️ Over Budget' : '✅ Within Budget'}
          </p>
          <p>
            Weekly total: <strong>PKR {result.weekly_total?.toLocaleString()}</strong>
            {' '}vs target: <strong>PKR {result.monthly_budget_weekly?.toLocaleString()}</strong>
          </p>
          {result.over_budget && (
            <p className="mt-1 text-xs">Over by PKR {result.over_by?.toLocaleString()}</p>
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
