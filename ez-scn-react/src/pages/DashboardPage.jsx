// ============================================
// PennyWise — Dashboard Page (Home Screen)
// Uses React Query for data fetching
// ============================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useAnalysis, useMonthlyRecord, useOneTimeIncome, useInvalidate } from '@/hooks/useQueries';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import PageError from '@/components/shared/PageError';
import EmptyState from '@/components/shared/EmptyState';
import SummaryCards from '@/components/dashboard/SummaryCards';
import LifeHoursToggle from '@/components/dashboard/LifeHoursToggle';
import ExpenseBreakdown from '@/components/dashboard/ExpenseBreakdown';
import GoalsPreview from '@/components/dashboard/GoalsPreview';
import InflationTicker from '@/components/dashboard/InflationTicker';
import MonthlyCheckInModal from '@/components/dashboard/MonthlyCheckInModal';
import OneTimeIncomeModal from '@/components/dashboard/OneTimeIncomeModal';
import OneTimeIncomeList from '@/components/dashboard/OneTimeIncomeList';
import { Bell, Sparkles, ArrowRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatPKR } from '@/utils/formatters';

export default function DashboardPage() {
  const { user, accessToken } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const invalidate = useInvalidate();

  // React Query hooks
  const {
    data: analysisResponse,
    error: analysisError,
    isLoading: analysisLoading,
    refetch: refetchAnalysis
  } = useAnalysis();

  const {
    data: monthlyRecordResponse,
    refetch: refetchMonthlyRecord
  } = useMonthlyRecord();

  const {
    data: oneTimeResponse,
  } = useOneTimeIncome();

  const [showOneTimeModal, setShowOneTimeModal] = useState(false);

  const loading = !accessToken || analysisLoading;
  const analysis = analysisResponse?.success ? analysisResponse.analysis : null;
  const monthlyRecord = monthlyRecordResponse?.success ? monthlyRecordResponse.record : null;
  const oneTimeEntries = oneTimeResponse?.success ? oneTimeResponse.entries : [];
  const error = analysisError?.message || (!analysisLoading && !analysisResponse?.success && analysisResponse?.error) || null;
  const errorStatus = analysisError?.status || null;
  const isEmpty = analysis && analysis.total_income === 0 && analysis.total_expenses === 0;

  // Current date
  const now = new Date();
  const monthYear = now.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });
  const firstName = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  // Health dot color
  let dotColor = 'bg-gray-300';
  if (analysis) {
    if (analysis.health_status === 'safe') dotColor = 'bg-green-500';
    else if (analysis.health_status === 'edge') dotColor = 'bg-yellow-500';
    else if (analysis.health_status === 'red') dotColor = 'bg-red-500';
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <LoadingSkeleton type="dashboard" />
      </div>
    );
  }

  // ── Error state ──
  if (error && !analysis) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Hello {firstName} 👋</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{monthYear}</p>
          </div>
        </div>
        <PageError error={error} status={errorStatus} onRetry={() => { refetchAnalysis(); refetchMonthlyRecord(); }} />
      </div>
    );
  }

  // ── Empty state ──
  if (isEmpty && !analysis) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Hello {firstName} 👋</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{monthYear}</p>
          </div>
        </div>
        <EmptyState
          icon={Sparkles}
          title="Welcome to PennyWise!"
          description="Complete your financial setup to see your personalized dashboard with income analysis, expense breakdowns, and savings insights."
          actionLabel="Complete Setup →"
          onAction={() => navigate('/onboarding')}
        />
      </div>
    );
  }

  // Should we show the monthly check-in modal?
  const showCheckIn = monthlyRecord && monthlyRecord.confirmed === false;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">

        {/* Monthly Check-In Modal (overlay, not replacing dashboard) */}
        {showCheckIn && (
          <MonthlyCheckInModal
            record={monthlyRecord}
            onConfirmed={() => {
              invalidate.afterCheckIn();
            }}
          />
        )}

        {/* ═══ 1. Top Bar ═══ */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Health dot */}
            <div className={`w-3 h-3 rounded-full ${dotColor} ring-4 ring-opacity-20 ${
              dotColor === 'bg-green-500' ? 'ring-green-500'
              : dotColor === 'bg-yellow-500' ? 'ring-yellow-500'
              : dotColor === 'bg-red-500' ? 'ring-red-500' : 'ring-gray-500'
            }`} />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Hello {firstName} 👋</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{monthYear}</p>
            </div>
          </div>
          <button onClick={() => navigate('/settings#notifications')}
                  className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center
                             text-muted-foreground hover:bg-[#01411C]/10 hover:text-[#01411C]
                             transition-colors relative cursor-pointer"
                  aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {/* Notification dot */}
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500" />
          </button>
        </div>

        {/* ═══ 2. Summary Cards ═══ */}
        <SummaryCards analysis={analysis} monthlyRecord={monthlyRecord} />

        {/* ═══ 2b. Add One-Time Income Button ═══ */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowOneTimeModal(true)}
            className="h-10 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm font-semibold
                       text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300
                       transition-colors cursor-pointer flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Bonus / Committee Money
          </button>
        </div>

        {/* One-Time Income Modal */}
        {showOneTimeModal && (
          <OneTimeIncomeModal
            onClose={() => setShowOneTimeModal(false)}
            onAdded={(entry) => {
              setShowOneTimeModal(false);
              toast.success(`${formatPKR(entry.amount)} added to savings!`);
              invalidate.afterOneTimeIncome();
            }}
          />
        )}

        {/* ═══ 3. Life-Hours Toggle ═══ */}
        <LifeHoursToggle />

        {/* ═══ 4. Expense Breakdown ═══ */}
        <ExpenseBreakdown breakdown={analysis.expenses_breakdown} />

        {/* ═══ 5 & 6. Goals + One-Time Income + Inflation ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GoalsPreview />
          <div className="space-y-4">
            {/* Recent one-time income */}
            <OneTimeIncomeList entries={oneTimeEntries} />

            {/* Quick stats from analysis */}
            {analysis.life_hours_breakdown && analysis.life_hours_breakdown.length > 0 && (
              <div className="p-5 rounded-2xl border border-border/60 bg-white shadow-sm">
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  ⏱️ Top Expenses in Work-Hours
                </h3>
                <div className="space-y-2">
                  {analysis.life_hours_breakdown.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
                      <span className="text-muted-foreground">{item.expense_name}</span>
                      <span className="font-semibold text-foreground">
                        {item.hours_worked} hrs
                        <span className="text-xs text-muted-foreground ml-1">({item.days_worked} days)</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══ 7. Inflation Ticker ═══ */}
        <InflationTicker accessToken={accessToken} />
    </div>
  );
}
