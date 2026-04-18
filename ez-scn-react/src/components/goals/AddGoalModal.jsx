// ============================================
// PennyWise — Add Goal Modal
// ============================================

import { useState } from 'react';
import { X, Target, AlertTriangle } from 'lucide-react';
import { formatPKR } from '@/utils/formatters';

export default function AddGoalModal({ open, onClose, onSave, netSavings }) {
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetMonths, setTargetMonths] = useState(12);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const amount = parseFloat(targetAmount) || 0;
  const monthlyNeeded = targetMonths > 0 ? Math.ceil((amount / targetMonths) * 100) / 100 : 0;
  const isAchievable = netSavings > 0 && monthlyNeeded <= netSavings;
  const revisedMonths = netSavings > 0 && amount > 0 ? Math.ceil(amount / netSavings) : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!goalName.trim()) return setError('Please enter a goal name.');
    if (amount <= 0) return setError('Target amount must be greater than 0.');
    if (targetMonths < 1 || targetMonths > 120) return setError('Timeline must be 1–120 months.');

    setLoading(true);
    try {
      await onSave({ goal_name: goalName.trim(), target_amount: amount, target_months: targetMonths });
      setGoalName('');
      setTargetAmount('');
      setTargetMonths(12);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save goal.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl animate-fade-in-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-[#01411C]" />
            <h2 className="text-lg font-bold text-foreground">New Savings Goal</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-muted-foreground
                       hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Goal Name */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Goal Name</label>
            <input
              type="text"
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              placeholder="e.g. Umrah Fund, New Car, Emergency"
              className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none
                         focus:border-[#01411C] focus:ring-2 focus:ring-[#01411C]/10 transition-all"
              maxLength={100}
            />
          </div>

          {/* Target Amount */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Target Amount (PKR)</label>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="500,000"
              min="1"
              className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none
                         focus:border-[#01411C] focus:ring-2 focus:ring-[#01411C]/10 transition-all"
            />
          </div>

          {/* Timeline Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-foreground">Timeline</label>
              <span className="text-sm font-bold text-[#01411C] bg-[#01411C]/10 px-3 py-0.5 rounded-full">
                {targetMonths} {targetMonths === 1 ? 'month' : 'months'}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="60"
              value={targetMonths}
              onChange={(e) => setTargetMonths(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer
                         [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5
                         [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-[#01411C]
                         [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                         [&::-webkit-slider-thumb]:shadow-md"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>1 month</span>
              <span>5 years</span>
            </div>
          </div>

          {/* Real-time Preview */}
          {amount > 0 && (
            <div className={`p-4 rounded-xl border text-sm ${
              isAchievable
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <p className="font-semibold mb-1">
                Monthly saving needed: {formatPKR(monthlyNeeded)}
              </p>
              {!isAchievable && netSavings > 0 && (
                <div className="flex items-start gap-2 mt-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed">
                    Your current net savings are {formatPKR(Math.round(netSavings))}/mo.
                    At your current rate, you'd need <strong>{revisedMonths} months</strong> instead.
                  </p>
                </div>
              )}
              {netSavings <= 0 && (
                <div className="flex items-start gap-2 mt-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed">
                    You currently have no net savings. Increase income or reduce expenses first.
                  </p>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[#01411C] text-white font-semibold rounded-xl
                       hover:bg-[#026b2e] active:bg-[#012e14] disabled:opacity-50
                       transition-colors cursor-pointer shadow-lg shadow-[#01411C]/20"
          >
            {loading ? 'Saving...' : 'Save Goal'}
          </button>
        </form>
      </div>
    </div>
  );
}
