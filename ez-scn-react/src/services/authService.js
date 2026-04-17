// ============================================
// PennyWise — Auth Service
// All authentication API calls
// ============================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * POST /api/auth/register
 */
export async function register({ full_name, email, password }) {
  try {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ full_name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error || 'Registration failed.',
        errors: data.errors || [],
        code: data.code,
      };
    }

    return { success: true, accessToken: data.accessToken, user: data.user };
  } catch (err) {
    return { success: false, error: 'Network error. Please check your connection.', code: 'NETWORK_ERROR' };
  }
}

/**
 * POST /api/auth/login
 */
export async function login(email, password) {
  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error || 'Login failed.',
        errors: data.errors || [],
        code: data.code,
      };
    }

    return { success: true, accessToken: data.accessToken, user: data.user };
  } catch (err) {
    return { success: false, error: 'Network error. Please check your connection.', code: 'NETWORK_ERROR' };
  }
}

/**
 * POST /api/auth/logout
 */
export async function logout() {
  try {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Logout failed.' };
  }
}

/**
 * POST /api/auth/refresh
 */
export async function refreshToken() {
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.error, code: data.code };
    }

    return { success: true, accessToken: data.accessToken };
  } catch (err) {
    return { success: false, error: 'Token refresh failed.', code: 'NETWORK_ERROR' };
  }
}
