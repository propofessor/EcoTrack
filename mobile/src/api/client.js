import { Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: Platform.OS === 'web', // browser manages httpOnly cookies automatically
});

// ─── Token helpers ────────────────────────────────────────────────────────────

function extractCookieValue(setCookieHeader, name) {
  if (!setCookieHeader) return null;
  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  for (const cookie of cookies) {
    const match = cookie.match(new RegExp(`(?:^|,\\s*)${name}=([^;,]+)`));
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

export async function saveTokensFromResponse(response) {
  if (Platform.OS === 'web') return; // browser stores httpOnly cookies automatically
  const setCookie = response.headers['set-cookie'] || response.headers['Set-Cookie'];
  const access = extractCookieValue(setCookie, 'access_token');
  const refresh = extractCookieValue(setCookie, 'refresh_token');
  if (access) await AsyncStorage.setItem('access_token', access);
  if (refresh) await AsyncStorage.setItem('refresh_token', refresh);
}

export async function clearTokens() {
  await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
}

// ─── Request interceptor ─────────────────────────────────────────────────────

client.interceptors.request.use(async (config) => {
  if (Platform.OS === 'web') return config; // browser sends cookies via withCredentials
  const token = await AsyncStorage.getItem('access_token');
  if (token) config.headers['Cookie'] = `access_token=${token}`;
  return config;
});

// ─── Response interceptor — 401 / token refresh ──────────────────────────────

let isRefreshing = false;
let pendingRequests = [];

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    original._retry = true;

    if (Platform.OS === 'web') {
      // Browser sends the refresh_token cookie automatically with withCredentials
      try {
        await axios.post(`${BASE_URL}/auth/refresh`, null, { withCredentials: true });
        return client(original);
      } catch {
        return Promise.reject(error);
      }
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push({ resolve, reject, config: original });
      });
    }
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
