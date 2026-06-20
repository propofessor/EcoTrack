// src/routes/history.js
const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db'); // <--- IMPORTANTE: Destrutturato come { db } per coordinarsi con il middleware!
const requireAuth = require('../middleware/authMiddleware');
const { calculateRawPoints } = require('../services/scoreEngine');
const { recalculateDailyScore } = require('../services/gamificationService');
const { canonicalMovementLabel } = require('../utils/movementLabels');

// Proteggiamo tutte le rotte: solo gli utenti autenticati possono accedere al proprio storico
router.use(requireAuth);

// ==========================================
// 1. RECUPERA LO STORICO VIAGGI (GET /api/history)
// ==========================================
router.get('/', async (req, res) => {
	try {
		const userId = req.user.id; // Estratto in modo sicuro dal token JWT del middleware

		// Eseguiamo la query su Supabase ordinando per la data di inizio decrescente
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

		// Normalizziamo l'etichetta del mezzo verso la forma canonica italiana
		// (es. 'driving' → 'Macchina') prima di restituirla al client.
		const history = (data || []).map(entry =>
			entry?.movement_types
				? { ...entry, movement_types: { ...entry.movement_types, label: canonicalMovementLabel(entry.movement_types.label) } }
				: entry
		);

		// Un risultato vuoto è legittimo per un utente senza viaggi: restituiamo
		// una lista vuota, NON dati mock (sarebbero viaggi fittizi per un utente reale).
		return res.status(200).json({
			message: 'Storico recuperato con successo',
			history
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
			.select(); // Chiediamo a Supabase di restituire il record appena inserito

		if (error) {
			console.error(
				"Errore durante l'inserimento del viaggio su Supabase:",
				error.message
			);
			return res.status(500).json({
				error: 'Impossibile salvare il viaggio nello storico'
			});
		}

		// [RF11 - Gamification] Ricalcoliamo il punteggio giornaliero
		// dell'utente in real-time, come richiesto da RF11.1 ("Il calcolo
		// deve avvenire real time per ogni attività dell'utente").
		//
		// IMPORTANTE: questo NON sovrascrive il campo `points` salvato
		// sopra in `history` (che resta quello del payload, per non
		// rompere il contratto esistente di questa rotta). Il punteggio
		// "autorevole" per voto/classifica vive separatamente in
		// `daily_scores`, popolato da scoreEngine a partire dai dati
		// reali in `history`, non dal valore che il client invia.
		//
		// Eseguito in modo "best effort": un fallimento qui non deve
		// impedire il salvataggio del viaggio già avvenuto con successo,
		// quindi logghiamo ma non propaghiamo un errore HTTP al client
		// per questo passo accessorio.
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
