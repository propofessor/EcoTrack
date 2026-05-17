// src/middleware/authMiddleware.js
const { db } = require('../db');

/**
 * Middleware per proteggere le rotte.
 * Controlla se l'utente ha un token valido nei cookie.
 */
async function requireAuth(req, res, next) {
	try {
		// 1. Cerchiamo il token di accesso nei cookie
		const token = req.cookies.access_token;

		if (!token) {
			return res
				.status(401)
				.json({
					error: 'Accesso negato. Nessun token fornito, devi fare il login.'
				});
		}

		// 2. Chiediamo a Supabase di verificare il token e dirci a chi appartiene
		const { data, error } = await db.auth.getUser(token);

		if (error || !data.user) {
			console.error('Token non valido o scaduto:', error?.message);
			return res
				.status(401)
				.json({
					error: 'Sessione scaduta o non valida. Effettua nuovamente il login.'
				});
		}

		// 3. SEGRETO DEL SUCCESSO: Salviamo l'utente dentro l'oggetto "req"
		// In questo modo, le rotte successive sapranno esattamente chi sta facendo la richiesta!
		req.user = data.user;

		// 4. Diciamo ad Express: "Tutto ok, puoi procedere alla rotta che l'utente aveva richiesto!"
		next();
	} catch (err) {
		console.error('Errore nel middleware di auth:', err);
		res.status(500).json({ error: 'Errore interno di autenticazione' });
	}
}

module.exports = requireAuth;
