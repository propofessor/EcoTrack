import { Platform } from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const BACKEND_PORT = 3000;


function resolveBaseUrl() {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit;


  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.expoGoConfig?.debuggerHost ??
    Constants.manifest2?.extra?.expoGo?.debuggerHost ??
    Constants.manifest?.debuggerHost;

  const host = hostUri?.split(":")[0];
  if (host) return `http://${host}:${BACKEND_PORT}/api`;

  return `http://localhost:${BACKEND_PORT}/api`;
}

export const BASE_URL = resolveBaseUrl();

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
  withCredentials: Platform.OS === "web",
  adapter: "xhr",
});



function extractCookieValue(setCookieHeader, name) {
  if (!setCookieHeader) return null;
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : [setCookieHeader];
  for (const cookie of cookies) {
    const match = cookie.match(new RegExp(`(?:^|,\\s*)${name}=([^;,]+)`));
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

export async function saveTokensFromResponse(response) {
  if (Platform.OS === "web") return;
  const setCookie =
    response.headers["set-cookie"] || response.headers["Set-Cookie"];
  const access = extractCookieValue(setCookie, "access_token");
  const refresh = extractCookieValue(setCookie, "refresh_token");
  if (access) await AsyncStorage.setItem("access_token", access);
  if (refresh) await AsyncStorage.setItem("refresh_token", refresh);
}

export async function clearTokens() {
  await AsyncStorage.multiRemove(["access_token", "refresh_token"]);
}



client.interceptors.request.use(async (config) => {
  if (Platform.OS === "web") return config;
  const token = await AsyncStorage.getItem("access_token");
  if (token) config.headers["Cookie"] = `access_token=${token}`;
  return config;
});



let isRefreshing = false;
let pendingRequests = [];

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || !original || original._retry) {
      return Promise.reject(error);
    }
    original._retry = true;

    if (Platform.OS === "web") {

      try {
        await axios.post(`${BASE_URL}/auth/refresh`, null, {
          withCredentials: true,
        });
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
      const refreshToken = await AsyncStorage.getItem("refresh_token");
      if (!refreshToken) throw new Error("no refresh token");
      const refreshRes = await axios.post(`${BASE_URL}/auth/refresh`, null, {
        headers: { Cookie: `refresh_token=${refreshToken}` },
      });
      await saveTokensFromResponse(refreshRes);
      const newToken = await AsyncStorage.getItem("access_token");
      original.headers["Cookie"] = `access_token=${newToken}`;
      pendingRequests.forEach(({ resolve, config }) => {
        config.headers["Cookie"] = `access_token=${newToken}`;
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
  },
);

export default client;
