// ============================================
// PennyWise — Goals Page
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import GoalCard from '@/components/goals/GoalCard';
import AddGoalModal from '@/components/goals/AddGoalModal';
import { Target, Plus, Sparkles, TrendingUp } from 'lucide-react';
import MoneyValue from '@/components/shared/MoneyValue';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── Skeleton ──
function GoalsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-48 bg-gray-200 rounded-2xl" />
      ))}
    </div>
  );
}

export default function GoalsPage() {
  const { accessToken } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [netSavings, setNetSavings] = useState(0);

  // ── Fetch goals ──
  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/goals`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) setGoals(data.goals);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // ── Fetch net savings for achievability check ──
  const fetchNetSavings = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/analysis/quick-health`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) setNetSavings(data.net_savings || 0);
    } catch {
      // fallback
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      fetchGoals();
      fetchNetSavings();
    }
  }, [accessToken, fetchGoals, fetchNetSavings]);

  // ── Create goal ──
  async function handleCreateGoal(goalData) {
    const res = await fetch(`${API_URL}/api/goals`, {
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
    await fetchGoals(); // refresh list
  }

  // ── Contribute ──
  async function handleContribute(goalId, amount) {
    const res = await fetch(`${API_URL}/api/goals/${goalId}/contribute`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: 'include',
      body: JSON.stringify({ amount }),
    });
    const data = await res.json();
    if (data.success) await fetchGoals();
  }

  // ── Delete ──
  async function handleDelete(goalId) {
    const res = await fetch(`${API_URL}/api/goals/${goalId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'include',
    });
    const data = await res.json();
    if (data.success) await fetchGoals();
  }

  // ── Stats ──
  const activeGoals = goals.filter((g) => !g.is_achieved);
  const achievedGoals = goals.filter((g) => g.is_achieved);
  const totalSaved = goals.reduce((s, g) => s + g.amount_saved, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-64 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-10 w-36 bg-gray-200 rounded-xl animate-pulse" />
        </div>
        <GoalsSkeleton />
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
            <p className="text-[11px] text-muted-foreground font-medium">Total Saved</p>
          </div>
          <div className="p-3.5 rounded-xl bg-gray-50 border border-border/40 text-center">
            <p className="text-xl font-bold text-foreground">
              {totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0}%
            </p>
            <p className="text-[11px] text-muted-foreground font-medium">Overall Progress</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {goals.length === 0 && (
        <div className="flex flex-col items-center justify-center text-center py-16 px-6">
          <div className="w-20 h-20 rounded-3xl bg-[#01411C]/10 flex items-center justify-center mb-6">
            <Sparkles className="w-10 h-10 text-[#01411C]" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">No Goals Yet</h2>
          <p className="text-muted-foreground max-w-sm mb-6 leading-relaxed">
            Set a financial target — whether it's Umrah, a new car, or an emergency fund.
            PennyWise will track your progress and adjust for inflation.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 h-11 px-6 bg-[#01411C] text-white text-sm font-semibold
                       rounded-xl hover:bg-[#026b2e] transition-colors shadow-lg shadow-[#01411C]/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Your First Goal
          </button>
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
              <GoalCard key={goal.id} goal={goal} onContribute={handleContribute} onDelete={handleDelete} />
            ))}
          </div>
        </div>
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
              <GoalCard key={goal.id} goal={goal} onContribute={handleContribute} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      <AddGoalModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleCreateGoal}
        netSavings={netSavings}
      />
    </div>
  );
}
