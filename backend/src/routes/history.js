const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db');
const requireAuth = require('../middleware/authMiddleware');
const { calculateRawPoints } = require('../services/scoreEngine');
const { recalculateDailyScore } = require('../services/gamificationService');
const { canonicalMovementLabel } = require('../utils/movementLabels');


router.use(requireAuth);


router.get('/', async (req, res) => {
	try {
		const userId = req.user.id;


		const { data, error } = await supabaseAdmin
			.from('history')
			.select(
				`
                id,
                timestamp_start,
                timestamp_end,
                co2_kgs,
                points,
                movement_types (
                    id,
                    label
                )
            `
			)
			.eq('user_id', userId)
			.order('timestamp_start', { ascending: false });

		if (error) {
			console.error('[history] errore query storico:', error.message);
			return res.status(500).json({
				error: 'Impossibile recuperare lo storico dei viaggi'
			});
		}



		const history = (data || []).map(entry =>
			entry?.movement_types
				? { ...entry, movement_types: { ...entry.movement_types, label: canonicalMovementLabel(entry.movement_types.label) } }
				: entry
		);



		return res.status(200).json({
			message: 'Storico recuperato con successo',
			history
		});
	} catch (err) {
		console.error('Errore interno nel server (GET history):', err);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});


router.post('/', async (req, res) => {
	try {
		const userId = req.user.id;
		const {
			timestamp_start,
			timestamp_end,
			movement_type_id,
			co2_kgs,
			points
		} = req.body;


		if (
			!timestamp_start ||
			!timestamp_end ||
			!movement_type_id ||
			co2_kgs === undefined ||
			points === undefined
		) {
			return res.status(400).json({
				error: 'Tutti i campi sono obbligatori: timestamp_start, timestamp_end, movement_type_id, co2_kgs, points'
			});
		}


		const { data, error } = await supabaseAdmin
			.from('history')
			.insert([
				{
					user_id: userId,
					timestamp_start,
					timestamp_end,
					movement_type_id,
					co2_kgs,
					points
				}
			])
			.select();

		if (error) {
			console.error(
				"Errore durante l'inserimento del viaggio su Supabase:",
				error.message
			);
			return res.status(500).json({
				error: 'Impossibile salvare il viaggio nello storico'
			});
		}
















		if (typeof timestamp_start === 'string' && timestamp_start.length >= 10) {
			const scoreDate = timestamp_start.slice(0, 10);
			recalculateDailyScore(userId, scoreDate).catch((scoreErr) => {
				console.error(
					'Errore nel ricalcolo del punteggio giornaliero (RF11) dopo il salvataggio del viaggio:',
					scoreErr
				);
			});
		}

		return res.status(201).json({
			message: 'Viaggio salvato nello storico con successo',
			entry: data[0]
		});
	} catch (err) {
		console.error('Errore interno nel server (POST history):', err);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});

module.exports = router;
