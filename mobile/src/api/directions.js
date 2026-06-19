/**
 * directions.js — RF9.2
 * Mock directions service (no paid Google Maps API key required).
 * Returns realistic distances and travel times for 4 transport modes
 * based on a representative urban distance for Trento.
 *
 * Speeds used: walking 5 km/h, cycling 15 km/h, transit 25 km/h, driving 40 km/h.
 * When a real Directions API key is available, replace this function body
 * with actual HTTP calls and return the same shape.
 */

const BASE_DIST_KM = 3.2; // representative Trento urban trip distance

const MODE_SPEEDS_KMH = {
  walking: 5,
  bicycling: 15,
  transit: 25,
  driving: 40,
};

const MODE_FACTORS = {
  walking: 1.0,
  bicycling: 1.1,
  transit: 1.4,
  driving: 1.2,
};

/**
 * @param {string} origin      User-typed origin text (used for display only in mock)
 * @param {string} destination User-typed destination text (used for display only in mock)
 * @returns {{ walking, bicycling, transit, driving }} Each entry: { distanceKm, durationMin }
 */
export function getMockDirections(origin, destination) {
  const result = {};
  for (const mode of ['walking', 'bicycling', 'transit', 'driving']) {
    const distanceKm = parseFloat((BASE_DIST_KM * MODE_FACTORS[mode]).toFixed(1));
    const durationMin = Math.round((distanceKm / MODE_SPEEDS_KMH[mode]) * 60);
    result[mode] = { distanceKm, durationMin };
  }
  return result;
}
