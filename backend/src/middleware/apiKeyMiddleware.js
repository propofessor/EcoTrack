// backend/src/middleware/apiKeyMiddleware.js

function checkApiKey(req, res, next) {
	// Recuperiamo la chiave inviata dal client nell'header HTTP
	const apiKey = req.header('x-api-key');

	// Recuperiamo la chiave reale memorizzata nel file .env
	const validApiKey = process.env.ECOTRACK_API_KEY;

	// Controllo di sicurezza: se la chiave non è configurata nel .env, blocchiamo tutto per precauzione
	if (!validApiKey) {
		return res.status(500).json({
			error: 'Errore interno del server. Configurazione API Key mancante lato server.'
		});
	}

	// Se il client non ha inviato nessuna chiave, accesso negato
	if (!apiKey) {
		return res.status(401).json({
			error: 'Accesso negato. API Key mancante.'
		});
	}

	// Confronto tra la chiave ricevuta e quella nel file .env
	if (apiKey !== validApiKey) {
		return res.status(403).json({
			error: 'Accesso vietato. API Key non valida.'
		});
	}

	// Se le chiavi coincidono, prosegui
	next();
}

module.exports = checkApiKey;
