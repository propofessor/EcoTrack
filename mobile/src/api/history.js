import client from './client';


export async function getHistory() {
  const res = await client.get('/history');
  return res.data;
}


export async function saveTrip(trip) {
  const res = await client.post('/history', trip);
  return res.data;
}
