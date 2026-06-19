import client from "./client";

/**
 * POST /api/maps/calculate-co2
 * Calculates CO2 emissions for an origin→destination trip across all transport modes.
 *
 * @param {{ walking: number, bicycling: number, transit: number, driving: number }} distances
 *   Distance in km for each mode (obtained from Google Maps Directions API on the client).
 * @returns {{ emissions: object, driving_movement_type_id: string }}
 */
export async function calculateCo2({ distances }) {
  const res = await client.post("/maps/calculate-co2", { distances });
  return res.data;
}
