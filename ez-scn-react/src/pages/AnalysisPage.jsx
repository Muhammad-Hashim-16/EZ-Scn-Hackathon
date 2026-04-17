import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import SafeCase from '@/components/analysis/SafeCase';
import EdgeCase from '@/components/analysis/EdgeCase';
import RedCase from '@/components/analysis/RedCase';
import { Activity, RefreshCcw } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function AnalysisPage() {
  const { accessToken } = useAuth();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalysis();
  }, [accessToken]);

  async function fetchAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/analysis/monthly`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch analysis');
      }
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 animate-pulse">
        <div className="h-32 bg-gray-200 rounded-2xl w-full"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="h-48 bg-gray-200 rounded-2xl w-full"></div>
            <div className="h-32 bg-gray-200 rounded-2xl w-full"></div>
          </div>
          <div className="h-96 bg-gray-200 rounded-2xl w-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center">
          <Activity className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-red-800 mb-2">Analysis Currently Unavailable</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <button 
            onClick={fetchAnalysis}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2 mx-auto"
          >
            <RefreshCcw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 pt-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Financial Analysis</h1>
        <p className="text-muted-foreground mt-1">AI-driven insights based on your income, expenses, and inflation trends.</p>
      </div>

      {analysis.health_status === 'safe' && <SafeCase analysis={analysis} />}
      {analysis.health_status === 'edge' && <EdgeCase analysis={analysis} />}
      {analysis.health_status === 'red' && <RedCase analysis={analysis} />}
    </div>
  );
}
