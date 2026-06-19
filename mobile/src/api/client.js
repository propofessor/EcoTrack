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
 * Android emulator maps 10.0.2.2 to the host machine's localhost.
 * Change to your actual server IP/hostname for real devices.
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// EXPO_PUBLIC_API_URL overrides the default.
// With `adb reverse tcp:3000 tcp:3000`, localhost works on physical devices too.
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

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
