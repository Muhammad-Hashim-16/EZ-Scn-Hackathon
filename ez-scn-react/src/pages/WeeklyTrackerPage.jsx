// ============================================
// PennyWise — Weekly Tracker Page
// Opt-in gate + current week + history
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import WeeklyForm from '@/components/weekly/WeeklyForm';
import WeeklyHistory from '@/components/weekly/WeeklyHistory';
import { CalendarCheck, ClipboardList, TrendingUp, CheckCircle2, Sparkles } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
  return d.toISOString().split('T')[0];
}

// ── Opt-in Screen ──
function OptInScreen({ onOptIn, loading }) {
  return (
    <div className="max-w-lg mx-auto p-4 md:p-8">
      <div className="flex flex-col items-center text-center py-12 px-6">
        <div className="w-20 h-20 rounded-3xl bg-[#01411C]/10 flex items-center justify-center mb-6">
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
            { icon: TrendingUp, text: 'See week-over-week spending trends' },
            { icon: CheckCircle2, text: 'Compare actual vs. budgeted amounts' },
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
          onClick={onOptIn}
          disabled={loading}
          className="w-full max-w-xs h-12 bg-[#01411C] text-white font-semibold rounded-xl
                     hover:bg-[#026b2e] active:bg-[#012e14] disabled:opacity-50
                     transition-colors cursor-pointer shadow-lg shadow-[#01411C]/20"
        >
          {loading ? 'Enabling...' : 'Enable Weekly Tracker'}
        </button>
      </div>
    </div>
  );
}

// ── Loading Skeleton ──
function WeeklySkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-gray-200 rounded-lg" />
      <div className="h-48 bg-gray-200 rounded-2xl" />
      <div className="h-8 w-48 bg-gray-200 rounded-lg" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-gray-200 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function WeeklyTrackerPage() {
  const { user, accessToken } = useAuth();
  const [optedIn, setOptedIn] = useState(null); // null = loading
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [history, setHistory] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [optInLoading, setOptInLoading] = useState(false);

  // Check opt-in state
  useEffect(() => {
    if (user) {
      setOptedIn(user.weekly_tracker_opt_in === true);
    }
  }, [user]);

  const monday = getMondayOfWeek(new Date());
  const sunday = getSundayOfWeek(monday);
  const weekStartStr = toDateStr(monday);
  const weekEndStr = toDateStr(sunday);

  // Fetch current week + history
  const fetchData = useCallback(async () => {
    if (!accessToken || !optedIn) return;
    setLoading(true);

    try {
      const [currentRes, historyRes] = await Promise.allSettled([
        fetch(`${API_URL}/api/weekly/current-week`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include',
        }),
        fetch(`${API_URL}/api/weekly/entries`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include',
        }),
      ]);

      if (currentRes.status === 'fulfilled' && currentRes.value.ok) {
        const data = await currentRes.value.json();
        if (data.success) setCurrentWeek(data);
      }

      if (historyRes.status === 'fulfilled' && historyRes.value.ok) {
        const data = await historyRes.value.json();
        if (data.success) setHistory(data.weeks);
      }
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, [accessToken, optedIn]);

  useEffect(() => {
    if (optedIn) fetchData();
  }, [optedIn, fetchData]);

  // Opt in
  async function handleOptIn() {
    setOptInLoading(true);
    try {
      await fetch(`${API_URL}/api/weekly/opt-in`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({ opt_in: true }),
      });
      setOptedIn(true);
    } catch {
      // fail
    } finally {
      setOptInLoading(false);
    }
  }

  // Save entries
  async function handleSave(weekStart, entries) {
    const res = await fetch(`${API_URL}/api/weekly/entry`, {
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

    // Refresh data
    await fetchData();
    return data;
  }

  // ── Opt-in gate ──
  if (optedIn === null) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <WeeklySkeleton />
      </div>
    );
  }

  if (!optedIn) {
    return <OptInScreen onOptIn={handleOptIn} loading={optInLoading} />;
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <WeeklySkeleton />
      </div>
    );
  }

  const isLogged = currentWeek?.logged || false;
  const weeklyBudget = currentWeek?.weekly_budget || 0;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CalendarCheck className="w-6 h-6 text-[#01411C]" />
          Weekly Tracker 📝
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Log your actual spending each week and compare to your budget.
        </p>
      </div>

      {/* ─── Current Week Section ─── */}
      <div className="p-5 rounded-2xl border border-border/60 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-foreground">Current Week</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(weekStartStr).toLocaleDateString('en-PK', { weekday: 'short', month: 'short', day: 'numeric' })}
              {' – '}
              {new Date(weekEndStr).toLocaleDateString('en-PK', { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
          </div>
          {weeklyBudget > 0 && (
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">Weekly Budget</p>
              <p className="text-sm font-bold text-foreground">PKR {weeklyBudget.toLocaleString()}</p>
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
            {/* Summary for logged week */}
            <div className={`p-4 rounded-xl mb-3 ${
              currentWeek.over_budget
                ? 'bg-red-50 border border-red-200'
                : 'bg-green-50 border border-green-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {currentWeek.over_budget ? (
                    <span className="text-red-600 text-lg">⚠️</span>
                  ) : (
                    <Sparkles className="w-5 h-5 text-green-600" />
                  )}
                  <span className={`text-sm font-semibold ${currentWeek.over_budget ? 'text-red-800' : 'text-green-800'}`}>
                    {currentWeek.over_budget ? 'Over Budget' : 'On Track!'}
                  </span>
                </div>
                <span className="text-lg font-bold text-foreground">
                  PKR {currentWeek.weekly_total?.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Entries list */}
            <div className="space-y-1.5">
              {currentWeek.entries?.map((e, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50">
                  <span className="text-sm text-foreground">{e.category_name || e.custom_label}</span>
                  <span className="text-sm font-semibold text-foreground">PKR {e.amount.toLocaleString()}</span>
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
            existingEntries={isLogged ? currentWeek.entries : null}
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
