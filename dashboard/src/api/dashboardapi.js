const API_KEY = import.meta.env.VITE_API_KEY || "";
const BASE_URL = "/api";

const headers = {
  "Content-Type": "application/json",
  "x-api-key": API_KEY,
};

async function fetchData(endpoint, params = {}) {
  const url = new URL(BASE_URL + endpoint, window.location.origin);


  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      url.searchParams.set(key, val);
    }
  });

  const res = await fetch(url.toString(), { headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Errore HTTP ${res.status}`);
  }


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
