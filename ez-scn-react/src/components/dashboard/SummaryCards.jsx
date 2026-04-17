// ============================================
// Dashboard — Summary Cards Row
// Income · Expenses · Net Savings
// Uses MoneyValue for animated PKR/Hours switch
// ============================================

import { TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import MoneyValue from '@/components/shared/MoneyValue';

export default function SummaryCards({ analysis }) {
  const cards = [
    {
      label: 'Total Income',
      value: analysis.total_income,
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-green-600',
      iconBg: 'bg-white/20',
    },
    {
      label: 'Total Expenses',
      value: analysis.total_expenses,
      icon: TrendingDown,
      gradient: 'from-rose-500 to-red-600',
      iconBg: 'bg-white/20',
    },
    {
      label: 'Net Savings',
      value: analysis.net_savings,
      icon: PiggyBank,
      gradient: analysis.net_savings >= 0
        ? 'from-[#01411C] to-emerald-700'
        : 'from-red-700 to-rose-800',
      iconBg: 'bg-white/20',
      badge: analysis.savings_rate != null
        ? `${analysis.savings_rate >= 0 ? '+' : ''}${analysis.savings_rate}%`
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

              {card.badge && (
                <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 backdrop-blur-sm">
                  Savings Rate: {card.badge}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
