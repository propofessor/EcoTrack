import client from './client';

/** GET /api/users/me — full profile including user_metadata. */
export async function getProfile() {
  const res = await client.get('/users/me');
  return res.data; // { user, profile }
}

/**
 * PUT /api/users/me — update name, plate, or preferences.
 * @param {{ name?: string, plate?: string, preferences?: object }} updates
 */
export async function updateProfile(updates) {
  const res = await client.put('/users/me', updates);
  return res.data;
}

/** DELETE /api/users/me — permanently delete the user account. */
export async function deleteAccount() {
  const res = await client.delete('/users/me');
  return res.data;
}

/** PUT /api/users/me/password — RF7.2: change password. */
export async function changePassword({ newPassword }) {
  const res = await client.put('/users/me/password', { newPassword });
  return res.data;
}
