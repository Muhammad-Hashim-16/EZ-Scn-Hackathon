// ============================================
// PennyWise — Dashboard Page (Home Screen)
// ============================================

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import SummaryCards from '@/components/dashboard/SummaryCards';
import LifeHoursToggle from '@/components/dashboard/LifeHoursToggle';
import ExpenseBreakdown from '@/components/dashboard/ExpenseBreakdown';
import GoalsPreview from '@/components/dashboard/GoalsPreview';
import InflationTicker from '@/components/dashboard/InflationTicker';
import { Bell, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── Skeleton Loader ──
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-gray-200 rounded-lg" />
          <div className="h-4 w-32 bg-gray-200 rounded-lg" />
        </div>
        <div className="h-10 w-10 bg-gray-200 rounded-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-2xl" />
        ))}
      </div>
      <div className="h-10 w-64 bg-gray-200 rounded-full" />
      <div className="h-80 bg-gray-200 rounded-2xl" />
      <div className="h-40 bg-gray-200 rounded-2xl" />
    </div>
  );
}

// ── Empty State ──
function EmptyDashboard() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <div className="w-20 h-20 rounded-3xl bg-[#01411C]/10 flex items-center justify-center mb-6">
        <Sparkles className="w-10 h-10 text-[#01411C]" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to PennyWise!</h2>
      <p className="text-muted-foreground max-w-sm mb-6 leading-relaxed">
        Complete your financial setup to see your personalized dashboard with income analysis,
        expense breakdowns, and savings insights.
      </p>
      <Link
        to="/onboarding"
        className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-[#01411C] text-white text-sm font-semibold
                   hover:bg-[#026b2e] active:bg-[#012e14] transition-colors shadow-lg shadow-[#01411C]/20"
      >
        Complete Setup <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const { user, accessToken } = useAuth();
  const [analysis, setAnalysis] = useState(null);
  const [quickHealth, setQuickHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        // Fetch quick health (fast) + full analysis in parallel
        const [healthRes, analysisRes] = await Promise.allSettled([
          fetch(`${API_URL}/api/analysis/quick-health`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            credentials: 'include',
          }),
          fetch(`${API_URL}/api/analysis/monthly`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            credentials: 'include',
          }),
        ]);

        // Quick health
        if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
          const hData = await healthRes.value.json();
          if (hData.success) setQuickHealth(hData);
        }

        // Full analysis
        if (analysisRes.status === 'fulfilled' && analysisRes.value.ok) {
          const aData = await analysisRes.value.json();
          if (aData.success && aData.analysis) {
            setAnalysis(aData.analysis);
            // Check for empty state (no income entered)
            if (aData.analysis.total_income === 0 && aData.analysis.total_expenses === 0) {
              setIsEmpty(true);
            }
          } else {
            setIsEmpty(true);
          }
        } else {
          setIsEmpty(true);
        }
      } catch {
        setIsEmpty(true);
      } finally {
        setLoading(false);
      }
    }

    if (accessToken) loadDashboard();
  }, [accessToken]);

  // Current date
  const now = new Date();
  const monthYear = now.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });
  const firstName = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  // Health dot color
  let dotColor = 'bg-gray-300';
  if (quickHealth) {
    if (quickHealth.health_status === 'safe') dotColor = 'bg-green-500';
    else if (quickHealth.health_status === 'edge') dotColor = 'bg-yellow-500';
    else if (quickHealth.health_status === 'red') dotColor = 'bg-red-500';
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <DashboardSkeleton />
      </div>
    );
  }

  if (isEmpty && !analysis) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        {/* Top bar even on empty state */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Hello {firstName} 👋</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{monthYear}</p>
          </div>
        </div>
        <EmptyDashboard />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">

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
          <button className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center
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
        <SummaryCards analysis={analysis} />

        {/* ═══ 3. Life-Hours Toggle ═══ */}
        <LifeHoursToggle />

        {/* ═══ 4. Expense Breakdown ═══ */}
        <ExpenseBreakdown breakdown={analysis.expenses_breakdown} />

        {/* ═══ 5 & 6. Goals + Inflation ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GoalsPreview goals={analysis.goal_status} />
          <div className="space-y-4">
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
