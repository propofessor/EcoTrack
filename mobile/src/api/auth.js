import client, { saveTokensFromResponse, clearTokens, BASE_URL } from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';


export async function register({ email, password, name, plate }) {
  const res = await client.post('/auth/register', {
    email,
    password,
    name,
    plate: plate || undefined,
  });

  if (!res.data?.email_verification_required) {
    await saveTokensFromResponse(res);
  }
  return res.data;
}


export async function login({ email, password }) {
  const res = await client.post('/auth/login', { email, password });
  await saveTokensFromResponse(res);
  return res.data;
}


export async function logout() {
  try {
    await client.post('/auth/logout');
  } finally {
    await clearTokens();
  }
}


export async function getMe() {
  const res = await client.get('/auth/me');
  return res.data;
}


export async function getGoogleMobileUrl() {
  const res = await client.get('/auth/google/mobile-url');
  return res.data;
}


export async function getGoogleWebUrl() {
  const res = await client.get('/auth/google/web-url');
  return res.data;
}


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


export async function getCieAuthUrl() {
  const res = await client.get('/auth/cie/mobile-url');
  return res.data;
}


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


export async function hasStoredToken() {
  const token = await AsyncStorage.getItem('access_token');
  return !!token;
}


export async function resendVerification({ email }) {
  const res = await client.post('/auth/resend-verification', { email });
  return res.data;
}


export async function forgotPassword({ email }) {
  const res = await client.post('/auth/forgot-password', { email });
  return res.data;
}


export async function resetPassword({ token_hash, newPassword }) {
  const res = await client.post('/auth/reset-password', { token_hash, newPassword });
  return res.data;
}
