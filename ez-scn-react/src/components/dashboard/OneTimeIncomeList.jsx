// ============================================
// Dashboard — Recent One-Time Income Section
// Shows a compact list of recent one-time income entries
// ============================================

import { Gift } from 'lucide-react';
import { formatPKR } from '@/utils/formatters';

export default function OneTimeIncomeList({ entries }) {
  if (!entries || entries.length === 0) return null;

  // Show only the 5 most recent
  const recent = entries.slice(0, 5);

  return (
    <div className="p-5 rounded-2xl border border-border/60 bg-white shadow-sm">
      <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
        <Gift className="w-4 h-4 text-emerald-600" />
        Recent One-Time Income
      </h3>
      <div className="space-y-2">
        {recent.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between py-2 px-3 rounded-xl bg-emerald-50/50 border border-emerald-100"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {entry.description}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {new Date(entry.received_date).toLocaleDateString('en-PK', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
            <span className="text-sm font-bold text-emerald-700 whitespace-nowrap ml-3">
              +{formatPKR(entry.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
