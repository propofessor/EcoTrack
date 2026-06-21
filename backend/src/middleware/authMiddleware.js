const { db } = require('../db');


async function requireAuth(req, res, next) {
	try {

		const token = req.cookies.access_token;

		if (!token) {
			return res
				.status(401)
				.json({
					error: 'Accesso negato. Nessun token fornito, devi fare il login.'
				});
		}


		const { data, error } = await db.auth.getUser(token);

		if (error || !data.user) {
			console.error('Token non valido o scaduto:', error?.message);
			return res
				.status(401)
				.json({
					error: 'Sessione scaduta o non valida. Effettua nuovamente il login.'
				});
		}



		req.user = data.user;


		next();
	} catch (err) {
		console.error('Errore nel middleware di auth:', err);
		res.status(500).json({ error: 'Errore interno di autenticazione' });
	}
}

module.exports = requireAuth;
