/**
 * directions.js — RF9.2
 * Mock directions service (no paid Google Maps API key required).
 * Returns realistic distances and travel times for 4 transport modes
 * based on a representative urban distance for Trento.
 *
 * Speeds used: piedi 5 km/h, cycling 15 km/h, autobus 25 km/h, macchina 40 km/h.
 * When a real Directions API key is available, replace this function body
 * with actual HTTP calls and return the same shape.
 */

const BASE_DIST_KM = 3.2; // representative Trento urban trip distance

const MODE_SPEEDS_KMH = {
  piedi: 5,
  bicicletta: 15,
  autobus: 25,
  macchina: 40,
};

const MODE_FACTORS = {
  piedi: 1.0,
  bicicletta: 1.1,
  autobus: 1.4,
  macchina: 1.2,
};

/**
 * @param {string} origin      User-typed origin text (used for display only in mock)
 * @param {string} destination User-typed destination text (used for display only in mock)
 * @returns {{ piedi, bicicletta, autobus, macchina }} Each entry: { distanceKm, durationMin }
 */
export function getMockDirections(origin, destination) {
  const result = {};
  for (const mode of ["piedi", "bicicletta", "autobus", "macchina"]) {
    const distanceKm = parseFloat(
      (BASE_DIST_KM * MODE_FACTORS[mode]).toFixed(1),
    );
    const durationMin = Math.round((distanceKm / MODE_SPEEDS_KMH[mode]) * 60);
    result[mode] = { distanceKm, durationMin };
  }
  return result;
}
