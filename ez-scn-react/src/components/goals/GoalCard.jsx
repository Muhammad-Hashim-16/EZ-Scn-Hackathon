// ============================================
// PennyWise — Goal Card Component
// ============================================

import { useState } from 'react';
import { Trash2, Plus, Sparkles, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import MoneyValue from '@/components/shared/MoneyValue';

// Auto-assign emoji based on goal name keywords
function goalEmoji(name) {
  const n = (name || '').toLowerCase();
  if (/umrah|hajj|makkah|medina/i.test(n)) return '🕌';
  if (/car|vehicle|bike|motor/i.test(n)) return '🚗';
  if (/house|home|flat|apartment|plot/i.test(n)) return '🏠';
  if (/education|degree|course|school|college|uni/i.test(n)) return '📚';
  if (/wedding|shaadi|nikah/i.test(n)) return '💒';
  if (/laptop|computer|phone|mobile/i.test(n)) return '💻';
  if (/travel|trip|vacation|holiday/i.test(n)) return '✈️';
  if (/emergency|rainy|backup/i.test(n)) return '🛡️';
  if (/baby|child/i.test(n)) return '👶';
  if (/business|startup/i.test(n)) return '💼';
  return '🎯';
}

const STATUS_MAP = {
  on_track: { label: 'On Track', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', barColor: 'bg-green-500' },
  behind: { label: 'Behind', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100', barColor: 'bg-amber-500' },
  achieved: { label: 'Achieved', icon: Sparkles, color: 'text-[#01411C]', bg: 'bg-emerald-100', barColor: 'bg-[#01411C]' },
  impossible: { label: 'At Risk', icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', barColor: 'bg-red-500' },
};

export default function GoalCard({ goal, onContribute, onDelete }) {
  const [contributeAmount, setContributeAmount] = useState('');
  const [showContribute, setShowContribute] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const statusInfo = STATUS_MAP[goal.status] || STATUS_MAP.on_track;
  const StatusIcon = statusInfo.icon;
  const emoji = goalEmoji(goal.goal_name);

  async function handleContribute() {
    const val = parseFloat(contributeAmount);
    if (!val || val <= 0) return;
    setLoading(true);
    await onContribute(goal.id, val);
    setContributeAmount('');
    setShowContribute(false);
    setLoading(false);
  }

  async function handleDelete() {
    setLoading(true);
    await onDelete(goal.id);
    setLoading(false);
  }

  return (
    <div className={`p-5 rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:shadow-md
      ${goal.status === 'achieved' ? 'border-emerald-200 bg-gradient-to-br from-green-50/50 to-emerald-50/30' : 'border-border/60'}`}
    >
      {/* Top row: emoji + name + status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{emoji}</span>
          <div>
            <h3 className="text-base font-bold text-foreground">{goal.goal_name}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3 h-3" />
              {goal.status === 'achieved'
                ? 'Goal achieved!'
                : `${goal.months_remaining} month${goal.months_remaining !== 1 ? 's' : ''} remaining`}
            </p>
          </div>
        </div>
        <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${statusInfo.bg} ${statusInfo.color}`}>
          <StatusIcon className="w-3 h-3" />
          {statusInfo.label}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">
            <strong className="text-foreground"><MoneyValue amount={goal.amount_saved} /></strong> saved
          </span>
          <span className="text-muted-foreground">
            of <strong className="text-foreground"><MoneyValue amount={goal.target_amount} /></strong>
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${statusInfo.barColor}`}
            style={{ width: `${Math.min(goal.progress_percent, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[11px] text-muted-foreground">{goal.progress_percent.toFixed(1)}% complete</span>
          <span className="text-[11px] text-muted-foreground"><MoneyValue amount={goal.monthly_deduction} />/mo needed</span>
        </div>
      </div>

      {/* Inflation note */}
      {goal.inflation_adjusted_target && goal.status !== 'achieved' && (
        <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5 mb-3 border border-amber-100">
          📈 Inflation-adjusted target: <strong>PKR {goal.inflation_adjusted_target.toLocaleString()}</strong>
          <span className="opacity-70 ml-1">({goal.inflation_rate}% annual)</span>
        </p>
      )}

      {/* Action buttons */}
      {!goal.is_achieved && (
        <div className="flex gap-2 mt-2">
          {!showContribute ? (
            <button
              onClick={() => setShowContribute(true)}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 bg-[#01411C] text-white text-xs font-semibold
                         rounded-xl hover:bg-[#026b2e] active:bg-[#012e14] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Money
            </button>
          ) : (
            <div className="flex-1 flex gap-2 animate-fade-in-up">
              <input
                type="number"
                placeholder="PKR amount"
                value={contributeAmount}
                onChange={(e) => setContributeAmount(e.target.value)}
                className="flex-1 h-9 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none
                           focus:border-[#01411C] focus:ring-1 focus:ring-[#01411C]/20 transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && handleContribute()}
                autoFocus
              />
              <button
                onClick={handleContribute}
                disabled={loading}
                className="h-9 px-4 bg-[#01411C] text-white text-xs font-semibold rounded-xl
                           hover:bg-[#026b2e] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {loading ? '...' : 'Save'}
              </button>
              <button
                onClick={() => setShowContribute(false)}
                className="h-9 px-3 bg-gray-100 text-xs text-muted-foreground rounded-xl
                           hover:bg-gray-200 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {!showContribute && (
            <>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="h-9 w-9 flex items-center justify-center bg-gray-100 text-muted-foreground rounded-xl
                             hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                  aria-label="Delete goal"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex gap-1 animate-fade-in-up">
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="h-9 px-3 bg-red-600 text-white text-xs font-semibold rounded-xl
                               hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="h-9 px-2 bg-gray-100 text-xs text-muted-foreground rounded-xl
                               hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Achieved celebration */}
      {goal.is_achieved && (
        <div className="flex items-center justify-center gap-2 mt-2 p-2.5 bg-emerald-100 text-[#01411C] rounded-xl text-sm font-semibold">
          <Sparkles className="w-4 h-4" /> Goal Achieved! 🎉
        </div>
      )}
    </div>
  );
}
