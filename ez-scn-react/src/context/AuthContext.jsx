// ============================================
// PennyWise — Auth Context
// Global authentication state management
// ============================================

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as authService from '@/services/authService';
import { setApiToken } from '@/services/api';

const AuthContext = createContext(null);

// Token auto-refresh interval: 14 minutes (token expires at 15)
const REFRESH_INTERVAL_MS = 14 * 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef(null);

  // ──────────────────────────────────────────
  // Start auto-refresh timer
  // ──────────────────────────────────────────
  const startRefreshTimer = useCallback(() => {
    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }

    refreshTimerRef.current = setInterval(async () => {
      const result = await authService.refreshToken();
      if (result.success) {
        setAccessToken(result.accessToken);
      } else {
        // Refresh failed — session expired
        setUser(null);
        setAccessToken(null);
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    }, REFRESH_INTERVAL_MS);
  }, []);

  const stopRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  // ──────────────────────────────────────────
  // On mount: try to restore session via refresh cookie
  // ──────────────────────────────────────────
  useEffect(() => {
    async function restoreSession() {
      try {
        const result = await authService.refreshToken();
        if (result.success) {
          setAccessToken(result.accessToken);
          setApiToken(result.accessToken);

          // Decode user info from JWT payload (base64)
          const payload = JSON.parse(atob(result.accessToken.split('.')[1]));
          setUser({ id: payload.id, email: payload.email });
          startRefreshTimer();
        }
      } catch {
        // No valid session — stay logged out
      } finally {
        setLoading(false);
      }
    }

    restoreSession();

    return () => stopRefreshTimer();
  }, [startRefreshTimer, stopRefreshTimer]);

  // ──────────────────────────────────────────
  // Login
  // ──────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const result = await authService.login(email, password);

    if (result.success) {
      setUser(result.user);
      setAccessToken(result.accessToken);
      setApiToken(result.accessToken);
      startRefreshTimer();
    }

    return result;
  }, [startRefreshTimer]);

  // ──────────────────────────────────────────
  // Register
  // ──────────────────────────────────────────
  const register = useCallback(async (data) => {
    const result = await authService.register(data);

    if (result.success) {
      setUser(result.user);
      setAccessToken(result.accessToken);
      setApiToken(result.accessToken);
      startRefreshTimer();
    }

    return result;
  }, [startRefreshTimer]);

  // ──────────────────────────────────────────
  // Logout
  // ──────────────────────────────────────────
  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setAccessToken(null);
    setApiToken(null);
    stopRefreshTimer();
  }, [stopRefreshTimer]);

  // ──────────────────────────────────────────
  // Update User State
  // ──────────────────────────────────────────
  const updateUser = useCallback((updates) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  // ──────────────────────────────────────────
  // Context value
  // ──────────────────────────────────────────
  const value = {
    user,
    accessToken,
    loading,
    isAuthenticated: !!user && !!accessToken,
    login,
    register,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
