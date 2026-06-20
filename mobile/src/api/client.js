/**
 * Axios instance pre-configured to communicate with the EcoTrack backend.
 *
 * AUTH STRATEGY
 * The backend uses httpOnly cookies (access_token, refresh_token).
 * React Native cannot store httpOnly cookies automatically, so:
 *   1. On login/register we parse the Set-Cookie header and store the token
 *      in AsyncStorage via `saveTokensFromResponse()`.
 *   2. A request interceptor reads the stored access_token and forwards it
 *      as a Cookie header on every outgoing request.
 *   3. A response interceptor detects 401 errors, attempts a token refresh,
 *      then retries the original request once.
 *
 * BASE URL
 * Auto-detected from the Metro bundler's LAN IP (see resolveBaseUrl below) so
 * physical devices and emulators on the same network reach the dev backend
 * without manual config. Override with EXPO_PUBLIC_API_URL when needed.
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const BACKEND_PORT = 3000;

/**
 * Resolve the base URL for the backend.
 *
 * Priority:
 *   1. EXPO_PUBLIC_API_URL — explicit override (e.g. a deployed backend).
 *   2. The dev machine's LAN IP, auto-detected from the Metro bundler host.
 *      In Expo Go this is the same machine running `expo start`, so the
 *      backend (port 3000) is reachable at that IP from a physical device
 *      or emulator on the same network. This is what the .env comment promises.
 *   3. localhost — final fallback (only works on the dev machine itself,
 *      e.g. iOS simulator or Expo web).
 */
function resolveBaseUrl() {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit;

  // hostUri looks like "192.168.1.20:8081"; older SDKs expose debuggerHost.
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.expoGoConfig?.debuggerHost ??
    Constants.manifest2?.extra?.expoGo?.debuggerHost ??
    Constants.manifest?.debuggerHost;

  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:${BACKEND_PORT}/api`;

  return `http://localhost:${BACKEND_PORT}/api`;
}

export const BASE_URL = resolveBaseUrl();

if (__DEV__) {
  // Surfaces the resolved backend URL in the Metro logs so connection
  // problems are obvious at a glance.
  console.log(`[api] BASE_URL = ${BASE_URL}`);
}

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  // withCredentials is not fully supported in React Native for httpOnly cookies,
  // so we manage tokens manually in AsyncStorage.
  withCredentials: false,
});

// ─── Token helpers ────────────────────────────────────────────────────────────

/** Parse the access_token value from a Set-Cookie header string. */
function extractCookieValue(setCookieHeader, name) {
  if (!setCookieHeader) return null;
  // Set-Cookie may be a string or an array (axios flattens headers)
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : [setCookieHeader];
  for (const cookie of cookies) {
    const match = cookie.match(new RegExp(`(?:^|,\\s*)${name}=([^;,]+)`));
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

/**
 * Called immediately after login / register / refresh responses.
 * Extracts and persists access_token (and optionally refresh_token).
 */
export async function saveTokensFromResponse(response) {
  const setCookie =
    response.headers['set-cookie'] || response.headers['Set-Cookie'];
  const access = extractCookieValue(setCookie, 'access_token');
  const refresh = extractCookieValue(setCookie, 'refresh_token');
  if (access) await AsyncStorage.setItem('access_token', access);
  if (refresh) await AsyncStorage.setItem('refresh_token', refresh);
}

/** Clear stored tokens on logout. */
export async function clearTokens() {
  await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
}

// ─── Request interceptor — attach token ──────────────────────────────────────

client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers['Cookie'] = `access_token=${token}`;
  }
  return config;
});

// ─── Response interceptor — handle 401 / token refresh ───────────────────────

let isRefreshing = false;
let pendingRequests = [];

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push({ resolve, reject, config: original });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (!refreshToken) throw new Error('no refresh token');

      const refreshRes = await axios.post(`${BASE_URL}/auth/refresh`, null, {
        headers: { Cookie: `refresh_token=${refreshToken}` },
      });
      await saveTokensFromResponse(refreshRes);

      const newToken = await AsyncStorage.getItem('access_token');
      original.headers['Cookie'] = `access_token=${newToken}`;

      pendingRequests.forEach(({ resolve, config }) => {
        config.headers['Cookie'] = `access_token=${newToken}`;
        resolve(client(config));
      });
      pendingRequests = [];

      return client(original);
    } catch {
      pendingRequests.forEach(({ reject }) => reject(error));
      pendingRequests = [];
      await clearTokens();
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  }
);

export default client;
