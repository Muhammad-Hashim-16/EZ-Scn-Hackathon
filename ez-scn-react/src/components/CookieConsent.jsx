// ============================================
// PennyWise — Cookie Consent Banner + Modal
// ============================================

import { useState, useEffect } from 'react';
import { X, Cookie, Shield, BarChart3, Lock } from 'lucide-react';

const CONSENT_KEY = 'rw_consent';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function sendConsentToBackend(accepted) {
  const token = localStorage.getItem('accessToken');
  if (!token) return;

  fetch(`${API_URL}/api/user/consent`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    credentials: 'include',
    body: JSON.stringify({ cookies_accepted: accepted }),
  }).catch(() => {});
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) {
      // Small delay so it doesn't flash on page load
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  function saveChoice(acceptAll) {
    const consent = {
      essential: true,
      analytics: acceptAll ? true : analytics,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    sendConsentToBackend(true);
    setVisible(false);
    setShowModal(false);
  }

  function rejectNonEssential() {
    const consent = {
      essential: true,
      analytics: false,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    sendConsentToBackend(false);
    setVisible(false);
    setShowModal(false);
  }

  if (!visible) return null;

  return (
    <>
      {/* ── Banner ── */}
      {!showModal && (
        <div className="fixed bottom-0 inset-x-0 z-50 animate-fade-in-up">
          <div className="mx-auto max-w-3xl px-4 pb-4">
            <div className="bg-white rounded-2xl shadow-2xl shadow-black/10 border border-border/60 p-5 sm:p-6">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="hidden sm:flex w-10 h-10 rounded-xl bg-[#01411C]/10 items-center justify-center shrink-0 mt-0.5">
                  <Cookie className="w-5 h-5 text-[#01411C]" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground mb-1">Cookie Preferences</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We use cookies to keep PennyWise working. Essential cookies are required.
                    Analytics cookies are optional.
                  </p>

                  {/* Buttons */}
                  <div className="flex flex-wrap gap-2.5 mt-4">
                    <button
                      onClick={() => saveChoice(true)}
                      className="h-9 px-4 rounded-lg bg-[#01411C] text-white text-sm font-medium
                                 hover:bg-[#026b2e] transition-colors cursor-pointer
                                 shadow-sm shadow-[#01411C]/20"
                    >
                      Accept All
                    </button>
                    <button
                      onClick={rejectNonEssential}
                      className="h-9 px-4 rounded-lg border border-border bg-white text-sm font-medium
                                 text-foreground hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      Reject Non-Essential
                    </button>
                    <button
                      onClick={() => setShowModal(true)}
                      className="h-9 px-4 rounded-lg text-sm font-medium text-[#01411C]
                                 hover:bg-[#01411C]/5 transition-colors cursor-pointer"
                    >
                      Manage Preferences
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Preferences Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-border/60 animate-fade-in-up overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#01411C]/10 flex items-center justify-center">
                  <Shield className="w-4.5 h-4.5 text-[#01411C]" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Cookie Preferences</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center
                           text-muted-foreground hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="px-6 pt-3 text-sm text-muted-foreground">
              Choose which cookies you&apos;d like to allow. Essential cookies cannot be disabled
              as they are required for PennyWise to function.
            </p>

            {/* Cookie toggles */}
            <div className="p-6 space-y-4">
              {/* Essential Cookies — locked ON */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#01411C]/[0.04] border border-[#01411C]/10">
                <div className="flex items-center gap-3">
                  <Lock className="w-4 h-4 text-[#01411C]" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Essential Cookies</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Authentication, security, preferences</p>
                  </div>
                </div>
                {/* Always ON toggle — disabled */}
                <div className="w-11 h-6 rounded-full bg-[#01411C] flex items-center px-0.5 opacity-80 cursor-not-allowed">
                  <div className="w-5 h-5 rounded-full bg-white shadow-sm ml-auto" />
                </div>
              </div>

              {/* Analytics Cookies — toggleable */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-border/60">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Analytics Cookies</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Help us improve PennyWise</p>
                  </div>
                </div>
                {/* Toggle */}
                <button
                  onClick={() => setAnalytics(!analytics)}
                  className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors duration-200 cursor-pointer ${
                    analytics ? 'bg-[#01411C]' : 'bg-gray-300'
                  }`}
                  role="switch"
                  aria-checked={analytics}
                  aria-label="Toggle analytics cookies"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      analytics ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={rejectNonEssential}
                className="flex-1 h-10 rounded-xl border border-border text-sm font-medium
                           text-foreground hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Essential Only
              </button>
              <button
                onClick={() => saveChoice(false)}
                className="flex-1 h-10 rounded-xl bg-[#01411C] text-white text-sm font-medium
                           hover:bg-[#026b2e] transition-colors cursor-pointer
                           shadow-sm shadow-[#01411C]/20"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
