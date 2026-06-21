const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/authMiddleware');
const gamificationService = require('../services/gamificationService');


router.use(requireAuth);


router.get('/daily-score', async (req, res) => {
	try {
		const userId = req.user.id;
		const today = new Date().toISOString().slice(0, 10);






		const { data, error } = await gamificationService.recalculateDailyScore(
			userId,
			today
		);

		if (error) {
			console.error('[gamification] daily-score errore servizio:', error.message ?? error);
			return res.status(500).json({ error: 'Errore nel calcolo del punteggio giornaliero' });
		}
		const scoreData = data;

		return res.status(200).json({
			message: 'Punteggio giornaliero calcolato con successo',
			score: {
				date: today,
				grade: scoreData.grade,
				normalizedScore: parseFloat(scoreData.normalized_score),
				rawPoints: parseFloat(scoreData.raw_points),
				totalKm: parseFloat(scoreData.total_km),
				co2SavedKgs: parseFloat(scoreData.co2_saved_kgs)
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


router.get('/weekly-score', async (req, res) => {
	try {
		const userId = req.user.id;
		const { data, error } =
			await gamificationService.getWeeklyScoreForUser(userId);

		if (error) {
			console.error('[gamification] weekly-score errore servizio:', error.message ?? error);
			return res.status(500).json({ error: 'Errore nel calcolo del punteggio settimanale' });
		}
		const weeklyData = data;

		return res.status(200).json({
			message: 'Punteggio settimanale calcolato con successo',
			...weeklyData
		});
	} catch (err) {
		console.error(
			'Errore interno nel server (GET gamification/weekly-score):',
			err
		);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});


router.get('/leaderboard', async (req, res) => {
	try {
		const userId = req.user.id;
		const requestedLimit = parseInt(req.query.limit, 10);




		const limit = [10, 20].includes(requestedLimit) ? requestedLimit : 10;

		const { data, error } =
			await gamificationService.getCurrentWeekLeaderboard({
				limit,
				requestingUserId: userId
			});

		if (error) {
			console.error('[gamification] leaderboard errore servizio:', error.message ?? error);
			return res.status(500).json({ error: 'Errore nel recupero della classifica' });
		}
		const leaderboardData = data;

		return res.status(200).json({
			message: 'Classifica recuperata con successo',
			...leaderboardData
		});
	} catch (err) {
		console.error(
			'Errore interno nel server (GET gamification/leaderboard):',
			err
		);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});


router.get('/history', async (req, res) => {
	try {
		const userId = req.user.id;
		const limit = parseInt(req.query.limit, 10) || 12;

		const { data, error } = await gamificationService.getUserWeeklyHistory(
			userId,
			{ limit }
		);

		if (error) {
			console.error('[gamification] history errore servizio:', error.message ?? error);
			return res.status(500).json({ error: 'Errore nel recupero dello storico delle performance' });
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
