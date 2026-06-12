// src/api/dashboardApi.js

// La API Key viene letta dalle variabili d'ambiente di Vite
// Crea un file dashboard/.env.local:  VITE_API_KEY=la-tua-chiave
const API_KEY = import.meta.env.VITE_API_KEY || "";
const BASE_URL = "/api"; // Proxato da Vite a localhost:3000

const headers = {
  "Content-Type": "application/json",
  "x-api-key": API_KEY, // RF3.4: Autenticazione via API Key nell'header
};
// RF3.2: Funzione generica con supporto parametri di query (RF3.3)
async function fetchData(endpoint, params = {}) {
  const url = new URL(BASE_URL + endpoint, window.location.origin);

  // RF3.3: Filtri temporali, paginazione, ordinamento
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

  // Supporta sia JSON che CSV (RF3.1)
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return res.json();
  return res.text();
}

// ============================================================
// ENDPOINT SPECIFICI (RF3.2 – uno per ogni dataset)
// ============================================================

// Storico viaggi con filtri opzionali
export const getHistory = (params = {}) =>
  fetchData("/export/user-data", params);
// NB: puoi creare endpoint dedicati nel backend, es. /api/dashboard/history

// Statistiche aggregate CO2
export const getCo2Stats = (params = {}) =>
  fetchData("/dashboard/co2-stats", params);

// Dati per la mappa (heatmap zone città)
export const getMapData = (params = {}) =>
  fetchData("/dashboard/map-data", params);

// Dati gamification / leaderboard anonimizzata
export const getLeaderboard = (params = {}) =>
  fetchData("/dashboard/leaderboard", params);
