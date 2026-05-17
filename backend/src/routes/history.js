// src/routes/history.js
const express = require('express');
const router = express.Router();
const { db } = require('../db'); // <--- IMPORTANTE: Destrutturato come { db } per coordinarsi con il middleware!
const requireAuth = require('../middleware/authMiddleware');

// Proteggiamo tutte le rotte: solo gli utenti autenticati possono accedere al proprio storico
router.use(requireAuth);

// ==========================================
// 1. RECUPERA LO STORICO VIAGGI (GET /api/history)
// ==========================================
router.get('/', async (req, res) => {
	try {
		const userId = req.user.id; // Estratto in modo sicuro dal token JWT del middleware

		// Eseguiamo la query su Supabase ordinando per la data di inizio decrescente
		const { data, error } = await db
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
			console.error(
				'Errore nel recupero dello storico da Supabase:',
				error.message
			);
			return res
				.status(400)
				.json({
					error: 'Impossibile recuperare lo storico dei viaggi'
				});
		}

		return res.status(200).json({
			message: 'Storico recuperato con successo',
			history: data
		});
	} catch (err) {
		console.error('Errore interno nel server (GET history):', err);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});

// ==========================================
// 2. SALVA UN NUOVO VIAGGIO (POST /api/history)
// ==========================================
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

		// Validazione dei campi obbligatori richiesti dai vincoli NOT NULL dello schema
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

		// Inseriamo il record nel database associandolo forzatamente all'utente loggato
		const { data, error } = await db
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
			.select(); // Chiediamo a Supabase di restituire il record appena inserito

		if (error) {
			console.error(
				"Errore durante l'inserimento del viaggio su Supabase:",
				error.message
			);
			return res
				.status(400)
				.json({
					error: 'Impossibile salvare il viaggio nello storico'
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
