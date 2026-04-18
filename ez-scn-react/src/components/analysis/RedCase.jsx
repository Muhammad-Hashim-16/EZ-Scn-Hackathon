import HealthBadge from './HealthBadge';
import RecommendationCard from './RecommendationCard';
import SixMonthProjection from './SixMonthProjection';
import SixMonthChart from './SixMonthChart';
import { ShieldAlert, AlertOctagon, Info } from 'lucide-react';
import { formatPKR } from '@/utils/formatters';

export default function RedCase({ analysis }) {
  const deficit = Math.abs(analysis.net_savings);

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl bg-gradient-to-br from-red-50 to-rose-100/60 border border-red-200">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-6 h-6 text-red-600" />
            <h2 className="text-2xl font-bold text-red-800">Urgent Attention Required</h2>
          </div>
          <p className="text-sm text-red-700 max-w-md">
            Your finances are in a critical state. Immediate action is heavily advised to prevent severe debt cycles and financial instability.
          </p>
        </div>
        <div className="shrink-0">
          <HealthBadge status="red" score={analysis.financial_health_score} />
        </div>
      </div>

      {/* Critical Deficit Banner */}
      {analysis.net_savings < 0 && (
        <div className="p-5 rounded-2xl bg-red-600 text-white shadow-lg shadow-red-600/20 flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <AlertOctagon className="w-8 h-8 opacity-80" />
            <div>
              <p className="text-sm font-medium opacity-90">Current Deficit</p>
              <p className="text-xl font-bold">You are spending {formatPKR(deficit)} more than you earn</p>
            </div>
          </div>
          <p className="text-xs max-w-[200px] text-center sm:text-right opacity-80">
            This means you are accumulating debt or burning through savings every month.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Recommendations */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-foreground">Critical Interventions</h3>
          
          <div className="space-y-3">
            {analysis.recommendations.map((rec, i) => (
              <RecommendationCard key={i} rec={rec} />
            ))}
            {analysis.recommendations.length === 0 && (
              <p className="text-sm text-muted-foreground">No specific outliers detected, you must fundamentally restructure your budget.</p>
            )}
          </div>
        </div>

        {/* Right Column: Goals & Warnings */}
        <div className="space-y-6">
          
          {/* Goal Impact */}
          {analysis.goal_status && analysis.goal_status.length > 0 && (
            <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50">
              <h4 className="text-sm font-bold text-gray-800 mb-3">Impact on your Goals</h4>
              <ul className="space-y-2">
                {analysis.goal_status.map(g => (
                  <li key={g.id} className="flex justify-between items-center text-sm border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                    <span className="font-medium text-gray-600">{g.goal_name}</span>
                    <span className="text-red-600 font-semibold bg-red-100 px-2 py-0.5 rounded text-xs">Delayed indefinitely</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3 items-start p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-200 text-xs leading-relaxed">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <p>
              <strong>Disclaimer:</strong> PennyWise provides mathematical models, not certified financial advice. If you are struggling with severe debt, consider speaking with a professional credit counselor or financial advisor.
            </p>
          </div>
        </div>
      </div>

      {/* Full-width: 6-Month Projection */}
      <SixMonthChart
        netSavings={analysis.net_savings}
        inflationRate={analysis.inflation_rate}
      />
      <SixMonthProjection 
        projection={analysis.six_month_projection} 
        inflationRate={analysis.inflation_rate} 
      />
    </div>
  );
}
