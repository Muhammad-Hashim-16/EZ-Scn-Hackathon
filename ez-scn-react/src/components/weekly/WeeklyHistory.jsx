// ============================================
// PennyWise — Weekly History Cards
// Last 4 weeks with totals and mini bars
// ============================================

import { BarChart3 } from 'lucide-react';

function formatWeekDates(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  const opts = { month: 'short', day: 'numeric' };
  return `${s.toLocaleDateString('en-PK', opts)} – ${e.toLocaleDateString('en-PK', opts)}`;
}

export default function WeeklyHistory({ weeks, weeklyBudget }) {
  if (!weeks || weeks.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground text-sm">No weekly history yet. Start logging to see your trends!</p>
      </div>
    );
  }

  // Find max total for bar scaling
  const maxTotal = Math.max(...weeks.map((w) => w.total), weeklyBudget || 1);

  return (
    <div className="space-y-3">
      {weeks.slice(0, 4).map((week, i) => {
        const overBudget = weeklyBudget > 0 && week.total > weeklyBudget;
        const pct = maxTotal > 0 ? (week.total / maxTotal) * 100 : 0;
        const budgetPct = maxTotal > 0 ? (weeklyBudget / maxTotal) * 100 : 0;

        return (
          <div
            key={week.week_start}
            className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-sm ${
              overBudget ? 'border-red-200 bg-red-50/50' : 'border-border/60 bg-white'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {formatWeekDates(week.week_start, week.week_end)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {week.entries?.length || 0} item{(week.entries?.length || 0) !== 1 ? 's' : ''} logged
                </p>
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${overBudget ? 'text-red-600' : 'text-foreground'}`}>
                  PKR {week.total.toLocaleString()}
                </p>
                {weeklyBudget > 0 && (
                  <p className={`text-[11px] font-medium ${overBudget ? 'text-red-500' : 'text-green-600'}`}>
                    {overBudget
                      ? `↑ PKR ${(week.total - weeklyBudget).toLocaleString()} over`
                      : `✓ PKR ${(weeklyBudget - week.total).toLocaleString()} under`
                    }
                  </p>
                )}
              </div>
            </div>

            {/* Mini bar */}
            <div className="relative h-4 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  overBudget ? 'bg-red-500' : 'bg-[#01411C]'
                }`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
              {/* Budget line marker */}
              {weeklyBudget > 0 && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-gray-800/40"
                  style={{ left: `${Math.min(budgetPct, 100)}%` }}
                  title={`Budget: PKR ${weeklyBudget.toLocaleString()}`}
                />
              )}
            </div>

            {/* Category breakdown mini-list */}
            {week.entries && week.entries.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {week.entries.slice(0, 5).map((e, j) => (
                  <span
                    key={j}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-muted-foreground"
                  >
                    {e.category_name}: PKR {e.amount.toLocaleString()}
                  </span>
                ))}
                {week.entries.length > 5 && (
                  <span className="text-[11px] px-2 py-0.5 text-muted-foreground">
                    +{week.entries.length - 5} more
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
