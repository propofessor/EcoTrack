// backend/src/routes/export.js
const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db');
const requireAuth = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/user-data', async (req, res) => {
	try {
		const userId = req.user.id;

		// 1. Recupero history dell'utente
		const { data: userHistory, error: historyError } = await supabaseAdmin
			.from('history')
			.select('id, timestamp_start, timestamp_end, co2_kgs, points')
			.eq('user_id', userId)
			.order('timestamp_start', { ascending: false });

		// Un errore reale sullo storico deve emergere come 500: un export GDPR
		// con dati fittizi sarebbe scorretto.
		if (historyError) {
			console.error('[export] errore query storico:', historyError.message);
			return res.status(500).json({ error: 'Errore nel recupero dei dati storici' });
		}
		const historyList = userHistory || [];

		// 2. Recupero codici promozionali dell'utente (Risolto il blocco duplicato)
		const { data: promoCodes, error: promoError } = await supabaseAdmin
			.from('promotional_codes')
			.select('id, code')
			.eq('user_id', userId);

		// I premi sono dati secondari: se la query fallisce, degradiamo a lista
		// vuota (loggando) invece di inventare codici fittizi nell'export.
		if (promoError) {
			console.warn('[export] errore query codici promozionali, restituisco lista vuota:', promoError.message);
		}
		const rewardsList = promoCodes || [];

		// Calcolo aggregato sicuro delle statistiche
		const totalCo2 = historyList.reduce((acc, curr) => {
			const val = curr && curr.co2_kgs ? parseFloat(curr.co2_kgs) : 0;
			return acc + (isNaN(val) ? 0 : val);
		}, 0);

		const totalPoints = historyList.reduce((acc, curr) => {
			const val = curr && curr.points ? parseInt(curr.points, 10) : 0;
			return acc + (isNaN(val) ? 0 : val);
		}, 0);

		return res.status(200).json({
			success: true,
			exportTimestamp: new Date().toISOString(),
			user: {
				id: userId,
				name: req.user.user_metadata?.name || 'Utente EcoTrack'
			},
			stats: {
				totalTrips: historyList.length,
				totalCo2SavedOrEmitted: totalCo2,
				totalPointsEarned: totalPoints
			},
			history: historyList,
			rewards: rewardsList
		});
	} catch (err) {
		console.error("Errore server durante l'esportazione dei dati:", err);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});

module.exports = router;
