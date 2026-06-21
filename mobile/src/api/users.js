import client from './client';


export async function getProfile() {
  const res = await client.get('/users/me');
  return res.data;
}


export async function updateProfile(updates) {
  const res = await client.put('/users/me', updates);
  return res.data;
}


export async function deleteAccount() {
  const res = await client.delete('/users/me');
  return res.data;
}


export async function changePassword({ newPassword }) {
  const res = await client.put('/users/me/password', { newPassword });
  return res.data;
}
