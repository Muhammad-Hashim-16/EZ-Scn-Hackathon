// ============================================
// PennyWise — Monthly Check-In Modal
// Shown at start of each month until user confirms
// their income and expenses are the same or updated.
// ============================================

import { useState } from 'react';
import { CalendarCheck, ArrowRight, Loader2, Pencil } from 'lucide-react';
import { api } from '@/services/api';
import { formatPKR } from '@/utils/formatters';

export default function MonthlyCheckInModal({ record, onConfirmed }) {
  const [mode, setMode] = useState('ask'); // 'ask' | 'edit'
  const [income, setIncome] = useState(record.income);
  const [expenses, setExpenses] = useState(record.expected_expenses);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSame() {
    setLoading(true);
    setError('');
    try {
      const res = await api.put('monthly-record/confirm', { same: true });
      if (res.success) {
        onConfirmed(res.record);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch {
      setError('Failed to confirm. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setLoading(true);
    setError('');
    try {
      const res = await api.put('monthly-record/confirm', {
        income: parseFloat(income) || 0,
        expected_expenses: parseFloat(expenses) || 0,
      });
      if (res.success) {
        onConfirmed(res.record);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch {
      setError('Failed to save. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  const monthName = new Date().toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });

  return (
    // Backdrop — not dismissible by clicking outside
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-border/60 overflow-hidden animate-fade-in-up">

        {/* Header */}
        <div className="bg-gradient-to-br from-[#01411C] to-emerald-700 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Monthly Check-In</h2>
              <p className="text-xs opacity-80">{monthName}</p>
            </div>
          </div>
          <p className="text-sm opacity-90 mt-2 leading-relaxed">
            A new month has started! Let's make sure your numbers are up to date.
          </p>
        </div>

        {/* Body */}
        <div className="p-6">

          {mode === 'ask' && (
            <>
              <p className="text-sm text-muted-foreground mb-4">Last month you had:</p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-sm font-medium text-emerald-800">Income</span>
                  <span className="text-sm font-bold text-emerald-900">{formatPKR(record.income)}</span>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="text-sm font-medium text-rose-800">Expected Expenses</span>
                  <span className="text-sm font-bold text-rose-900">{formatPKR(record.expected_expenses)}</span>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-600 mb-3 text-center">{error}</p>
              )}

              <div className="space-y-2.5">
                <button
                  onClick={handleSame}
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-[#01411C] text-white font-semibold text-sm
                             hover:bg-[#026b2e] active:bg-[#012e14] disabled:opacity-50
                             transition-colors cursor-pointer shadow-lg shadow-[#01411C]/20
                             flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Same as Last Month
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <button
                  onClick={() => setMode('edit')}
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-gray-100 text-foreground font-semibold text-sm
                             hover:bg-gray-200 active:bg-gray-300 disabled:opacity-50
                             transition-colors cursor-pointer
                             flex items-center justify-center gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  Something Changed
                </button>
              </div>
            </>
          )}

          {mode === 'edit' && (
            <>
              <p className="text-sm text-muted-foreground mb-4">Update your figures for this month:</p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Monthly Income
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">PKR</span>
                    <input
                      type="number"
                      min="0"
                      value={income}
                      onChange={(e) => setIncome(e.target.value)}
                      className="w-full h-11 pl-11 pr-3 rounded-xl border border-input bg-white text-sm text-right
                                 focus:outline-none focus:ring-2 focus:ring-[#01411C]/20 focus:border-[#01411C]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Expected Monthly Expenses
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">PKR</span>
                    <input
                      type="number"
                      min="0"
                      value={expenses}
                      onChange={(e) => setExpenses(e.target.value)}
                      className="w-full h-11 pl-11 pr-3 rounded-xl border border-input bg-white text-sm text-right
                                 focus:outline-none focus:ring-2 focus:ring-[#01411C]/20 focus:border-[#01411C]"
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-sm">
                  <span className="text-blue-700">Net savings this month: </span>
                  <span className="font-bold text-blue-900">
                    {formatPKR((parseFloat(income) || 0) - (parseFloat(expenses) || 0))}
                  </span>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-600 mb-3 text-center">{error}</p>
              )}

              <div className="space-y-2.5">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-[#01411C] text-white font-semibold text-sm
                             hover:bg-[#026b2e] active:bg-[#012e14] disabled:opacity-50
                             transition-colors cursor-pointer shadow-lg shadow-[#01411C]/20
                             flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Save & Continue
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <button
                  onClick={() => setMode('ask')}
                  disabled={loading}
                  className="w-full h-10 text-sm text-muted-foreground font-medium
                             hover:text-foreground transition-colors cursor-pointer"
                >
                  ← Go Back
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
