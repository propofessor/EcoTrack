// src/routes/users.js
const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db');
const requireAuth = require('../middleware/authMiddleware');
const { PASSWORD_REGEX, PASSWORD_ERROR_MESSAGE } = require('../utils/validation');

// RF7.4: Italian plate format AA000AA (2 letters, 3 digits, 2 letters)
const PLATE_REGEX = /^[A-Z]{2}\d{3}[A-Z]{2}$/i;

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
		if (plate !== undefined) {
			// RF7.4: valida il formato targa (stringa vuota = rimozione targa, ok)
			if (plate !== '' && !PLATE_REGEX.test(plate)) {
				return res.status(400).json({
					error: 'Formato targa non valido. Usa il formato italiano (es. AB123CD)'
				});
			}
			updates.plate = plate;
		}
		if (preferences !== undefined) updates.preferences = preferences;

		if (Object.keys(updates).length === 0) {
			return res.status(400).json({ error: 'Nessun campo da aggiornare' });
		}

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
// 2b. AGGIORNA PASSWORD (PUT /api/users/me/password) — RF7.2
// ==========================================
router.put('/me/password', async (req, res) => {
	try {
		const { newPassword } = req.body;
		const userId = req.user.id;

		if (!newPassword) {
			return res.status(400).json({ error: 'newPassword è obbligatoria' });
		}
		if (!PASSWORD_REGEX.test(newPassword)) {
			return res.status(400).json({
				error: PASSWORD_ERROR_MESSAGE
			});
		}

		const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
			password: newPassword
		});

		if (error) {
			return res.status(400).json({ error: 'Impossibile aggiornare la password' });
		}

		return res.status(200).json({ message: 'Password aggiornata con successo' });
	} catch (err) {
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});

// ==========================================
// 2c. SALVA EXPO PUSH TOKEN (PUT /api/users/me/push-token) — RF11.7
// ==========================================
router.put('/me/push-token', async (req, res) => {
	try {
		const { expo_push_token } = req.body;
		const userId = req.user.id;

		if (!expo_push_token) {
			return res.status(400).json({ error: 'expo_push_token è obbligatorio' });
		}

		// Merge the push token into the existing preferences JSONB column
		const { data: currentUser } = await supabaseAdmin
			.from('users')
			.select('preferences')
			.eq('id', userId)
			.single();

		const updatedPreferences = {
			...(currentUser?.preferences || {}),
			expo_push_token
		};

		const { error } = await supabaseAdmin
			.from('users')
			.update({ preferences: updatedPreferences })
			.eq('id', userId);

		if (error) {
			return res.status(400).json({ error: 'Impossibile salvare il push token' });
		}

		return res.status(200).json({ message: 'Push token salvato' });
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
