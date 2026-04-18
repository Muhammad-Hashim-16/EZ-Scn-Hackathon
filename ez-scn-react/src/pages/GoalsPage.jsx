// ============================================
// PennyWise — Goals Page (v2)
// Uses React Query for data fetching
// ============================================

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useGoals, useMonthlyRecord, useInvalidate } from '@/hooks/useQueries';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import PageError from '@/components/shared/PageError';
import EmptyState from '@/components/shared/EmptyState';
import GoalCard from '@/components/goals/GoalCard';
import AddGoalModal from '@/components/goals/AddGoalModal';
import { Target, Plus, TrendingUp } from 'lucide-react';
import MoneyValue from '@/components/shared/MoneyValue';
import { formatPKR } from '@/utils/formatters';

export default function GoalsPage() {
  const { accessToken } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const invalidate = useInvalidate();

  // React Query hooks
  const {
    data: goalsResponse,
    error: goalsError,
    isLoading: goalsLoading,
    refetch: refetchGoals
  } = useGoals();

  const {
    data: monthlyRecordResponse,
  } = useMonthlyRecord();

  const loading = !accessToken || goalsLoading;
  const goals = goalsResponse?.success ? goalsResponse.goals : [];
  const cumulativeSavings = goalsResponse?.success
    ? (goalsResponse.cumulative_savings || 0)
    : (monthlyRecordResponse?.success ? parseFloat(monthlyRecordResponse.record?.cumulative_savings || 0) : 0);

  const error = goalsError?.message || (!goalsLoading && !goalsResponse?.success && goalsResponse?.error) || null;
  const errorStatus = goalsError?.status || null;

  // ── Create goal ──
  async function handleCreateGoal(goalData) {
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/goals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: 'include',
      body: JSON.stringify(goalData),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    invalidate.afterGoalTransfer();
  }

  // ── Transfer from savings to goal ──
  async function handleTransfer(goalId, amount) {
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/goals/${goalId}/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: 'include',
      body: JSON.stringify({ amount }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Transfer failed.');
    // Invalidate goals + savings across all pages
    invalidate.afterGoalTransfer();
    return data;
  }

  // ── Delete ──
  async function handleDelete(goalId) {
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/goals/${goalId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'include',
    });
    const data = await res.json();
    if (data.success) invalidate.afterGoalTransfer();
  }

  // ── Stats ──
  const activeGoals = goals.filter((g) => !g.is_achieved);
  const achievedGoals = goals.filter((g) => g.is_achieved);
  const totalSaved = goals.reduce((s, g) => s + g.amount_saved, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <LoadingSkeleton type="goals" />
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <div className="flex items-center gap-2 mb-6">
          <Target className="w-6 h-6 text-[#01411C]" />
          <h1 className="text-2xl font-bold text-foreground">Your Financial Goals 🎯</h1>
        </div>
        <PageError error={error} status={errorStatus} onRetry={() => refetchGoals()} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Target className="w-6 h-6 text-[#01411C]" />
            Your Financial Goals 🎯
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Track your progress towards what matters most.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 h-10 px-5 bg-[#01411C] text-white text-sm font-semibold
                     rounded-xl hover:bg-[#026b2e] active:bg-[#012e14] transition-colors
                     shadow-lg shadow-[#01411C]/20 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" /> Add New Goal
        </button>
      </div>

      {/* Available Savings Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 flex items-center justify-between">
        <div>
          <p className="text-xs text-emerald-700 font-medium">Available Savings</p>
          <p className="text-xs text-emerald-600 mt-0.5">Transfer to your goals below</p>
        </div>
        <p className="text-xl font-bold text-[#01411C]">{formatPKR(cumulativeSavings)}</p>
      </div>

      {/* Summary Stats */}
      {goals.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-gray-50 border border-border/40 text-center">
            <p className="text-xl font-bold text-foreground">{activeGoals.length}</p>
            <p className="text-[11px] text-muted-foreground font-medium">Active Goals</p>
          </div>
          <div className="p-3.5 rounded-xl bg-green-50 border border-green-200 text-center">
            <p className="text-xl font-bold text-[#01411C]">{achievedGoals.length}</p>
            <p className="text-[11px] text-muted-foreground font-medium">Achieved</p>
          </div>
          <div className="p-3.5 rounded-xl bg-gray-50 border border-border/40 text-center">
            <p className="text-xl font-bold text-foreground"><MoneyValue amount={totalSaved} /></p>
            <p className="text-[11px] text-muted-foreground font-medium">Total Transferred</p>
          </div>
          <div className="p-3.5 rounded-xl bg-gray-50 border border-border/40 text-center">
            <p className="text-xl font-bold text-foreground">
              {totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0}%
            </p>
            <p className="text-[11px] text-muted-foreground font-medium">Overall Progress</p>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {goals.length === 0 && (
        <EmptyState
          icon="🎯"
          title="No Goals Yet"
          description="Set a financial target — whether it's Umrah, a new car, or an emergency fund. Transfer from your savings to fund each goal."
          actionLabel="Create Your First Goal"
          onAction={() => setModalOpen(true)}
        />
      )}

      {/* Active goals */}
      {activeGoals.length > 0 && (
        <div>
          {achievedGoals.length > 0 && (
            <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#01411C]" /> In Progress
            </h2>
          )}
          <div className="space-y-4">
            {activeGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                availableSavings={cumulativeSavings}
                onTransfer={handleTransfer}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Achieved goals */}
      {achievedGoals.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
            🎉 Achieved
          </h2>
          <div className="space-y-4">
            {achievedGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                availableSavings={cumulativeSavings}
                onTransfer={handleTransfer}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      <AddGoalModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleCreateGoal}
        netSavings={cumulativeSavings}
      />
    </div>
  );
}
