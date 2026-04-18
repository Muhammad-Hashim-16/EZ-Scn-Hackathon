// ============================================
// Dashboard — Goals Preview (first 2 active)
// Now fetches its own data via useGoals() so it
// stays in sync when goals are added/modified.
// ============================================

import { Link } from 'react-router-dom';
import { Target, CheckCircle2, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { useLifeHours } from '@/context/LifeHoursContext';
import { useGoals } from '@/hooks/useQueries';

export default function GoalsPreview() {
  const { fmt } = useLifeHours();
  const { data: goalsResponse, isLoading } = useGoals();

  const goals = goalsResponse?.success ? goalsResponse.goals : [];

  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl border border-border/60 bg-white shadow-sm flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!goals || goals.length === 0) {
    return (
      <div className="p-6 rounded-2xl border border-dashed border-border bg-gray-50/50 text-center">
        <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
        <p className="text-sm text-muted-foreground mb-1">No savings goals yet</p>
        <Link
          to="/goals"
          className="text-sm font-semibold text-[#01411C] hover:underline"
        >
          Create your first goal →
        </Link>
      </div>
    );
  }

  const active = goals.filter((g) => !g.is_achieved).slice(0, 2);

  if (active.length === 0) {
    return (
      <div className="p-6 rounded-2xl border border-dashed border-border bg-gray-50/50 text-center">
        <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3 opacity-60" />
        <p className="text-sm text-muted-foreground mb-1">All goals achieved! 🎉</p>
        <Link
          to="/goals"
          className="text-sm font-semibold text-[#01411C] hover:underline"
        >
          Set a new goal →
        </Link>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl border border-border/60 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <Target className="w-4 h-4 text-[#01411C]" />
          Savings Goals
        </h3>
        <Link
          to="/goals"
          className="text-xs font-semibold text-[#01411C] hover:underline flex items-center gap-1"
        >
          View All <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-4">
        {active.map((goal) => {
          const progress = goal.progress_percent || 0;
          const isOnTrack = goal.status === 'on_track' || goal.status === 'achieved';
          // Support both field names: months_remaining (from /api/goals) and estimated_months_left (from analysis)
          const monthsLeft = goal.months_remaining ?? goal.estimated_months_left;
          const monthsText = monthsLeft != null && monthsLeft !== Infinity
            ? `${monthsLeft} month${monthsLeft !== 1 ? 's' : ''} left`
            : 'Timeline TBD';

          return (
            <div key={goal.id} className="p-4 rounded-xl bg-gray-50 border border-border/40">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{goal.goal_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{monthsText}</p>
                </div>
                {isOnTrack ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> On Track
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="w-3 h-3" /> Behind
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isOnTrack ? 'bg-green-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  Saved: <strong className="text-foreground">{fmt(goal.amount_saved)}</strong>
                </span>
                <span>
                  Target: <strong className="text-foreground">{fmt(goal.target_amount)}</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
