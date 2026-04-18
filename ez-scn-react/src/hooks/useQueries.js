// ============================================
// PennyWise — React Query Hooks
//
// Centralized query keys + hooks for all data
// fetching. Import these instead of using SWR.
//
// After any mutation, call invalidate helpers
// to keep all pages in sync automatically.
// ============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';

// ── Query Key Factories ──
export const queryKeys = {
  analysis: (userId) => ['analysis', userId],
  monthlyRecord: (userId) => ['monthlyRecord', userId],
  goals: (userId) => ['goals', userId],
  weeklyCurrentWeek: (userId) => ['weekly', 'currentWeek', userId],
  weeklyEntries: (userId) => ['weekly', 'entries', userId],
  oneTimeIncome: (userId) => ['oneTimeIncome', userId],
  expenses: (userId) => ['expenses', userId],
  inflation: () => ['inflation'],
  user: (userId) => ['user', userId],
};

// ── Custom hook: auto-supplies userId from Auth ──
function useUserId() {
  const { user } = useAuth();
  return user?.id || user?.uid || 'anon';
}

// ============================================
// DATA FETCHING HOOKS
// ============================================

/** Monthly analysis */
export function useAnalysis() {
  const { accessToken } = useAuth();
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.analysis(userId),
    queryFn: () => api.get('analysis/monthly'),
    enabled: !!accessToken,
  });
}

/** Current month's record (savings, income, expenses) */
export function useMonthlyRecord() {
  const { accessToken } = useAuth();
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.monthlyRecord(userId),
    queryFn: () => api.get('monthly-record/current'),
    enabled: !!accessToken,
  });
}

/** Savings goals */
export function useGoals() {
  const { accessToken } = useAuth();
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.goals(userId),
    queryFn: () => api.get('goals'),
    enabled: !!accessToken,
  });
}

/** Weekly tracker — current week */
export function useWeeklyCurrentWeek(enabled = true) {
  const { accessToken } = useAuth();
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.weeklyCurrentWeek(userId),
    queryFn: () => api.get('weekly/current-week'),
    enabled: !!accessToken && enabled,
  });
}

/** Weekly tracker — entries/history */
export function useWeeklyEntries(enabled = true) {
  const { accessToken } = useAuth();
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.weeklyEntries(userId),
    queryFn: () => api.get('weekly/entries'),
    enabled: !!accessToken && enabled,
  });
}

/** One-time income entries */
export function useOneTimeIncome() {
  const { accessToken } = useAuth();
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.oneTimeIncome(userId),
    queryFn: () => api.get('income/one-time'),
    enabled: !!accessToken,
  });
}

/** User's active expenses with category breakdown */
export function useExpenses() {
  const { accessToken } = useAuth();
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.expenses(userId),
    queryFn: () => api.get('expenses'),
    enabled: !!accessToken,
  });
}

// ============================================
// INVALIDATION HELPERS
// ============================================

/**
 * Returns a function that invalidates all queries
 * related to a given domain after a mutation.
 */
export function useInvalidate() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return {
    /** After saving income or expenses in Settings */
    afterFinancialUpdate: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.analysis(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.monthlyRecord(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.goals(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyCurrentWeek(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyEntries(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses(userId) });
    },

    /** After goal transfer */
    afterGoalTransfer: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.monthlyRecord(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.analysis(userId) });
    },

    /** After weekly entry */
    afterWeeklyEntry: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyCurrentWeek(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyEntries(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.analysis(userId) });
    },

    /** After one-time income */
    afterOneTimeIncome: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.oneTimeIncome(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.monthlyRecord(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.analysis(userId) });
    },

    /** After monthly check-in */
    afterCheckIn: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.monthlyRecord(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.analysis(userId) });
    },

    /** Invalidate everything (e.g. after login) */
    all: () => {
      queryClient.invalidateQueries();
    },
  };
}
