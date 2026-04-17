// ============================================
// Dashboard — Life-Hours Pill Toggle
// ============================================

import { useLifeHours } from '@/context/LifeHoursContext';
import { Clock, Banknote, Info } from 'lucide-react';
import { useState } from 'react';

export default function LifeHoursToggle() {
  const { showHours, toggle, hourlyWage } = useLifeHours();
  const [showTooltip, setShowTooltip] = useState(false);

  if (!hourlyWage || hourlyWage <= 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
      {/* Pill Toggle */}
      <button
        onClick={toggle}
        className="relative flex items-center h-10 rounded-full bg-gray-100 border border-border/60 p-0.5 cursor-pointer
                   hover:shadow-md transition-shadow duration-200"
        aria-label="Toggle between PKR and life hours"
      >
        {/* Background slider */}
        <div
          className={`absolute top-0.5 h-9 w-[calc(50%-2px)] rounded-full bg-[#01411C] shadow-sm
                      transition-transform duration-300 ease-in-out
                      ${showHours ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'}`}
        />

        {/* PKR label */}
        <span
          className={`relative z-10 flex items-center gap-1.5 px-4 h-9 text-xs font-semibold rounded-full
                      transition-colors duration-200
                      ${!showHours ? 'text-white' : 'text-muted-foreground'}`}
        >
          <Banknote className="w-3.5 h-3.5" />
          Show PKR
        </span>

        {/* Hours label */}
        <span
          className={`relative z-10 flex items-center gap-1.5 px-4 h-9 text-xs font-semibold rounded-full
                      transition-colors duration-200
                      ${showHours ? 'text-white' : 'text-muted-foreground'}`}
        >
          <Clock className="w-3.5 h-3.5" />
          Life Hours
        </span>
      </button>

      {/* Tooltip */}
      <div className="relative">
        <button
          className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-muted-foreground
                     hover:bg-[#01411C]/10 hover:text-[#01411C] transition-colors cursor-pointer"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={() => setShowTooltip((v) => !v)}
          aria-label="Info about life hours"
        >
          <Info className="w-3.5 h-3.5" />
        </button>

        {showTooltip && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 p-3 rounded-xl
                          bg-gray-900 text-white text-xs shadow-xl z-50 animate-fade-in-up">
            <p className="font-semibold mb-1">💡 Life Hours Mode</p>
            <p className="opacity-80 leading-relaxed">
              1 hour of your work = <strong>PKR {hourlyWage.toLocaleString()}</strong>.
              See how many work-hours each expense costs you.
            </p>
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0
                            border-l-[6px] border-r-[6px] border-t-[6px]
                            border-transparent border-t-gray-900" />
          </div>
        )}
      </div>
    </div>
  );
}
