// src/routes/gamification.js
const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/authMiddleware');
const gamificationService = require('../services/gamificationService');

// Proteggiamo tutte le rotte: la gamification è personale, richiede un utente autenticato
router.use(requireAuth);

// ==========================================
// 1. VOTO E PUNTEGGIO GIORNALIERO (GET /api/gamification/daily-score)
// ==========================================
// RF11.2: "schermata o widget dedicato che mostri il voto calcolato
// sull'andamento della giornata corrente... e il punteggio numerico esatto"
router.get('/daily-score', async (req, res) => {
	try {
		const userId = req.user.id;
		const today = new Date().toISOString().slice(0, 10);

		// Ricalcoliamo al volo invece di leggere solo l'ultimo valore
		// salvato: garantisce che la risposta rifletta sempre l'ultima
		// attività registrata, anche se per qualche motivo il
		// ricalcolo "best effort" innescato da POST /api/history non
		// fosse ancora andato a buon fine (RF11.1: "real time").
		const { data, error } = await gamificationService.recalculateDailyScore(
			userId,
			today
		);

		if (error) {
			return res.status(500).json({
				error: 'Errore nel calcolo del punteggio giornaliero'
			});
		}

		return res.status(200).json({
			message: 'Punteggio giornaliero calcolato con successo',
			score: {
				date: today,
				grade: data.grade,
				normalizedScore: parseFloat(data.normalized_score),
				rawPoints: parseFloat(data.raw_points),
				totalKm: parseFloat(data.total_km),
				co2SavedKgs: parseFloat(data.co2_saved_kgs)
			}
		});
	} catch (err) {
		console.error(
			'Errore interno nel server (GET gamification/daily-score):',
			err
		);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});

// ==========================================
// 2. PUNTEGGIO SETTIMANALE PERSONALE (GET /api/gamification/weekly-score)
// ==========================================
// RF11.3: "aggregare i voti giornalieri per calcolare un punteggio
// settimanale complessivo... aggiornato realtime"
router.get('/weekly-score', async (req, res) => {
	try {
		const userId = req.user.id;
		const { data, error } =
			await gamificationService.getWeeklyScoreForUser(userId);

		if (error) {
			return res.status(500).json({
				error: 'Errore nel calcolo del punteggio settimanale'
			});
		}

		return res.status(200).json({
			message: 'Punteggio settimanale calcolato con successo',
			...data
		});
	} catch (err) {
		console.error(
			'Errore interno nel server (GET gamification/weekly-score):',
			err
		);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});

// ==========================================
// 3. CLASSIFICA SETTIMANALE (GET /api/gamification/leaderboard)
// ==========================================
// RF11.4: Podio, Top 10/20, posizione personale con utenti adiacenti,
// rispettando le preferenze di privacy.
router.get('/leaderboard', async (req, res) => {
	try {
		const userId = req.user.id;
		const requestedLimit = parseInt(req.query.limit, 10);

		// RF11.4 menziona esplicitamente "Top 10/Top 20": limitiamo le
		// scelte a queste due per restare fedeli al requisito invece di
		// accettare un valore arbitrario dal client.
		const limit = [10, 20].includes(requestedLimit) ? requestedLimit : 10;

		const { data, error } =
			await gamificationService.getCurrentWeekLeaderboard({
				limit,
				requestingUserId: userId
			});

		if (error) {
			return res.status(500).json({
				error: 'Errore nel recupero della classifica'
			});
		}

		return res.status(200).json({
			message: 'Classifica recuperata con successo',
			...data
		});
	} catch (err) {
		console.error(
			'Errore interno nel server (GET gamification/leaderboard):',
			err
		);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});

// ==========================================
// 4. STORICO PERSONALE E PROGRESSIONE (GET /api/gamification/history)
// ==========================================
// RF11.6: "storico delle performance settimanali... punteggi
// settimanali, posizioni in classifica, ricompense ottenute"
router.get('/history', async (req, res) => {
	try {
		const userId = req.user.id;
		const limit = parseInt(req.query.limit, 10) || 12;

		const { data, error } = await gamificationService.getUserWeeklyHistory(
			userId,
			{ limit }
		);

		if (error) {
			return res.status(500).json({
				error: 'Errore nel recupero dello storico delle performance'
			});
		}

		return res.status(200).json({
			message: 'Storico recuperato con successo',
			weeklyHistory: data
		});
	} catch (err) {
		console.error(
			'Errore interno nel server (GET gamification/history):',
			err
		);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});

module.exports = router;
