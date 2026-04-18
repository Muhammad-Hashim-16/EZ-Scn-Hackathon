// ============================================
// Dashboard — Summary Cards Row
// Income · Expected Expenses · Cumulative Savings
// Uses MoneyValue for animated PKR/Hours switch
// ============================================

import { TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import MoneyValue from '@/components/shared/MoneyValue';
import { formatPKR } from '@/utils/formatters';

export default function SummaryCards({ analysis, monthlyRecord }) {
  // Prefer monthly record values (cumulative savings),
  // fall back to analysis values if record hasn't loaded yet
  const income = monthlyRecord?.income ?? analysis.total_income;
  const expectedExpenses = monthlyRecord?.expected_expenses ?? analysis.total_expenses;
  const cumulativeSavings = monthlyRecord?.cumulative_savings ?? analysis.net_savings;

  const cards = [
    {
      label: 'Income',
      value: income,
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-green-600',
      iconBg: 'bg-white/20',
    },
    {
      label: 'Expected Expenses',
      value: expectedExpenses,
      icon: TrendingDown,
      gradient: 'from-rose-500 to-red-600',
      iconBg: 'bg-white/20',
    },
    {
      label: 'Cumulative Savings',
      value: cumulativeSavings,
      icon: PiggyBank,
      gradient: cumulativeSavings >= 0
        ? 'from-[#01411C] to-emerald-700'
        : 'from-red-700 to-rose-800',
      iconBg: 'bg-white/20',
      subtitle: monthlyRecord
        ? `This month: ${formatPKR(monthlyRecord.monthly_net || 0)}`
        : null,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} p-5 text-white shadow-lg`}
          >
            {/* Decorative circle */}
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/[0.06]" />
            <div className="absolute -right-2 -bottom-6 w-32 h-32 rounded-full bg-white/[0.04]" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
                  {card.label}
                </p>
                <div className={`w-9 h-9 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <p className="text-2xl font-bold tracking-tight">
                <MoneyValue amount={card.value} />
              </p>

              {card.subtitle && (
                <p className="mt-1.5 text-[11px] font-medium opacity-70">
                  {card.subtitle}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
