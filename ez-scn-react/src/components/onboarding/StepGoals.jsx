// ============================================
// Onboarding Step 4 — Savings Goals (Optional)
// ============================================

import { Plus, X, Target } from 'lucide-react';
import { formatPKR } from '@/utils/formatters';

export default function StepGoals({ data, updateData }) {

  function addGoal() {
    updateData({ goals: [...data.goals, { name: '', target_amount: '', target_months: 12 }] });
  }

  function removeGoal(i) {
    updateData({ goals: data.goals.filter((_, idx) => idx !== i) });
  }

  function updateGoal(i, field, value) {
    const updated = [...data.goals];
    updated[i] = { ...updated[i], [field]: value };
    updateData({ goals: updated });
  }

  return (
    <div className="space-y-6">
      {/* Info */}
      <div className="p-4 rounded-xl bg-[#01411C]/[0.04] border border-[#01411C]/10 text-sm text-foreground leading-relaxed">
        <p>
          Set savings goals to track your progress. You can always add, edit, or remove goals later
          from your dashboard. <strong>This step is optional.</strong>
        </p>
      </div>

      {/* Goals List */}
      {data.goals.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#01411C]/10 flex items-center justify-center mb-3">
            <Target className="w-7 h-7 text-[#01411C]" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            No goals yet. Add a savings goal to get started!
          </p>
          <button
            onClick={addGoal}
            className="h-10 px-5 rounded-xl bg-[#01411C] text-white text-sm font-medium
                       hover:bg-[#026b2e] transition-colors cursor-pointer shadow-sm
                       shadow-[#01411C]/20 inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Your First Goal
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {data.goals.map((goal, i) => {
            const monthlySaving = goal.target_amount && goal.target_months
              ? Math.ceil(parseFloat(goal.target_amount) / parseInt(goal.target_months, 10))
              : 0;

            return (
              <div key={i} className="p-4 rounded-xl border border-border/60 bg-white space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Goal {i + 1}</span>
                  <button
                    onClick={() => removeGoal(i)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center
                               text-muted-foreground hover:text-red-600 hover:bg-red-50
                               transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Goal Name */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Goal Name</label>
                  <input
                    type="text"
                    value={goal.name}
                    onChange={(e) => updateGoal(i, 'name', e.target.value)}
                    placeholder="e.g., Emergency Fund, New Laptop, Hajj Savings"
                    className="w-full h-10 px-3 rounded-xl border border-input bg-white text-sm
                               focus:outline-none focus:ring-2 focus:ring-[#01411C]/20 focus:border-[#01411C]"
                  />
                </div>

                {/* Amount + Timeline */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Target Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">PKR</span>
                      <input
                        type="number"
                        min="0"
                        value={goal.target_amount}
                        onChange={(e) => updateGoal(i, 'target_amount', e.target.value)}
                        placeholder="500,000"
                        className="w-full h-10 pl-11 pr-3 rounded-xl border border-input bg-white text-sm
                                   focus:outline-none focus:ring-2 focus:ring-[#01411C]/20 focus:border-[#01411C]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Timeline: {goal.target_months} month{goal.target_months !== 1 ? 's' : ''}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="60"
                      value={goal.target_months}
                      onChange={(e) => updateGoal(i, 'target_months', e.target.value)}
                      className="w-full h-10 accent-[#01411C] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground -mt-1">
                      <span>1 mo</span>
                      <span>60 mo</span>
                    </div>
                  </div>
                </div>

                {/* Monthly saving needed */}
                {monthlySaving > 0 && (
                  <div className="p-3 rounded-lg bg-[#01411C]/[0.04] border border-[#01411C]/10">
                    <p className="text-xs text-muted-foreground">Monthly saving needed</p>
                    <p className="text-lg font-bold text-[#01411C]">
                      {formatPKR(monthlySaving)}
                      <span className="text-xs font-normal text-muted-foreground ml-1">/month</span>
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          <button
            onClick={addGoal}
            className="h-9 px-4 rounded-lg text-sm font-medium text-[#01411C]
                       hover:bg-[#01411C]/5 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Another Goal
          </button>
        </div>
      )}
    </div>
  );
}
