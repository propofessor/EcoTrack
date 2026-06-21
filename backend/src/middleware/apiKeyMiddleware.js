const { supabaseAdmin } = require('../db');

const cache = new Map();
const CACHE_TTL_MS = 60 * 1000;

async function checkApiKey(req, res, next) {
	const apiKey = req.header('x-api-key');
	if (!apiKey) return res.status(401).json({ error: 'API Key mancante.' });


	const cached = cache.get(apiKey);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
		if (!cached.valid)
			return res.status(403).json({ error: 'API Key non valida.' });
		return next();
	}

	try {
		const { data, error } = await supabaseAdmin
			.from('api_keys')
			.select('id, is_active')
			.eq('key', apiKey)
			.single();

		const valid = !error && data && data.is_active;


		cache.set(apiKey, { valid, timestamp: Date.now() });

		if (!valid)
			return res
				.status(403)
				.json({ error: 'API Key non valida o disabilitata.' });


		if (data) {
			supabaseAdmin
				.from('api_keys')
				.update({ last_used_at: new Date().toISOString() })
				.eq('id', data.id)
				.then(() => {})
				.catch(() => {});
		}

		next();
	} catch (err) {
		console.error('Errore middleware API Key:', err);
		return res.status(500).json({ error: 'Errore interno del server.' });
	}
}

module.exports = checkApiKey;
