import HealthBadge from './HealthBadge';
import RecommendationCard from './RecommendationCard';
import SixMonthProjection from './SixMonthProjection';
import SixMonthChart from './SixMonthChart';
import { AlertCircle, Target, TrendingDown } from 'lucide-react';

export default function EdgeCase({ analysis }) {
  
  const totalPotentialSavings = analysis.recommendations.reduce(
    (sum, r) => sum + (r.potential_savings || 0), 0
  );

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-6 h-6 text-yellow-600" />
            <h2 className="text-2xl font-bold text-yellow-800">Action Needed</h2>
          </div>
          <p className="text-sm text-yellow-700 max-w-md">
            You are surviving, but there's significant room for improvement. A few adjustments could drastically improve your financial security.
          </p>
        </div>
        <div className="shrink-0">
          <HealthBadge status="edge" score={analysis.financial_health_score} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Recommendations */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Target className="w-4 h-4 text-[#01411C]" />
              Recommended Adjustments
            </h3>
            <span className="bg-gray-100 text-muted-foreground text-xs font-bold px-2.5 py-0.5 rounded-full">
              {analysis.recommendations.length} Items
            </span>
          </div>
          
          <div className="space-y-3">
            {analysis.recommendations.map((rec, i) => (
              <RecommendationCard key={i} rec={rec} />
            ))}
            {analysis.recommendations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 bg-gray-50 rounded-xl border border-border border-dashed">
                No specific category recommendations found, but try to increase income or lower overall expenses.
              </p>
            )}
          </div>

          {totalPotentialSavings > 0 && (
            <div className="p-4 rounded-xl bg-green-50 border border-green-200 flex items-center justify-between mt-4">
              <div>
                <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Potential Total Savings</p>
                <p className="text-lg font-bold text-green-800">PKR {totalPotentialSavings.toLocaleString()}/mo</p>
              </div>
              <TrendingDown className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          )}
        </div>

        {/* Right Column: Projection & Warnings */}
        <div className="space-y-6">
          {analysis.flags.debt_heavy && (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">
              <strong className="font-semibold block mb-1">High Debt Warning</strong>
              Your debt repayments are consuming a large portion of your income, making it hard to save. Prioritize clearing high-interest debt first.
            </div>
          )}
          {analysis.flags.no_savings && (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">
              <strong className="font-semibold block mb-1">Zero Savings Warning</strong>
              You are currently not saving any money. This leaves you vulnerable to emergencies.
            </div>
          )}

          <div className="pt-2 space-y-6">
            <SixMonthChart
              netSavings={analysis.net_savings}
              inflationRate={analysis.inflation_rate}
            />
            <SixMonthProjection 
              projection={analysis.six_month_projection} 
              inflationRate={analysis.inflation_rate} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
