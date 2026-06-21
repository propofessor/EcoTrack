const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db');
const requireAuth = require('../middleware/authMiddleware');
const { PASSWORD_REGEX, PASSWORD_ERROR_MESSAGE } = require('../utils/validation');


const PLATE_REGEX = /^[A-Z]{2}\d{3}[A-Z]{2}$/i;


router.use(requireAuth);


router.get('/me', (req, res) => {


	return res.status(200).json({
		user: req.user,

		profile: req.user.user_metadata
	});
});


router.put('/me', async (req, res) => {
	try {

		const { name, plate, preferences } = req.body;
		const userId = req.user.id;


		const updates = {};
		if (name !== undefined) updates.name = name;
		if (plate !== undefined) {

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


router.put('/me/push-token', async (req, res) => {
	try {
		const { expo_push_token } = req.body;
		const userId = req.user.id;

		if (!expo_push_token) {
			return res.status(400).json({ error: 'expo_push_token è obbligatorio' });
		}


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


router.delete('/me', async (req, res) => {
	try {
		const userId = req.user.id;


		const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

		if (error) {
			return res
				.status(400)
				.json({
					error: "Errore durante la cancellazione dell'account"
				});
		}


		res.clearCookie('access_token');
		res.clearCookie('refresh_token');
		res.clearCookie('cie_state');

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
