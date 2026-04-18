// ============================================
// PennyWise — Life-Hours Toggle Context
// Converts PKR values ↔ work-hours across the
// entire app when toggled.
//
// Provides:
//   isLifeHoursMode  — boolean toggle state
//   toggleMode()     — flip the toggle
//   hourlyWage       — from work profile
//   toLifeHours(amt) — "Xh Ym" string
//   formatValue(amt) — "PKR X" or "Xh Ym"
//   fmt(amt)         — alias for formatValue (v1 compat)
//   convert(amt)     — raw number for charts
//   unit             — "PKR" or "Hours"
// ============================================
import { formatPKR } from '@/utils/formatters';

import { createContext, useContext, useState, useCallback } from 'react';

const LifeHoursContext = createContext(null);

export function LifeHoursProvider({ children, hourlyWage }) {
  const [isLifeHoursMode, setIsLifeHoursMode] = useState(false);

  const toggleMode = useCallback(() => setIsLifeHoursMode((v) => !v), []);

  /**
   * Convert a PKR amount to "Xh Ym" string.
   * Always returns hours format regardless of toggle state.
   */
  const toLifeHours = useCallback(
    (amount) => {
      const val = parseFloat(amount) || 0;
      const wage = hourlyWage || 0;
      if (wage <= 0) return 'N/A';

      const totalMinutes = Math.round((val / wage) * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      if (hours >= 24) {
        const days = Math.floor(hours / 8); // 8-hour work day
        const remainingHours = hours % 8;
        if (days > 0 && remainingHours > 0) {
          return `${days}d ${remainingHours}h`;
        }
        return `${days} work-day${days !== 1 ? 's' : ''}`;
      }

      if (hours === 0) return `${minutes}m`;
      if (minutes === 0) return `${hours}h`;
      return `${hours}h ${minutes}m`;
    },
    [hourlyWage]
  );

  /**
   * Format a PKR amount based on the current mode.
   * Returns "PKR X,XXX" in PKR mode or "Xh Ym" in life-hours mode.
   */
  const formatValue = useCallback(
    (amount) => {
      const val = parseFloat(amount) || 0;
      if (isLifeHoursMode && hourlyWage > 0) {
        return toLifeHours(val);
      }
      return formatPKR(val);
    },
    [isLifeHoursMode, hourlyWage, toLifeHours]
  );

  /**
   * Raw numeric conversion for charts (no formatting).
   */
  const convert = useCallback(
    (amount) => {
      const val = parseFloat(amount) || 0;
      if (isLifeHoursMode && hourlyWage > 0) {
        return +(val / hourlyWage).toFixed(2);
      }
      return val;
    },
    [isLifeHoursMode, hourlyWage]
  );

  const value = {
    // New API
    isLifeHoursMode,
    toggleMode,
    toLifeHours,
    formatValue,

    // V1 compat aliases
    showHours: isLifeHoursMode,
    toggle: toggleMode,
    fmt: formatValue,
    convert,

    hourlyWage: hourlyWage || 0,
    unit: isLifeHoursMode ? 'Hours' : 'PKR',
  };

  return (
    <LifeHoursContext.Provider value={value}>
      {children}
    </LifeHoursContext.Provider>
  );
}

export function useLifeHours() {
  const context = useContext(LifeHoursContext);
  if (!context) {
    throw new Error('useLifeHours must be used within a LifeHoursProvider');
  }
  return context;
}

export default LifeHoursContext;
