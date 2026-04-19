// ============================================
// PennyWise — API Service (Hardened)
//
// Global Axios-style fetch wrapper with:
// ✅ Auto-attaches Authorization: Bearer {token}
// ✅ On 401: calls refreshToken(), retries once
// ✅ On second 401: redirects to /login
// ✅ On network error: shows toast notification
// ✅ Consistent error shape for all consumers
// ============================================

const isProd = import.meta.env.PROD;

// Hardcoding the exact API URL to override Vercel variable bugs
const API_BASE = (isProd 
  ? 'https://postgres-production-9e3f.up.railway.app' 
  : 'http://localhost:5000') + '/api';

// ── Token storage (in-memory, synced with AuthContext) ──
let _accessToken = null;
let _toastFn = null;       // injected by provider
let _logoutFn = null;      // injected by provider

/**
 * Called by AuthContext when token changes
 */
export function setApiToken(token) {
  _accessToken = token;
}

/**
 * Called once by the root provider to wire in toast + logout
 */
export function configureApi({ toast, logout }) {
  _toastFn = toast;
  _logoutFn = logout;
}

// ── Core request function ──
async function request(endpoint, options = {}, _isRetry = false) {
  const url = `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (_accessToken) {
    headers.Authorization = `Bearer ${_accessToken}`;
  }

  const config = {
    ...options,
    headers,
    credentials: 'include',
  };

  // Remove Content-Type for FormData (let browser set boundary)
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  let response;

  try {
    response = await fetch(url, config);
  } catch (err) {
    // Network error (offline, DNS failure, CORS blocked)
    const networkError = new Error('Network error. Check your connection.');
    networkError.status = 0;
    networkError.isNetworkError = true;

    if (_toastFn) _toastFn.error('Network error. Check your connection.');

    throw networkError;
  }

  // ── Handle 401 (Unauthorized) ──
  if (response.status === 401 && !_isRetry) {
    // Attempt silent token refresh
    const refreshed = await attemptRefresh();
    if (refreshed) {
      // Retry the original request once with the new token
      return request(endpoint, options, true);
    }

    // Refresh failed — force logout
    if (_toastFn) _toastFn.warning('Session expired. Please log in again.');
    if (_logoutFn) _logoutFn();
    window.location.href = '/login';

    const authError = new Error('Session expired');
    authError.status = 401;
    throw authError;
  }

  // ── Handle second 401 (retry also failed) ──
  if (response.status === 401 && _isRetry) {
    if (_logoutFn) _logoutFn();
    window.location.href = '/login';

    const authError = new Error('Session expired');
    authError.status = 401;
    throw authError;
  }

  // ── Parse response ──
  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  // ── Handle non-OK responses ──
  if (!response.ok) {
    const apiError = new Error(
      data?.error || data?.message || `Request failed (${response.status})`
    );
    apiError.status = response.status;
    apiError.data = data;
    throw apiError;
  }

  return data;
}

// ── Token refresh ──
async function attemptRefresh() {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!res.ok) return false;

    const data = await res.json();
    if (data.success && data.accessToken) {
      _accessToken = data.accessToken;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ── Convenience methods ──
export const api = {
  get: (endpoint) => request(endpoint, { method: 'GET' }),

  post: (endpoint, body) =>
    request(endpoint, {
      method: 'POST',
      body: body != null ? JSON.stringify(body) : undefined,
    }),

  put: (endpoint, body) =>
    request(endpoint, {
      method: 'PUT',
      body: body != null ? JSON.stringify(body) : undefined,
    }),

  patch: (endpoint, body) =>
    request(endpoint, {
      method: 'PATCH',
      body: body != null ? JSON.stringify(body) : undefined,
    }),

  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};

// ── SWR Fetcher ──
export const fetcher = (endpoint) => api.get(endpoint);

export default api;
