const https = require('https');
const { supabaseAdmin } = require('../db');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';


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


async function getPushToken(userId) {
	const { data: user } = await supabaseAdmin
		.from('users')
		.select('preferences')
		.eq('id', userId)
		.single();
	return user?.preferences?.expo_push_token || null;
}


async function notifyUser(userId, title, body, data = {}) {
	const token = await getPushToken(userId);
	if (!token) return;
	await sendExpoPush(token, title, body, data);
}


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
