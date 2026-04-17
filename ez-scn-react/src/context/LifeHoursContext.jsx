// ============================================
// PennyWise — Life-Hours Toggle Context
// Converts PKR values ↔ work-hours across the
// entire dashboard when toggled.
// ============================================

import { createContext, useContext, useState, useCallback } from 'react';

const LifeHoursContext = createContext(null);

export function LifeHoursProvider({ children, hourlyWage }) {
  const [showHours, setShowHours] = useState(false);

  const toggle = useCallback(() => setShowHours((v) => !v), []);

  // Format a PKR amount into either "PKR X" or "X.X hrs"
  const fmt = useCallback(
    (amount) => {
      const val = parseFloat(amount) || 0;
      if (showHours && hourlyWage > 0) {
        const hours = val / hourlyWage;
        if (hours >= 24) {
          const days = hours / 8; // 8-hour work day
          return `${days.toFixed(1)} work-days`;
        }
        return `${hours.toFixed(1)} hrs`;
      }
      return `PKR ${val.toLocaleString()}`;
    },
    [showHours, hourlyWage]
  );

  // Raw number (for charts)
  const convert = useCallback(
    (amount) => {
      const val = parseFloat(amount) || 0;
      if (showHours && hourlyWage > 0) return +(val / hourlyWage).toFixed(2);
      return val;
    },
    [showHours, hourlyWage]
  );

  const value = {
    showHours,
    toggle,
    fmt,
    convert,
    hourlyWage: hourlyWage || 0,
    unit: showHours ? 'Hours' : 'PKR',
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
