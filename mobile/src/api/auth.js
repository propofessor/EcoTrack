import client, { saveTokensFromResponse, clearTokens, BASE_URL } from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Register a new user with email + password + name (plate optional). */
export async function register({ email, password, name, plate }) {
  const res = await client.post('/auth/register', {
    email,
    password,
    name,
    plate: plate || undefined,
  });
  await saveTokensFromResponse(res);
  return res.data;
}

/** Login with email + password. */
export async function login({ email, password }) {
  const res = await client.post('/auth/login', { email, password });
  await saveTokensFromResponse(res);
  return res.data;
}

/** Logout — clears tokens on device and signals the backend. */
export async function logout() {
  try {
    await client.post('/auth/logout');
  } finally {
    await clearTokens();
  }
}

/** Fetch the authenticated user's profile. */
export async function getMe() {
  const res = await client.get('/auth/me');
  return res.data;
}

/** Returns the Google OAuth initiation URL (user opens in a WebView or browser). */
export function getGoogleAuthUrl() {
  return `${BASE_URL}/auth/google`;
}

/** Returns true if a stored access token exists (may still be expired). */
export async function hasStoredToken() {
  const token = await AsyncStorage.getItem('access_token');
  return !!token;
}
