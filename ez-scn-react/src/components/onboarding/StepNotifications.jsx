// ============================================
// Onboarding Step 5 — Notifications & Finish
// ============================================

import { useState } from 'react';
import { Bell, CalendarCheck, Fuel, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';

export default function StepNotifications({ data, updateData, onFinish }) {
  const [submitting, setSubmitting] = useState(false);
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  async function requestNotificationPermission() {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
  }

  async function handleFinish() {
    setSubmitting(true);
    await onFinish();
    // if onFinish doesn't navigate (error), stop spinner
    setSubmitting(false);
  }

  return (
    <div className="space-y-6">
      {/* ── Weekly Tracker ── */}
      <div className="p-4 rounded-xl bg-white border border-border/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#01411C]/10 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5 text-[#01411C]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Weekly Expense Tracker</p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xs">
                Every Sunday at 6 PM we&apos;ll remind you to log your weekly expenses for better accuracy.
              </p>
            </div>
          </div>
          <button
            onClick={() => updateData({ weeklyTracker: !data.weeklyTracker })}
            className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors duration-200 cursor-pointer shrink-0 ${
              data.weeklyTracker ? 'bg-[#01411C]' : 'bg-gray-300'
            }`}
            role="switch"
            aria-checked={data.weeklyTracker}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              data.weeklyTracker ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>
      </div>

      {/* ── Price Notifications ── */}
      <div className="p-4 rounded-xl bg-white border border-border/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Fuel className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Price Change Notifications</p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xs">
                Get notified when petrol prices change or food prices spike so you can adjust your budget.
              </p>
            </div>
          </div>
          <button
            onClick={() => updateData({ priceNotifications: !data.priceNotifications })}
            className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors duration-200 cursor-pointer shrink-0 ${
              data.priceNotifications ? 'bg-[#01411C]' : 'bg-gray-300'
            }`}
            role="switch"
            aria-checked={data.priceNotifications}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              data.priceNotifications ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>
      </div>

      {/* ── Browser Notification Permission ── */}
      {(data.weeklyTracker || data.priceNotifications) && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">Browser Notifications</p>
              <p className="text-xs text-blue-700 mt-0.5">
                {notifPermission === 'granted'
                  ? 'Notifications are enabled. You\'re all set!'
                  : 'Allow browser notifications to receive alerts.'}
              </p>
            </div>
            {notifPermission === 'granted' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <button
                onClick={requestNotificationPermission}
                className="h-8 px-3 rounded-lg bg-blue-600 text-white text-xs font-medium
                           hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Allow
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Summary ── */}
      <div className="p-5 rounded-xl bg-[#01411C]/[0.04] border border-[#01411C]/10 space-y-2">
        <p className="text-sm font-semibold text-foreground">You&apos;re almost done!</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Click "Finish Setup" to save all your information and start using PennyWise.
          You can always edit your profile, expenses, and goals from the dashboard.
        </p>
      </div>

      {/* ── Finish Button ── */}
      <button
        onClick={handleFinish}
        disabled={submitting}
        className="w-full h-12 rounded-xl bg-[#01411C] text-white font-semibold text-sm
                   hover:bg-[#026b2e] active:bg-[#012e14]
                   disabled:opacity-60 disabled:cursor-not-allowed
                   focus:outline-none focus:ring-2 focus:ring-[#01411C]/30 focus:ring-offset-2
                   transition-all duration-200 flex items-center justify-center gap-2
                   shadow-lg shadow-[#01411C]/20 cursor-pointer"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving your data...
          </>
        ) : (
          <>
            Finish Setup
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
}
