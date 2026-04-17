// ============================================
// PennyWise — Onboarding Page (5-Step Wizard)
// ============================================

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Coins, ArrowLeft, ArrowRight, Check } from 'lucide-react';

import StepWorkSchedule from '@/components/onboarding/StepWorkSchedule';
import StepIncome from '@/components/onboarding/StepIncome';
import StepExpenses from '@/components/onboarding/StepExpenses';
import StepGoals from '@/components/onboarding/StepGoals';
import StepNotifications from '@/components/onboarding/StepNotifications';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const STEPS = [
  { label: 'Work', title: 'Work Schedule' },
  { label: 'Income', title: 'Your Income' },
  { label: 'Expenses', title: 'Your Expenses' },
  { label: 'Goals', title: 'Savings Goals' },
  { label: 'Finish', title: 'Notifications & Preferences' },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { accessToken, logout } = useAuth();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});

  // ── Shared onboarding data across all steps ──
  const [data, setData] = useState({
    // Step 1
    daily_work_hours: '',
    work_days_per_month: '',

    // Step 2
    fixedIncomes: [{ source_name: 'Primary Salary', amount: '', income_type: 'fixed', frequency: 'monthly' }],
    hasIrregularIncome: false,
    variableIncomes: [],

    // Step 3
    expenses: {},
    hasChildren: false,
    vehicleType: 'car',
    fuelType: 'petrol',
    vehicleFuelAvg: '',
    homeAddress: '',
    officeAddress: '',
    areaOfLiving: '',
    groceryArea: '',
    customExpenses: [],

    // Step 4
    goals: [],

    // Step 5
    weeklyTracker: false,
    priceNotifications: false,
  });

  const updateData = useCallback((updates) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  // ── Validation per step ──
  function validateStep(s) {
    const e = {};

    if (s === 0) {
      const h = parseFloat(data.daily_work_hours);
      const d = parseInt(data.work_days_per_month, 10);
      if (!data.daily_work_hours || isNaN(h) || h < 1 || h > 16) e.daily_work_hours = 'Enter hours between 1 and 16.';
      if (!data.work_days_per_month || isNaN(d) || d < 1 || d > 31) e.work_days_per_month = 'Enter days between 1 and 31.';
    }

    if (s === 1) {
      const valid = data.fixedIncomes.filter((i) => i.source_name && parseFloat(i.amount) > 0);
      if (valid.length === 0) e.fixedIncomes = 'Add at least one income source with an amount.';
    }

    // Steps 2, 3 are skippable
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
      window.scrollTo(0, 0);
    }
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 0));
    setErrors({});
    window.scrollTo(0, 0);
  }

  function handleSkip() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    setErrors({});
    window.scrollTo(0, 0);
  }

  // ── Final submission ──
  async function handleFinish() {
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      };
      const opts = { headers, credentials: 'include' };

      // 1. Save work profile
      await fetch(`${API_URL}/api/income/work-profile`, {
        ...opts,
        method: 'POST',
        body: JSON.stringify({
          daily_work_hours: parseFloat(data.daily_work_hours),
          work_days_per_month: parseInt(data.work_days_per_month, 10),
          home_address: data.homeAddress || null,
          office_address: data.officeAddress || null,
          vehicle_type: data.vehicleType,
          fuel_type: data.fuelType,
          vehicle_fuel_avg: parseFloat(data.vehicleFuelAvg) || null,
        }),
      });

      // 2. Save income sources
      const allIncomes = [
        ...data.fixedIncomes.filter((i) => i.source_name && parseFloat(i.amount) > 0),
        ...data.variableIncomes.filter((i) => i.source_name && parseFloat(i.amount) > 0),
      ];
      for (const income of allIncomes) {
        await fetch(`${API_URL}/api/income/sources`, {
          ...opts,
          method: 'POST',
          body: JSON.stringify({
            source_name: income.source_name,
            amount: parseFloat(income.amount),
            frequency: income.frequency || 'monthly',
            income_type: income.income_type || 'fixed',
            expected_month_day: income.expected_month_day || null,
            notes: null,
          }),
        });
      }

      // 3. Save expenses (bulk)
      const expenseEntries = Object.entries(data.expenses)
        .filter(([, v]) => v.monthly_amount && parseFloat(v.monthly_amount) > 0)
        .map(([catId, v]) => ({
          category_id: catId,
          monthly_amount: parseFloat(v.monthly_amount),
          custom_label: v.custom_label || null,
          area_of_living: data.areaOfLiving || null,
          grocery_area: data.groceryArea || null,
          notes: v.notes || null,
        }));

      // Add custom expenses
      for (const ce of data.customExpenses) {
        if (ce.label && parseFloat(ce.amount) > 0) {
          await fetch(`${API_URL}/api/expenses/custom`, {
            ...opts,
            method: 'POST',
            body: JSON.stringify({
              custom_label: ce.label,
              monthly_amount: parseFloat(ce.amount),
              notes: null,
            }),
          });
        }
      }

      if (expenseEntries.length > 0) {
        await fetch(`${API_URL}/api/expenses/bulk`, {
          ...opts,
          method: 'POST',
          body: JSON.stringify({ expenses: expenseEntries }),
        });
      }

      // 4. Save goals
      for (const goal of data.goals) {
        if (goal.name && parseFloat(goal.target_amount) > 0) {
          await fetch(`${API_URL}/api/goals`, {
            ...opts,
            method: 'POST',
            body: JSON.stringify({
              goal_name: goal.name,
              target_amount: parseFloat(goal.target_amount),
              target_months: parseInt(goal.target_months, 10) || 12,
            }),
          });
        }
      }

      // 5. Complete profile
      await fetch(`${API_URL}/api/user/complete-profile`, {
        ...opts,
        method: 'PUT',
        body: JSON.stringify({
          weekly_tracker_opt_in: data.weeklyTracker,
          notification_enabled: data.priceNotifications,
          has_children: data.hasChildren,
        }),
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Onboarding submission error:', error);
    }
  }

  // ── Render current step component ──
  function renderStep() {
    const props = { data, updateData, errors };
    switch (step) {
      case 0: return <StepWorkSchedule {...props} />;
      case 1: return <StepIncome {...props} />;
      case 2: return <StepExpenses {...props} accessToken={accessToken} />;
      case 3: return <StepGoals {...props} />;
      case 4: return <StepNotifications {...props} onFinish={handleFinish} />;
      default: return null;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-green-50/20 to-white">
      {/* ── Header ── */}
      <header className="border-b border-border/60 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#01411C] flex items-center justify-center">
              <Coins className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-[#01411C]">PennyWise</span>
          </div>
          <span className="text-xs text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        {/* ── Progress Bar ── */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s, i) => (
              <div key={i} className="flex flex-col items-center flex-1">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    i < step
                      ? 'bg-[#01411C] text-white'
                      : i === step
                        ? 'bg-[#01411C] text-white ring-4 ring-[#01411C]/20'
                        : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-[10px] mt-1.5 font-medium hidden sm:block ${
                  i <= step ? 'text-[#01411C]' : 'text-muted-foreground'
                }`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
          {/* Connecting line */}
          <div className="relative h-1 bg-gray-200 rounded-full mx-4 -mt-[34px] sm:-mt-[46px] mb-8">
            <div
              className="absolute inset-y-0 left-0 bg-[#01411C] rounded-full transition-all duration-500"
              style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* ── Step Title ── */}
        <h1 className="text-2xl font-bold text-foreground mb-1 animate-fade-in-up">
          {STEPS[step].title}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {step === 0 && 'Tell us about your work schedule so we can calculate your time value.'}
          {step === 1 && 'Add your income sources to see your full financial picture.'}
          {step === 2 && 'Enter your monthly expenses. Only fill what applies to you.'}
          {step === 3 && 'Set savings goals to track your progress. You can skip this for now.'}
          {step === 4 && 'Choose your notification preferences and finish setup.'}
        </p>

        {/* ── Step Content ── */}
        <div className="animate-fade-in-up">
          {renderStep()}
        </div>

        {/* ── Navigation ── */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/60">
          <button
            onClick={step === 0 ? () => navigate('/login') : handleBack}
            className="h-10 px-5 rounded-xl border border-border text-sm font-medium
                       text-foreground hover:bg-gray-50 transition-colors cursor-pointer
                       flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 0 ? 'Exit' : 'Back'}
          </button>

          <div className="flex items-center gap-3">
            {(step === 2 || step === 3) && (
              <button
                onClick={handleSkip}
                className="h-10 px-5 rounded-xl text-sm font-medium text-muted-foreground
                           hover:text-foreground hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Skip
              </button>
            )}

            {step < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                className="h-10 px-6 rounded-xl bg-[#01411C] text-white text-sm font-medium
                           hover:bg-[#026b2e] transition-colors cursor-pointer
                           shadow-sm shadow-[#01411C]/20 flex items-center gap-1.5"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
