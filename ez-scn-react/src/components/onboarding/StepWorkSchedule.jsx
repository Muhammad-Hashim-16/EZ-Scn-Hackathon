// ============================================
// Onboarding Step 1 — Work Schedule
// ============================================

import { Clock, Calendar } from 'lucide-react';

export default function StepWorkSchedule({ data, updateData, errors }) {
  return (
    <div className="space-y-6">
      {/* Info Card */}
      <div className="p-4 rounded-xl bg-[#01411C]/[0.04] border border-[#01411C]/10 text-sm text-foreground leading-relaxed">
        <p>
          Your work schedule helps us calculate the <strong>value of your time</strong>.
          We use this to show how many work-hours each expense costs you.
        </p>
      </div>

      {/* Daily Work Hours */}
      <div>
        <label htmlFor="daily_work_hours" className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
          <Clock className="w-4 h-4 text-[#01411C]" />
          Daily Work Hours
        </label>
        <input
          id="daily_work_hours"
          type="number"
          min="1"
          max="16"
          step="0.5"
          value={data.daily_work_hours}
          onChange={(e) => updateData({ daily_work_hours: e.target.value })}
          placeholder="e.g., 8"
          className={`w-full h-11 px-3.5 rounded-xl border bg-white text-sm
                     placeholder:text-muted-foreground
                     focus:outline-none focus:ring-2 focus:ring-[#01411C]/20 focus:border-[#01411C]
                     transition-all ${errors.daily_work_hours ? 'border-red-400' : 'border-input'}`}
        />
        {errors.daily_work_hours && (
          <p className="mt-1.5 text-xs text-red-600">{errors.daily_work_hours}</p>
        )}
        <p className="mt-1.5 text-xs text-muted-foreground">
          How many hours do you actively work each day? (1–16)
        </p>
      </div>

      {/* Work Days Per Month */}
      <div>
        <label htmlFor="work_days_per_month" className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
          <Calendar className="w-4 h-4 text-[#01411C]" />
          Work Days Per Month
        </label>
        <input
          id="work_days_per_month"
          type="number"
          min="1"
          max="31"
          value={data.work_days_per_month}
          onChange={(e) => updateData({ work_days_per_month: e.target.value })}
          placeholder="e.g., 22"
          className={`w-full h-11 px-3.5 rounded-xl border bg-white text-sm
                     placeholder:text-muted-foreground
                     focus:outline-none focus:ring-2 focus:ring-[#01411C]/20 focus:border-[#01411C]
                     transition-all ${errors.work_days_per_month ? 'border-red-400' : 'border-input'}`}
        />
        {errors.work_days_per_month && (
          <p className="mt-1.5 text-xs text-red-600">{errors.work_days_per_month}</p>
        )}
        <p className="mt-1.5 text-xs text-muted-foreground">
          Typical working days per month, including half-days. (1–31)
        </p>
      </div>

      {/* Preview calculation */}
      {data.daily_work_hours && data.work_days_per_month && (
        <div className="p-4 rounded-xl bg-white border border-border/60 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Total monthly work hours:
          </p>
          <p className="text-2xl font-bold text-[#01411C] mt-1">
            {(parseFloat(data.daily_work_hours) * parseInt(data.work_days_per_month, 10)).toFixed(0)} hours
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Your hourly wage will be calculated after adding income sources.
          </p>
        </div>
      )}
    </div>
  );
}
