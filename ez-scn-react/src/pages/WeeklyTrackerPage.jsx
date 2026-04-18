// ============================================
// PennyWise — Weekly Tracker Page (v2)
// Uses React Query for data fetching
// ============================================

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useWeeklyCurrentWeek, useWeeklyEntries, useInvalidate } from '@/hooks/useQueries';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import PageError from '@/components/shared/PageError';
import WeeklyForm from '@/components/weekly/WeeklyForm';
import WeeklyHistory from '@/components/weekly/WeeklyHistory';
import { formatPKR, safePct } from '@/utils/formatters';
import { CalendarCheck, ClipboardList, TrendingUp, CheckCircle2, Sparkles, AlertTriangle } from 'lucide-react';

function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getSundayOfWeek(mon) {
  const d = new Date(mon);
  d.setDate(d.getDate() + 6);
  return d;
}

function toDateStr(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

export default function WeeklyTrackerPage() {
  const { user, accessToken, updateUser } = useAuth();
  const [optedIn, setOptedIn] = useState(null); // null = loading
  const [showForm, setShowForm] = useState(false);
  const [optInLoading, setOptInLoading] = useState(false);
  const invalidate = useInvalidate();

  // Check opt-in state once on mount
  useEffect(() => {
    let cancelled = false;

    async function checkOptIn() {
      if (user?.weekly_tracker_opt_in === true) {
        if (!cancelled) setOptedIn(true);
        return;
      }
      if (user?.weekly_tracker_opt_in === false) {
        if (!cancelled) setOptedIn(false);
        return;
      }
      if (accessToken) {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/user/profile`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            credentials: 'include',
          });
          const data = await res.json();
          if (!cancelled) {
            if (data.success && data.user) {
              const isOptedIn = data.user.weekly_tracker_opt_in === true;
              setOptedIn(isOptedIn);
              updateUser({ weekly_tracker_opt_in: isOptedIn });
            } else {
              setOptedIn(false);
            }
          }
        } catch {
          if (!cancelled) setOptedIn(false);
        }
      } else {
        if (!cancelled) setOptedIn(false);
      }
    }
    checkOptIn();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const monday = getMondayOfWeek(new Date());
  const sunday = getSundayOfWeek(monday);
  const weekStartStr = toDateStr(monday);
  const weekEndStr = toDateStr(sunday);

  // React Query hooks (only fetch when opted in)
  const {
    data: currentResponse,
    error: currentError,
    isLoading: currentLoading,
    refetch: refetchCurrent
  } = useWeeklyCurrentWeek(!!optedIn);

  const {
    data: historyResponse,
    error: historyError,
    isLoading: historyLoading,
    refetch: refetchHistory
  } = useWeeklyEntries(!!optedIn);

  const loading = optedIn && (currentLoading || historyLoading);
  
  const currentWeek = currentResponse?.success ? currentResponse : null;
  const history = historyResponse?.success ? historyResponse.weeks : [];
  
  const error = (optedIn && !currentLoading && !historyLoading && 
                 (currentError?.message || historyError?.message)) || null;
  const errorStatus = currentError?.status || historyError?.status || null;

  // Opt in — optimistic update
  async function handleOptIn() {
    setOptedIn(true);
    updateUser({ weekly_tracker_opt_in: true });
    setOptInLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/weekly/opt-in`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({ opt_in: true }),
      });
      const data = await res.json();
      if (!data.success) {
        setOptedIn(false);
        updateUser({ weekly_tracker_opt_in: false });
      }
    } catch {
      setOptedIn(false);
      updateUser({ weekly_tracker_opt_in: false });
    } finally {
      setOptInLoading(false);
    }
  }

  // Save entries
  async function handleSave(weekStart, entries) {
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/weekly/entry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: 'include',
      body: JSON.stringify({ week_start_date: weekStart, entries }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    // Invalidate weekly + analysis data across all pages
    invalidate.afterWeeklyEntry();
    return data;
  }

  // ── Loading (checking opt-in) ──
  if (optedIn === null) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <LoadingSkeleton type="weekly" />
      </div>
    );
  }

  // ── Not opted in — EmptyState ──
  if (!optedIn) {
    return (
      <div className="max-w-lg mx-auto p-4 md:p-8">
        <div className="flex flex-col items-center text-center py-12 px-6">
          <div className="w-20 h-20 rounded-3xl bg-[#01411C]/10 flex items-center justify-center mb-6
                          ring-1 ring-[#01411C]/10">
            <ClipboardList className="w-10 h-10 text-[#01411C]" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Weekly Expense Tracker</h1>
          <p className="text-muted-foreground max-w-sm mb-8 leading-relaxed">
            Track your actual weekly spending against your monthly budget.
            Get a Sunday evening reminder, log in 2 minutes, and see if you're on track.
          </p>

          <div className="w-full space-y-3 mb-8 text-left">
            {[
              { icon: CalendarCheck, text: 'Quick weekly log — takes under 2 minutes' },
              { icon: TrendingUp, text: 'Running total tracks you across all 4 weeks' },
              { icon: CheckCircle2, text: 'Overspending alerts protect your savings' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 border border-border/40">
                  <Icon className="w-5 h-5 text-[#01411C] shrink-0" />
                  <span className="text-sm text-foreground">{item.text}</span>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleOptIn}
            disabled={optInLoading}
            className="w-full max-w-xs h-12 bg-[#01411C] text-white font-semibold rounded-xl
                       hover:bg-[#026b2e] active:bg-[#012e14] disabled:opacity-50
                       transition-colors cursor-pointer shadow-lg shadow-[#01411C]/20"
          >
            {optInLoading ? 'Enabling...' : 'Enable Weekly Tracker'}
          </button>
        </div>
      </div>
    );
  }

  // ── Loading data ──
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <LoadingSkeleton type="weekly" />
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-[#01411C]" />
            Weekly Tracker 📝
          </h1>
        </div>
        <PageError error={error} status={errorStatus} onRetry={() => { refetchCurrent(); refetchHistory(); }} />
      </div>
    );
  }

  const isLogged = currentWeek?.logged || false;
  const weeklyBudget = currentWeek?.weekly_budget || 0;
  const monthlyBudget = currentWeek?.monthly_budget || 0;
  const weekNumber = currentWeek?.week_number || 1;
  const runningMonthlyTotal = currentWeek?.running_monthly_total || 0;
  const remainingBudget = currentWeek?.remaining_budget || 0;
  const status = currentWeek?.status || { color: 'green', label: 'On Track' };
  const userCategories = currentWeek?.user_categories || [];

  // Status color helpers
  const statusColors = {
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', dot: 'bg-green-500' },
    yellow: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', dot: 'bg-amber-500' },
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', dot: 'bg-red-500' },
  };
  const sc = statusColors[status.color] || statusColors.green;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CalendarCheck className="w-6 h-6 text-[#01411C]" />
          Weekly Tracker 📝
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your spending week by week. Stay within your monthly budget.
        </p>
      </div>

      {/* ─── Budget Overview Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-white border border-border/60 shadow-sm text-center">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Week</p>
          <p className="text-2xl font-bold text-foreground">{weekNumber}<span className="text-sm text-muted-foreground">/4</span></p>
        </div>
        <div className="p-3 rounded-xl bg-white border border-border/60 shadow-sm text-center">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Weekly Budget</p>
          <p className="text-sm font-bold text-foreground">{formatPKR(weeklyBudget)}</p>
        </div>
        <div className="p-3 rounded-xl bg-white border border-border/60 shadow-sm text-center">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Spent So Far</p>
          <p className={`text-sm font-bold ${runningMonthlyTotal > weeklyBudget * weekNumber ? 'text-red-600' : 'text-foreground'}`}>
            {formatPKR(runningMonthlyTotal)}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-white border border-border/60 shadow-sm text-center">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Remaining</p>
          <p className={`text-sm font-bold ${remainingBudget <= 0 ? 'text-red-600' : 'text-emerald-700'}`}>
            {formatPKR(remainingBudget)}
          </p>
        </div>
      </div>

      {/* ─── Status Banner ─── */}
      <div className={`p-4 rounded-xl ${sc.bg} border ${sc.border} flex items-start gap-3`}>
        <div className={`w-3 h-3 rounded-full ${sc.dot} mt-1 shrink-0`} />
        <div>
          <p className={`text-sm font-bold ${sc.text}`}>{status.label}</p>
          {status.message && <p className={`text-xs ${sc.text} mt-0.5 opacity-80`}>{status.message}</p>}
        </div>
      </div>

      {/* Monthly progress bar */}
      {monthlyBudget > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Monthly Budget Usage</span>
            <span className="font-semibold text-foreground">
              {safePct(runningMonthlyTotal, monthlyBudget)}%
            </span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                runningMonthlyTotal > monthlyBudget ? 'bg-red-500' :
                runningMonthlyTotal > monthlyBudget * 0.75 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, (runningMonthlyTotal / monthlyBudget) * 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{formatPKR(runningMonthlyTotal)} spent</span>
            <span>{formatPKR(monthlyBudget)} budget</span>
          </div>
        </div>
      )}

      {/* ─── Current Week Section ─── */}
      <div className="p-5 rounded-2xl border border-border/60 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-foreground">
              Week {weekNumber} — Current
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(weekStartStr).toLocaleDateString('en-PK', { weekday: 'short', month: 'short', day: 'numeric' })}
              {' – '}
              {new Date(weekEndStr).toLocaleDateString('en-PK', { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
          </div>
          {isLogged && (
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">This Week</p>
              <p className="text-sm font-bold text-foreground">{formatPKR(currentWeek.weekly_total)}</p>
            </div>
          )}
        </div>

        {!showForm && !isLogged && (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
              <ClipboardList className="w-7 h-7 text-amber-600" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">You haven't logged this week yet.</p>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 h-10 px-5 bg-[#01411C] text-white text-sm font-semibold
                         rounded-xl hover:bg-[#026b2e] active:bg-[#012e14]
                         transition-colors cursor-pointer shadow-lg shadow-[#01411C]/20"
            >
              <CalendarCheck className="w-4 h-4" /> Log This Week
            </button>
          </div>
        )}

        {!showForm && isLogged && (
          <div>
            {/* Entries list */}
            <div className="space-y-1.5">
              {currentWeek.entries?.map((e, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50">
                  <span className="text-sm text-foreground">{e.category_name || e.custom_label}</span>
                  <span className="text-sm font-semibold text-foreground">{formatPKR(e.amount)}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-sm text-[#01411C] font-medium hover:text-[#026b2e] transition-colors cursor-pointer"
            >
              ✏️ Edit This Week
            </button>
          </div>
        )}

        {showForm && (
          <WeeklyForm
            weekStart={weekStartStr}
            weekEnd={weekEndStr}
            weekNumber={weekNumber}
            weeklyBudget={weeklyBudget}
            monthlyBudget={monthlyBudget}
            runningMonthlyTotal={isLogged ? runningMonthlyTotal - (currentWeek?.weekly_total || 0) : runningMonthlyTotal}
            remainingBudget={remainingBudget}
            existingEntries={isLogged ? currentWeek.entries : null}
            userCategories={userCategories}
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
          />
        )}
      </div>

      {/* ─── History Section ─── */}
      <div>
        <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#01411C]" />
          Recent Weeks
        </h2>
        <WeeklyHistory weeks={history} weeklyBudget={weeklyBudget} />
      </div>
    </div>
  );
}
