// ============================================
// Dashboard — Expense Breakdown
// Donut chart + itemized list
// Uses MoneyValue for animated toggling
// ============================================

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useLifeHours } from '@/context/LifeHoursContext';
import MoneyValue from '@/components/shared/MoneyValue';
import { formatPKR, safePct } from '@/utils/formatters';

const CATEGORY_ICONS = {
  'Housing': '🏠', 'Utility Bills': '💡', 'Grocery': '🛒',
  'Fuel': '⛽', "Children": '👶', 'Health': '🏥',
  'Insurance': '🛡️', 'Household Help': '👩‍🍳', 'Subscriptions': '📺',
  'Debt': '💳', 'Committee': '🤝',
  'Clothing': '👔', 'Social': '🕌', 'Custom': '✏️',
};

const COLORS = [
  '#01411C', '#026B2E', '#059669', '#10B981', '#34D399',
  '#6EE7B7', '#A7F3D0', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1',
];

function getIcon(name) {
  for (const [key, emoji] of Object.entries(CATEGORY_ICONS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return '📦';
}

export default function ExpenseBreakdown({ breakdown }) {
  const { fmt, convert } = useLifeHours();

  if (!breakdown || breakdown.length === 0) return null;

  const data = breakdown
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const grandTotal = data.reduce((s, c) => s + c.total, 0);

  return (
    <div className="p-5 rounded-2xl border border-border/60 bg-white shadow-sm">
      <h3 className="text-base font-bold text-foreground mb-4">Expense Breakdown</h3>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Donut Chart */}
        <div className="w-full lg:w-64 h-64 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.map((d) => ({ ...d, chartValue: convert(d.total) }))}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={3}
                dataKey="chartValue"
                nameKey="parent_category_name"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [
                  fmt(data.find((d) => d.parent_category_name === name)?.total || value),
                  name,
                ]}
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 4px 24px rgb(0 0 0 / 0.12)',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Itemized List */}
        <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[320px] pr-1">
          {data.map((cat, i) => {
            const pct = safePct(cat.total, grandTotal);
            return (
              <button
                key={cat.parent_id}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                           hover:bg-gray-50 transition-colors group text-left cursor-pointer"
              >
                {/* Icon */}
                <span className="text-lg shrink-0">{getIcon(cat.parent_category_name)}</span>

                {/* Name + bar */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-[#01411C] transition-colors">
                    {cat.parent_category_name}
                  </p>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        backgroundColor: COLORS[i % COLORS.length],
                      }}
                    />
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right shrink-0 ml-2">
                  <p className="text-sm font-semibold text-foreground">
                    <MoneyValue amount={cat.total} />
                  </p>
                  <p className="text-[11px] text-muted-foreground">{pct}%</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
