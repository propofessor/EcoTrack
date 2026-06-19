// services/notificationService.js
// RF11.2 / RF11.7: send Expo push notifications to mobile users.
// Uses the Expo Push API (https://exp.host/--/api/v2/push/send).
// No SDK required — plain HTTP POST.
const https = require('https');
const { supabaseAdmin } = require('../db');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send a push notification to a single Expo push token.
 * @param {string} to   - Expo push token (ExponentPushToken[...])
 * @param {string} title
 * @param {string} body
 * @param {object} [data] - extra payload
 */
async function sendExpoPush(to, title, body, data = {}) {
	const payload = JSON.stringify([{ to, title, body, data, sound: 'default' }]);

	return new Promise((resolve) => {
		const req = https.request(
			EXPO_PUSH_URL,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Content-Length': Buffer.byteLength(payload)
				}
			},
			(res) => {
				let raw = '';
				res.on('data', (chunk) => (raw += chunk));
				res.on('end', () => resolve(JSON.parse(raw)));
			}
		);
		req.on('error', (err) => {
			console.warn('Expo push error:', err.message);
			resolve(null);
		});
		req.write(payload);
		req.end();
	});
}

/**
 * Retrieve the Expo push token stored in preferences for a given userId.
 * Returns null if not found.
 */
async function getPushToken(userId) {
	const { data: user } = await supabaseAdmin
		.from('users')
		.select('preferences')
		.eq('id', userId)
		.single();
	return user?.preferences?.expo_push_token || null;
}

/**
 * Send a push notification to a single user (RF11.2: daily grade notification).
 * Silently ignores users without a stored token.
 */
async function notifyUser(userId, title, body, data = {}) {
	const token = await getPushToken(userId);
	if (!token) return;
	await sendExpoPush(token, title, body, data);
}

/**
 * Send push notifications to multiple users (RF11.7: weekly leaderboard results).
 * @param {string[]} userIds
 * @param {Function} messageFactory - receives userId, returns { title, body }
 */
async function notifyMany(userIds, messageFactory) {
	if (!userIds || userIds.length === 0) return;

	const { data: users } = await supabaseAdmin
		.from('users')
		.select('id, preferences')
		.in('id', userIds);

	const messages = (users || [])
		.filter((u) => u.preferences?.expo_push_token)
		.map((u) => {
			const { title, body } = messageFactory(u.id);
			return { to: u.preferences.expo_push_token, title, body, sound: 'default' };
		});

	if (messages.length === 0) return;

	const payload = JSON.stringify(messages);
	return new Promise((resolve) => {
		const req = https.request(
			EXPO_PUSH_URL,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Content-Length': Buffer.byteLength(payload)
				}
			},
			(res) => {
				let raw = '';
				res.on('data', (chunk) => (raw += chunk));
				res.on('end', () => resolve(JSON.parse(raw)));
			}
		);
		req.on('error', (err) => {
			console.warn('Expo push batch error:', err.message);
			resolve(null);
		});
		req.write(payload);
		req.end();
	});
}

module.exports = { notifyUser, notifyMany };
