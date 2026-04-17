// Frontend API service - base configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Base fetch wrapper with auth token handling
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('accessToken');

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    credentials: 'include', // for httpOnly refresh token cookie
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  // Handle 401 - attempt token refresh
  if (response.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      const newToken = localStorage.getItem('accessToken');
      config.headers.Authorization = `Bearer ${newToken}`;
      return fetch(`${API_BASE_URL}${endpoint}`, config);
    }
  }

  return response;
}

/**
 * Refresh the access token using the httpOnly refresh token cookie
 */
async function refreshToken() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('accessToken', data.accessToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export const api = {
  get: (endpoint) => request(endpoint, { method: 'GET' }),
  post: (endpoint, data) => request(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: (endpoint, data) => request(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  patch: (endpoint, data) => request(endpoint, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};

export default api;
