import HealthBadge from './HealthBadge';
import SixMonthProjection from './SixMonthProjection';
import SixMonthChart from './SixMonthChart';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Sparkles, CheckCircle, TrendingUp } from 'lucide-react';
import { formatPKR } from '@/utils/formatters';

export default function SafeCase({ analysis }) {
  // Filter out 0 amounts and sort for the chart
  const data = analysis.expenses_breakdown
    .filter(item => item.total > 0)
    .sort((a, b) => b.total - a.total);

  const COLORS = ['#01411C', '#026B2E', '#038C3B', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5'];

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-100/50 border border-green-200">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-green-600" />
            <h2 className="text-2xl font-bold text-green-800">You're in Good Shape!</h2>
          </div>
          <p className="text-sm text-green-700 max-w-md">
            Your financial foundation is solid. You're living within your means and actively saving against inflation. Keep up the great work!
          </p>
        </div>
        <div className="shrink-0">
          <HealthBadge status="safe" score={analysis.financial_health_score} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Stats & Chart */}
        <div className="space-y-6">
          <div className="p-5 rounded-2xl border border-border/60 bg-white shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-4">What you're doing right</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">You are saving <strong className="text-foreground">{analysis.savings_rate}%</strong> of your income every month.</span>
              </li>
              {analysis.real_savings > 0 && (
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">Your savings outpace the current {analysis.inflation_rate}% inflation rate.</span>
                </li>
              )}
              {analysis.flags.debt_heavy === false && (
                <li className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">Your debt levels are healthy and manageable.</span>
                </li>
              )}
            </ul>
          </div>

          <div className="p-5 rounded-2xl border border-border/60 bg-white shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-1">Expense Breakdown</h3>
            <p className="text-xs text-muted-foreground mb-4">Total Expenses: {formatPKR(analysis.total_expenses)}</p>
            
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="total"
                    nameKey="parent_category_name"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => formatPKR(value)}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: Optimization */}
        <div className="space-y-6">
          {analysis.recommendations.length > 0 && (
            <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-semibold text-amber-800">Room for Optimization</h3>
              </div>
              <p className="text-sm text-amber-700 leading-relaxed">
                Even though you're doing great, <strong className="font-semibold">{analysis.recommendations[0].category}</strong> takes up a bit more of your budget than recommended. {analysis.recommendations[0].message}
              </p>
            </div>
          )}
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
