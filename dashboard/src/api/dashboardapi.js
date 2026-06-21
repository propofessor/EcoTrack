import { apiFetch } from './client.js';

const API_KEY = import.meta.env.VITE_API_KEY || "";

async function fetchData(endpoint, params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      searchParams.set(key, val);
    }
  });
  const query = searchParams.toString();
  const path = `/api${endpoint}${query ? `?${query}` : ''}`;

  const res = await apiFetch(path, {
    headers: { 'x-api-key': API_KEY },
  });

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return res.json();
  return res.text();
}




export const getCo2Stats = (params = {}) =>
  fetchData("/dashboard/co2-stats", params);


export const getMapData = (params = {}) =>
  fetchData("/dashboard/map-data", params);


export const getLeaderboard = (params = {}) =>
  fetchData("/dashboard/leaderboard", params);
