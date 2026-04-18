// ============================================
// PennyWise — Analysis Page
// Uses React Query for data fetching
// ============================================

import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useAnalysis } from '@/hooks/useQueries';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import PageError from '@/components/shared/PageError';
import EmptyState from '@/components/shared/EmptyState';
import SafeCase from '@/components/analysis/SafeCase';
import EdgeCase from '@/components/analysis/EdgeCase';
import RedCase from '@/components/analysis/RedCase';
import { Activity } from 'lucide-react';

export default function AnalysisPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const {
    data: analysisResponse,
    error: analysisError,
    isLoading: analysisLoading,
    refetch: refetchAnalysis
  } = useAnalysis();

  const loading = !accessToken || analysisLoading;
  const analysis = analysisResponse?.success ? analysisResponse.analysis : null;
  const error = analysisError?.message || (!analysisLoading && !analysisResponse?.success && analysisResponse?.error) || null;
  const errorStatus = analysisError?.status || null;
  const isEmpty = analysis && analysis.total_income === 0 && analysis.total_expenses === 0;

  // ── Loading state ──
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <div className="h-9 w-56 bg-gray-200 rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-80 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <LoadingSkeleton type="analysis" />
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Financial Analysis</h1>
          <p className="text-muted-foreground mt-1">Insights based on your income, expenses, and inflation trends.</p>
        </div>
        <PageError error={error} status={errorStatus} onRetry={() => refetchAnalysis()} />
      </div>
    );
  }

  // ── Empty state ──
  if (isEmpty) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Financial Analysis</h1>
          <p className="text-muted-foreground mt-1">Insights based on your income, expenses, and inflation trends.</p>
        </div>
        <EmptyState
          icon="📊"
          title="No Financial Data Yet"
          description="Add your income sources and monthly expenses first. We'll crunch the numbers and give you a complete financial health report."
          actionLabel="Set Up Income & Expenses"
          onAction={() => navigate('/onboarding')}
        />
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 pt-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Financial Analysis</h1>
        <p className="text-muted-foreground mt-1">Insights based on your income, expenses, and inflation trends.</p>
      </div>

      {analysis.health_status === 'safe' && <SafeCase analysis={analysis} />}
      {analysis.health_status === 'edge' && <EdgeCase analysis={analysis} />}
      {analysis.health_status === 'red' && <RedCase analysis={analysis} />}
    </div>
  );
}
