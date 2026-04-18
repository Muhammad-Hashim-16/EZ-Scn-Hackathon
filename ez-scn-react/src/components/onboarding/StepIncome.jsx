// ============================================
// Onboarding Step 2 — Income Sources
// ============================================

import { Plus, X, DollarSign, TrendingUp } from 'lucide-react';
import { formatPKR } from '@/utils/formatters';

const FIXED_OPTIONS = [
  'Primary Salary', 'Spouse Salary', 'Rental Income',
  'Business Income', 'Pension', 'Other',
];

const TIMING_OPTIONS = [
  { value: 'specific_month', label: 'Specific Month' },
  { value: 'specific_day', label: 'Specific Day' },
  { value: 'random', label: 'Random / Unpredictable' },
];

export default function StepIncome({ data, updateData, errors }) {

  // ── Fixed Income Handlers ──
  function addFixed() {
    updateData({ fixedIncomes: [...data.fixedIncomes, { source_name: '', amount: '', income_type: 'fixed', frequency: 'monthly' }] });
  }

  function removeFixed(index) {
    if (data.fixedIncomes.length <= 1) return;
    updateData({ fixedIncomes: data.fixedIncomes.filter((_, i) => i !== index) });
  }

  function updateFixed(index, field, value) {
    const updated = [...data.fixedIncomes];
    updated[index] = { ...updated[index], [field]: value };
    updateData({ fixedIncomes: updated });
  }

  // ── Calculate total ──
  const totalFixed = data.fixedIncomes.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

  return (
    <div className="space-y-8">

      {/* ────── Fixed Monthly Income ────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#01411C]/10 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-[#01411C]" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Fixed Monthly Income</h2>
        </div>

        {errors.fixedIncomes && (
          <p className="mb-3 text-xs text-red-600 p-2.5 rounded-lg bg-red-50 border border-red-200">
            {errors.fixedIncomes}
          </p>
        )}

        <div className="space-y-3">
          {data.fixedIncomes.map((income, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={income.source_name}
                onChange={(e) => updateFixed(i, 'source_name', e.target.value)}
                className="flex-1 h-10 px-3 rounded-xl border border-input bg-white text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#01411C]/20 focus:border-[#01411C] cursor-pointer"
              >
                <option value="">Select source</option>
                {FIXED_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>

              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">PKR</span>
                <input
                  type="number"
                  min="0"
                  value={income.amount}
                  onChange={(e) => updateFixed(i, 'amount', e.target.value)}
                  placeholder="0"
                  className="w-full h-10 pl-11 pr-3 rounded-xl border border-input bg-white text-sm
                             focus:outline-none focus:ring-2 focus:ring-[#01411C]/20 focus:border-[#01411C]"
                />
              </div>

              <button
                onClick={() => removeFixed(i)}
                disabled={data.fixedIncomes.length <= 1}
                className="w-10 h-10 rounded-xl border border-border flex items-center justify-center
                           text-muted-foreground hover:text-red-600 hover:border-red-300
                           disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="Remove income source"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addFixed}
          className="mt-3 h-9 px-4 rounded-lg text-sm font-medium text-[#01411C]
                     hover:bg-[#01411C]/5 transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add Income Source
        </button>

        {totalFixed > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-[#01411C]/[0.04] border border-[#01411C]/10">
            <p className="text-xs text-muted-foreground">Total Fixed Monthly</p>
            <p className="text-lg font-bold text-[#01411C]">{formatPKR(totalFixed)}</p>
          </div>
        )}
      </section>

    </div>
  );
}
