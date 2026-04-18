// ============================================
// PennyWise — MoneyValue Shared Component
//
// Wraps any monetary amount and automatically
// renders as "PKR X" or "Xh Ym" based on the
// global LifeHoursContext toggle state.
//
// Usage:
//   <MoneyValue amount={18000} />
//   <MoneyValue amount={18000} className="text-xl" />
// ============================================

import { useLifeHours } from '@/context/LifeHoursContext';
import { formatPKR } from '@/utils/formatters';

export default function MoneyValue({ amount, className = '' }) {
  const { isLifeHoursMode, toLifeHours } = useLifeHours();

  const pkrText = formatPKR(parseFloat(amount) || 0);
  const hoursText = toLifeHours(amount);
  const displayText = isLifeHoursMode ? hoursText : pkrText;

  return (
    <span
      className={`inline-block transition-all duration-300 ${className}`}
      title={isLifeHoursMode ? pkrText : hoursText}
    >
      <span
        key={isLifeHoursMode ? 'hours' : 'pkr'}
        className="inline-block animate-money-flip"
      >
        {displayText}
      </span>
    </span>
  );
}

/**
 * MoneyValueRaw — returns just the string, no wrapper element.
 * Useful inside chart tooltips, table cells, etc.
 */
export function useMoneyFormat() {
  const { formatValue, toLifeHours, isLifeHoursMode } = useLifeHours();
  return { formatValue, toLifeHours, isLifeHoursMode };
}
