// ============================================
// PennyWise — App Root with Routing
// ============================================

import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import Dashboard from '@/pages/Dashboard';
import OnboardingPage from '@/pages/OnboardingPage';
import AnalysisPage from '@/pages/AnalysisPage';
import TermsPage from '@/pages/TermsPage';
import PrivacyPage from '@/pages/PrivacyPage';
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

  return children;
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
  return (
    <>
      <Routes>
        {/* ── Guest routes (login / register) ── */}
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

        {/* ── Public routes (no auth required) ── */}
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />

        {/* ── Protected routes ── */}
        <Route path="/onboarding" element={<ProtectedRoute allowIncomplete><OnboardingPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/analysis" element={<ProtectedRoute><AnalysisPage /></ProtectedRoute>} />

        {/* ── Default redirect ── */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      {/* Global cookie consent — appears on all pages */}
      <CookieConsent />
    </>
  );
}

export default App;
