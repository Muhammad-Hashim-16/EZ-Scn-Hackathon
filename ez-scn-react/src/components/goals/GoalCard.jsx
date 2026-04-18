// ============================================
// PennyWise — Goal Card Component (v2)
//
// Shows "Transfer from Savings" button.
// Transfer modal validates against available savings.
// ============================================

import { useState } from 'react';
import { Trash2, ArrowDownToLine, Sparkles, AlertTriangle, CheckCircle2, XCircle, Clock, Loader2, X } from 'lucide-react';
import MoneyValue from '@/components/shared/MoneyValue';
import { formatPKR, formatNumber, safePct } from '@/utils/formatters';

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
  overdue: { label: 'Overdue', icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', barColor: 'bg-red-500' },
};

export default function GoalCard({ goal, availableSavings, onTransfer, onDelete }) {
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const statusInfo = STATUS_MAP[goal.status] || STATUS_MAP.on_track;
  const StatusIcon = statusInfo.icon;
  const emoji = goalEmoji(goal.goal_name);

  const parsedAmount = parseFloat(transferAmount) || 0;

  async function handleTransfer() {
    if (parsedAmount <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }
    if (parsedAmount > availableSavings) {
      setError(`Insufficient savings. Available: ${formatPKR(availableSavings)}`);
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onTransfer(goal.id, parsedAmount);
      setTransferAmount('');
      setShowTransferModal(false);
    } catch (err) {
      setError(err.message || 'Transfer failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    await onDelete(goal.id);
    setLoading(false);
  }

  return (
    <>
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
            <span className="text-[11px] text-muted-foreground">{Math.round(goal.progress_percent)}% complete</span>
            <span className="text-[11px] text-muted-foreground">
              <MoneyValue amount={goal.remaining_amount} /> remaining
            </span>
          </div>
        </div>

        {/* Inflation note */}
        {goal.inflation_adjusted_target && goal.status !== 'achieved' && (
          <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5 mb-3 border border-amber-100">
            📈 Inflation-adjusted target: <strong>{formatPKR(goal.inflation_adjusted_target)}</strong>
            <span className="opacity-70 ml-1">({goal.inflation_rate}% annual)</span>
          </p>
        )}

        {/* Action buttons */}
        {!goal.is_achieved && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => { setShowTransferModal(true); setError(''); setTransferAmount(''); }}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 bg-[#01411C] text-white text-xs font-semibold
                         rounded-xl hover:bg-[#026b2e] active:bg-[#012e14] transition-colors cursor-pointer"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" /> Transfer from Savings
            </button>

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
          </div>
        )}

        {/* Achieved celebration */}
        {goal.is_achieved && (
          <div className="flex items-center justify-center gap-2 mt-2 p-2.5 bg-emerald-100 text-[#01411C] rounded-xl text-sm font-semibold">
            <Sparkles className="w-4 h-4" /> Goal Achieved! 🎉
          </div>
        )}
      </div>

      {/* ── Transfer Modal ── */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-border/60 overflow-hidden animate-fade-in-up">
            {/* Header */}
            <div className="bg-gradient-to-br from-[#01411C] to-[#026b2e] p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{emoji}</span>
                <div>
                  <h2 className="text-lg font-bold">Transfer to {goal.goal_name}</h2>
                  <p className="text-xs opacity-80">Move money from savings to this goal</p>
                </div>
              </div>
              <button
                onClick={() => setShowTransferModal(false)}
                className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Available savings */}
              <div className="p-3 rounded-xl bg-gray-50 border border-border/50 flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Available Savings</span>
                <span className="text-lg font-bold text-foreground">{formatPKR(availableSavings)}</span>
              </div>

              {/* Goal progress */}
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                <span className="text-xs text-blue-700 font-medium">Still needed</span>
                <span className="text-sm font-bold text-blue-900">{formatPKR(goal.remaining_amount)}</span>
              </div>

              {/* Amount field */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Amount to Transfer <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">PKR</span>
                  <input
                    type="number"
                    min="1"
                    max={availableSavings}
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0"
                    className="w-full h-11 pl-11 pr-3 rounded-xl border border-input bg-white text-sm
                               focus:outline-none focus:ring-2 focus:ring-[#01411C]/20 focus:border-[#01411C]"
                    autoFocus
                  />
                </div>
              </div>

              {/* Preview */}
              {parsedAmount > 0 && parsedAmount <= availableSavings && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-emerald-700">Savings after transfer:</span>
                    <span className="font-bold text-emerald-900">{formatPKR(availableSavings - parsedAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-700">Goal progress after:</span>
                    <span className="font-bold text-emerald-900">
                      {safePct(goal.amount_saved + parsedAmount, goal.target_amount, 100)}%
                    </span>
                  </div>
                  {goal.amount_saved + parsedAmount >= goal.target_amount && (
                    <p className="text-emerald-800 font-semibold text-center pt-1">🎉 This will complete the goal!</p>
                  )}
                </div>
              )}

              {parsedAmount > availableSavings && (
                <p className="text-xs text-red-600 text-center p-2 bg-red-50 rounded-lg">
                  Amount exceeds available savings ({formatPKR(availableSavings)})
                </p>
              )}

              {error && (
                <p className="text-xs text-red-600 text-center p-2 bg-red-50 rounded-lg">{error}</p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 h-11 rounded-xl border border-border text-sm font-medium text-foreground
                             hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransfer}
                  disabled={loading || parsedAmount <= 0 || parsedAmount > availableSavings}
                  className="flex-1 h-11 rounded-xl bg-[#01411C] text-white text-sm font-semibold
                             hover:bg-[#026b2e] disabled:opacity-50 disabled:cursor-not-allowed
                             transition-colors cursor-pointer flex items-center justify-center gap-2
                             shadow-lg shadow-[#01411C]/20"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <ArrowDownToLine className="w-4 h-4" />
                      Confirm Transfer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
