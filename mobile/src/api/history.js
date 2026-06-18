import client from './client';

/** GET /api/history — retrieve the user's trip history. */
export async function getHistory() {
  const res = await client.get('/history');
  return res.data; // { history: [...] }
}

/**
 * POST /api/history — save a completed trip.
 * @param {{ timestamp_start, timestamp_end, movement_type_id, co2_kgs, points }} trip
 */
export async function saveTrip(trip) {
  const res = await client.post('/history', trip);
  return res.data; // { entry: { id, ... } }
}
