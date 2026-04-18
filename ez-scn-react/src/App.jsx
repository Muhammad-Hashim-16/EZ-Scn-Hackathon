// ============================================
// PennyWise — App Root with Routing
// ============================================

import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { configureApi } from '@/services/api';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import OnboardingPage from '@/pages/OnboardingPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import AnalysisPage from '@/pages/AnalysisPage';
import GoalsPage from '@/pages/GoalsPage';
import WeeklyTrackerPage from '@/pages/WeeklyTrackerPage';
import SettingsPage from '@/pages/SettingsPage';
import TermsPage from '@/pages/TermsPage';
import PrivacyPage from '@/pages/PrivacyPage';
import AppLayout from '@/components/layout/AppLayout';
import CookieConsent from '@/components/CookieConsent';
import { Loader2 } from 'lucide-react';

// ── Protected Route wrapper ──
function ProtectedRoute({ children, allowIncomplete }) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#01411C]" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to onboarding if profile not complete (unless already there)
  if (!allowIncomplete && user && user.profile_complete === false && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return children || <Outlet />;
}

// ── Guest Route wrapper (redirect if already logged in) ──
function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-[#01411C]" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  const toast = useToast();
  const { logout } = useAuth();

  // Wire toast + logout into the API interceptor (once)
  useEffect(() => {
    configureApi({ toast, logout });
  }, [toast, logout]);

  return (
    <>
      <ErrorBoundary>
        <Routes>
          {/* ── Guest routes (login / register) ── */}
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

          {/* ── Public routes (no auth required) ── */}
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />

          {/* ── Onboarding (protected, no layout, allow incomplete profile) ── */}
          <Route path="/onboarding" element={<ProtectedRoute allowIncomplete><OnboardingPage /></ProtectedRoute>} />

          {/* ── Protected routes inside AppLayout (sidebar / bottom nav) ── */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
            <Route path="/analysis" element={<ErrorBoundary><AnalysisPage /></ErrorBoundary>} />
            <Route path="/goals" element={<ErrorBoundary><GoalsPage /></ErrorBoundary>} />
            <Route path="/weekly" element={<ErrorBoundary><WeeklyTrackerPage /></ErrorBoundary>} />
            <Route path="/settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
          </Route>

          {/* ── Default redirect ── */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ErrorBoundary>

      {/* Global cookie consent — appears on all pages */}
      <CookieConsent />
    </>
  );
}

export default App;
