// ============================================
// PennyWise — Six Month Inflation Predictor Chart
//
// Shows the declining purchasing power of savings
// over 6 months with a shaded gap between nominal
// and real value lines.
// ============================================

import {
  ResponsiveContainer, AreaChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { TrendingDown, Info } from 'lucide-react';
import { formatPKR } from '@/utils/formatters';

const MONTH_LABELS = ['Now', '+1 mo', '+2 mo', '+3 mo', '+4 mo', '+5 mo', '+6 mo'];

export default function SixMonthChart({ netSavings, inflationRate }) {
  const savings = parseFloat(netSavings) || 0;
  const annualRate = parseFloat(inflationRate) || 12;

  if (savings <= 0) return null;

  const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1;

  // Build data points
  const data = Array.from({ length: 7 }, (_, i) => {
    const nominal = savings;
    const realValue = Math.round(savings * Math.pow(1 - monthlyRate, i));
    const loss = nominal - realValue;
    return {
      month: MONTH_LABELS[i],
      nominal,
      real: realValue,
      loss,
    };
  });

  const finalReal = data[6].real;
  const totalLoss = savings - finalReal;

  // Custom tooltip
  function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white rounded-xl shadow-xl border border-border/40 p-3 text-xs">
        <p className="font-semibold text-foreground mb-1.5">{label}</p>
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 py-0.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold text-foreground">{formatPKR(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl border border-border/60 bg-white shadow-sm space-y-5">
      {/* Header */}
      <div>
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-red-500" />
          What Your Savings Are Worth Over Time
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          At current <strong className="text-foreground">{annualRate}%</strong> annual inflation rate
        </p>
      </div>

      {/* Chart */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
            <defs>
              {/* Gradient for the inflation loss shaded area */}
              <linearGradient id="inflationLoss" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.03} />
              </linearGradient>
              <linearGradient id="nominalFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#01411C" stopOpacity={0.05} />
                <stop offset="100%" stopColor="#01411C" stopOpacity={0.01} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />

            <XAxis
              dataKey="month"
              stroke="#9ca3af"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#9ca3af"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${Math.round(val / 1000)}k`}
              domain={['auto', 'auto']}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
            />

            {/* Nominal savings — flat line with subtle fill */}
            <Area
              type="monotone"
              dataKey="nominal"
              name="Nominal Value"
              stroke="#9ca3af"
              strokeWidth={2}
              strokeDasharray="6 4"
              fill="url(#nominalFill)"
              dot={false}
            />

            {/* Real purchasing power — declining with red shading */}
            <Area
              type="monotone"
              dataKey="real"
              name="Real Purchasing Power"
              stroke="#01411C"
              strokeWidth={3}
              fill="url(#inflationLoss)"
              dot={{ r: 4, fill: '#01411C', stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#01411C', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-red-50 to-amber-50 border border-red-100">
        <p className="text-sm text-gray-800 leading-relaxed">
          In 6 months, your <strong className="text-foreground">{formatPKR(savings)}</strong> savings
          will only buy what <strong className="text-[#01411C]">{formatPKR(finalReal)}</strong> buys
          today — a loss of <strong className="text-red-600">{formatPKR(totalLoss)}</strong> in
          purchasing power.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-50" />
        <p>
          Projection based on current inflation rate. Actual inflation may vary. Not financial advice.
        </p>
      </div>
    </div>
  );
}
