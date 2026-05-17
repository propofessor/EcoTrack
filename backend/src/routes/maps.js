// src/routes/maps.js
const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db'); // Usiamo l'importazione destrutturata coerente
const requireAuth = require('../middleware/authMiddleware');
const { calculateEmissions } = require('../services/co2Service');

router.use(requireAuth);

// ==========================================
// CALCOLA EMISSIONI PERCORSO (POST /api/maps/calculate-co2)
// ==========================================
router.post('/calculate-co2', async (req, res) => {
	try {
		const { distances } = req.body;

		if (!distances) {
			return res
				.status(400)
				.json({ error: 'Fornisci le distanze per il calcolo' });
		}

		const userPlate = req.user.user_metadata?.plate;
		const results = await calculateEmissions(distances, userPlate);
		// [NOVITÀ RF10]: Recuperiamo dinamicamente l'UUID del mezzo 'driving' dal database
		const { data: movementType, error: dbError } = await supabaseAdmin
			.from('movement_types')
			.select('id')
			.eq('label', 'driving')
			.single(); // Chiediamo un singolo record

		let drivingId = null;
		if (!dbError && movementType) {
			drivingId = movementType.id;
		} else {
			console.warn(
				"Attenzione: Impossibile trovare l'ID per 'driving' nella tabella movement_types. Verrà usato un fallback."
			);
		}

		// Rispondiamo inserendo sia i calcoli che l'ID del mezzo per lo storico
		return res.status(200).json({
			message: 'Calcolo delle emissioni completato con successo',
			emissions: results.emissions,
			// Passiamo l'id reale al frontend così lo user flow non fallisce!
			driving_movement_type_id: drivingId
		});
	} catch (err) {
		console.error('Errore nel calcolo delle emissioni:', err);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});

module.exports = router;
