import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';
const baseURL = API_URL ? `${API_URL}/api` : '/api';

// The httpOnly refresh cookie (path /api/auth) must ride along on login,
// refresh and logout. In production the app and /api share one origin
// (nginx), where the browser sends it automatically. Only local dev (Vite on
// :5173 → API on :4000) is cross-origin and needs withCredentials — keeping it
// off elsewhere means cross-origin clients (e.g. the mobile app) still work
// with the plain "*" CORS policy.
const withCredentials = import.meta.env.DEV;

const api = axios.create({ baseURL, withCredentials });

// Refresh calls go through a bare instance so they never hit the 401 retry
// interceptor below (no loops).
const authClient = axios.create({ baseURL, withCredentials });

/** Fired when the session can't be renewed; AuthContext logs the user out. */
export const SESSION_EXPIRED_EVENT = 'auth:session-expired';

let refreshInFlight: Promise<string | null> | null = null;

/**
 * Swap the refresh cookie for a new access token. Concurrent callers share
 * one request. Resolves to null when there is no valid session.
 */
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = authClient
      .post('/auth/refresh')
      .then((res) => {
        const token: string = res.data.token;
        localStorage.setItem('token', token);
        return token;
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Access tokens last 15 minutes. On a 401, renew once and replay the request;
// if renewal fails, the session is over.
const NO_RETRY = ['/auth/login', '/auth/refresh', '/auth/logout'];

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    if (
      error.response?.status !== 401 ||
      !original ||
      original._retried ||
      NO_RETRY.some((p) => original.url?.includes(p))
    ) {
      return Promise.reject(error);
    }
    original._retried = true;
    const token = await refreshAccessToken();
    if (!token) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      return Promise.reject(error);
    }
    original.headers.Authorization = `Bearer ${token}`;
    return api(original);
  },
);

/** Tell the server to end this browser's session (best effort). */
export function serverLogout(): Promise<void> {
  return authClient.post('/auth/logout').then(
    () => undefined,
    () => undefined,
  );
}

export default api;
