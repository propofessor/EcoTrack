import client, { saveTokensFromResponse, clearTokens, BASE_URL } from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Register a new user with email + password + name (plate optional).
 *  Returns { message, email_verification_required? } from the backend.
 *  If email_verification_required is true, session cookies are NOT set
 *  and the user must confirm their email before logging in.
 */
export async function register({ email, password, name, plate }) {
  const res = await client.post('/auth/register', {
    email,
    password,
    name,
    plate: plate || undefined,
  });
  // Only save tokens when a full session was returned (email confirmation OFF)
  if (!res.data?.email_verification_required) {
    await saveTokensFromResponse(res);
  }
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

/** RF5.2: Get the Supabase Google OAuth URL for the mobile WebBrowser flow. */
export async function getGoogleMobileUrl() {
  const res = await client.get('/auth/google/mobile-url');
  return res.data; // { url }
}

/** RF5.2: Get the Supabase Google OAuth URL for the web full-page redirect flow. */
export async function getGoogleWebUrl() {
  const res = await client.get('/auth/google/web-url');
  return res.data; // { url }
}

/** RF5.2: Exchange the OAuth code returned by Supabase for a session. Stores tokens. */
export async function googleMobileCallback({ code }) {
  const res = await client.get('/auth/google/mobile-callback', { params: { code } });
  if (res.data.access_token) {
    await AsyncStorage.setItem('access_token', res.data.access_token);
  }
  if (res.data.refresh_token) {
    await AsyncStorage.setItem('refresh_token', res.data.refresh_token);
  }
  return res.data;
}

/**
 * RF5.2/6.2: Initiate CIE OAuth — returns the authorization URL from the backend.
 * The mobile app opens this URL in a WebBrowser and captures the redirect.
 */
export async function getCieAuthUrl() {
  const res = await client.get('/auth/cie/mobile-url');
  return res.data;
}

/**
 * RF5.2/6.2: Complete CIE login — send the authorization code and state back
 * to the backend callback, which returns tokens as JSON.
 */
export async function cieCallback({ code, state }) {
  const res = await client.get('/auth/cie/mobile-callback', {
    params: { code, state },
  });
  if (res.data.access_token) {
    await AsyncStorage.setItem('access_token', res.data.access_token);
  }
  if (res.data.refresh_token) {
    await AsyncStorage.setItem('refresh_token', res.data.refresh_token);
  }
  return res.data;
}

/** Returns true if a stored access token exists (may still be expired). */
export async function hasStoredToken() {
  const token = await AsyncStorage.getItem('access_token');
  return !!token;
}

/** RF6.5: Resend the email-verification link for an unconfirmed account. */
export async function resendVerification({ email }) {
  const res = await client.post('/auth/resend-verification', { email });
  return res.data;
}

/** RF5.5: Request a password-reset email for the given address. */
export async function forgotPassword({ email }) {
  const res = await client.post('/auth/forgot-password', { email });
  return res.data;
}

/** RF5.5: Complete password reset using the OTP token from the recovery email. */
export async function resetPassword({ token_hash, newPassword }) {
  const res = await client.post('/auth/reset-password', { token_hash, newPassword });
  return res.data;
}
