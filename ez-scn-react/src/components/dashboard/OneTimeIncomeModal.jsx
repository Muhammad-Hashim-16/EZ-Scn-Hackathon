// ============================================
// Dashboard — Add One-Time Income Modal
// For bonus, committee payouts, gifts, etc.
// ============================================

import { useState } from 'react';
import { Plus, Loader2, ArrowRight, X } from 'lucide-react';
import { api } from '@/services/api';
import { formatPKR } from '@/utils/formatters';

export default function OneTimeIncomeModal({ onClose, onAdded }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [receivedDate, setReceivedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await api.post('income/one-time', {
        description: description.trim() || 'One-time income',
        amount: parsedAmount,
        received_date: receivedDate,
      });
      if (res.success) {
        onAdded(res.entry, res.cumulative_savings);
      } else {
        setError(res.error || 'Something went wrong.');
      }
    } catch (err) {
      setError(err.message || 'Failed to add income.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-border/60 overflow-hidden animate-fade-in-up">

        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Add One-Time Income</h2>
              <p className="text-xs opacity-80">Bonus, committee payout, gift, etc.</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='e.g. "Committee payout", "Bonus"'
              maxLength={255}
              className="w-full h-11 px-3 rounded-xl border border-input bg-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">PKR</span>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                required
                className="w-full h-11 pl-11 pr-3 rounded-xl border border-input bg-white text-sm
                           focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Date Received
            </label>
            <input
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-input bg-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
            />
          </div>

          {/* Preview */}
          {parseFloat(amount) > 0 && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm">
              <span className="text-emerald-700">Will add </span>
              <span className="font-bold text-emerald-900">{formatPKR(parseFloat(amount))}</span>
              <span className="text-emerald-700"> to your cumulative savings</span>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 text-center p-2 bg-red-50 rounded-lg">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-border text-sm font-medium text-foreground
                         hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !amount}
              className="flex-1 h-11 rounded-xl bg-emerald-600 text-white text-sm font-semibold
                         hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors cursor-pointer flex items-center justify-center gap-2
                         shadow-lg shadow-emerald-600/20"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Add to Savings
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
