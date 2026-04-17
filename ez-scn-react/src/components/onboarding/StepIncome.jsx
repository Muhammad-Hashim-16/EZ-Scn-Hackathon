// ============================================
// Onboarding Step 2 — Income Sources
// ============================================

import { Plus, X, DollarSign, TrendingUp } from 'lucide-react';

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

  // ── Variable Income Handlers ──
  function addVariable() {
    updateData({
      variableIncomes: [...data.variableIncomes, {
        source_name: '', amount: '', income_type: 'variable', frequency: 'irregular', timing: 'random',
      }],
    });
  }

  function removeVariable(index) {
    updateData({ variableIncomes: data.variableIncomes.filter((_, i) => i !== index) });
  }

  function updateVariable(index, field, value) {
    const updated = [...data.variableIncomes];
    updated[index] = { ...updated[index], [field]: value };
    updateData({ variableIncomes: updated });
  }

  // ── Calculate total ──
  const totalFixed = data.fixedIncomes.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const totalVariable = data.variableIncomes.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

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
            <p className="text-lg font-bold text-[#01411C]">PKR {totalFixed.toLocaleString()}</p>
          </div>
        )}
      </section>

      {/* ────── Irregular Income ────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-amber-700" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Irregular Income</h2>
            <span className="text-xs text-muted-foreground">(Optional)</span>
          </div>

          <button
            onClick={() => {
              const toggled = !data.hasIrregularIncome;
              updateData({
                hasIrregularIncome: toggled,
                variableIncomes: toggled && data.variableIncomes.length === 0
                  ? [{ source_name: '', amount: '', income_type: 'variable', frequency: 'irregular', timing: 'random' }]
                  : data.variableIncomes,
              });
            }}
            className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors duration-200 cursor-pointer ${
              data.hasIrregularIncome ? 'bg-[#01411C]' : 'bg-gray-300'
            }`}
            role="switch"
            aria-checked={data.hasIrregularIncome}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              data.hasIrregularIncome ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {!data.hasIrregularIncome && (
          <p className="text-sm text-muted-foreground">
            Toggle on if you receive freelance income, bonuses, committee payouts, or other irregular income.
          </p>
        )}

        {data.hasIrregularIncome && (
          <div className="space-y-3">
            {data.variableIncomes.map((income, i) => (
              <div key={i} className="p-3 rounded-xl border border-border/60 bg-white space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={income.source_name}
                    onChange={(e) => updateVariable(i, 'source_name', e.target.value)}
                    placeholder="e.g., Freelance, Bonus, Committee"
                    className="flex-1 h-10 px-3 rounded-xl border border-input bg-white text-sm
                               focus:outline-none focus:ring-2 focus:ring-[#01411C]/20 focus:border-[#01411C]"
                  />
                  <button
                    onClick={() => removeVariable(i)}
                    className="w-10 h-10 rounded-xl border border-border flex items-center justify-center
                               text-muted-foreground hover:text-red-600 hover:border-red-300
                               transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">PKR</span>
                    <input
                      type="number"
                      min="0"
                      value={income.amount}
                      onChange={(e) => updateVariable(i, 'amount', e.target.value)}
                      placeholder="Estimated amount"
                      className="w-full h-10 pl-11 pr-3 rounded-xl border border-input bg-white text-sm
                                 focus:outline-none focus:ring-2 focus:ring-[#01411C]/20 focus:border-[#01411C]"
                    />
                  </div>

                  <select
                    value={income.timing}
                    onChange={(e) => updateVariable(i, 'timing', e.target.value)}
                    className="flex-1 h-10 px-3 rounded-xl border border-input bg-white text-sm
                               focus:outline-none focus:ring-2 focus:ring-[#01411C]/20 focus:border-[#01411C] cursor-pointer"
                  >
                    {TIMING_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}

            <button
              onClick={addVariable}
              className="h-9 px-4 rounded-lg text-sm font-medium text-amber-700
                         hover:bg-amber-50 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Irregular Source
            </button>

            {totalVariable > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-xs text-muted-foreground">Total Estimated Irregular</p>
                <p className="text-lg font-bold text-amber-700">PKR {totalVariable.toLocaleString()}</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
