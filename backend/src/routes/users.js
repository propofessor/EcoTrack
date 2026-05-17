// src/routes/users.js
const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db');
const requireAuth = require('../middleware/authMiddleware');

// Applichiamo il nostro "buttafuori" a TUTTE le rotte di questo file.
// Nessuno potrà passare di qui senza un token valido!
router.use(requireAuth);

// ==========================================
// 1. LEGGI IL PROFILO (GET /api/users/me)
// ==========================================
router.get('/me', (req, res) => {
	// Grazie al middleware, req.user contiene già tutti i dati!
	// Dobbiamo solo restituirli al client.
	return res.status(200).json({
		user: req.user,
		// Estraiamo per comodità i metadata (dove avevamo salvato nome e targa nel login)
		profile: req.user.user_metadata
	});
});

// ==========================================
// 2. AGGIORNA IL PROFILO E LA TARGA (PUT /api/users/me)
// ==========================================
router.put('/me', async (req, res) => {
	try {
		// Prendiamo i nuovi dati che l'app ci sta inviando
		const { name, plate, preferences } = req.body;
		const userId = req.user.id; // Sappiamo chi è grazie al middleware!

		// Prepariamo l'oggetto con i dati da aggiornare
		const updates = {};
		if (name !== undefined) updates.name = name;
		if (plate !== undefined) updates.plate = plate;
		if (preferences !== undefined) updates.preferences = preferences;

		// Usiamo il client Admin per aggiornare in modo sicuro i metadata di questo specifico utente
		const { data: updatedUser, error } =
			await supabaseAdmin.auth.admin.updateUserById(userId, {
				user_metadata: updates
			});

		if (error) {
			return res
				.status(400)
				.json({ error: 'Impossibile aggiornare il profilo' });
		}

		return res.status(200).json({
			message: 'Profilo aggiornato con successo',
			user: updatedUser.user
		});
	} catch (err) {
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});

// ==========================================
// 3. ELIMINA L'ACCOUNT (DELETE /api/users/me)
// ==========================================
router.delete('/me', async (req, res) => {
	try {
		const userId = req.user.id;

		// Eliminiamo definitivamente l'utente da Supabase per rispettare il GDPR
		const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

		if (error) {
			return res
				.status(400)
				.json({
					error: "Errore durante la cancellazione dell'account"
				});
		}

		// Puliamo i cookie per fare il logout automatico dopo la cancellazione
		res.clearCookie('access_token');
		res.clearCookie('refresh_token');
		res.clearCookie('cie_state'); // Puliamo anche quelli della CIE per sicurezza

		return res
			.status(200)
			.json({
				message: 'Account eliminato definitivamente e dati cancellati.'
			});
	} catch (err) {
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});

module.exports = router;
