// src/routes/maps.js
const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db'); // Usiamo l'importazione destrutturata coerente
const requireAuth = require('../middleware/authMiddleware');
const { calculateEmissions } = require('../services/co2Service');
const { MOCK_DRIVING_MOVEMENT_TYPE_ID } = require('../mocks/mockData');

router.use(requireAuth);

// ==========================================
// HEATMAP DATI INQUINAMENTO (GET /api/maps/heatmap?type=air|noise)
// RF8.2/8.3: restituisce array di { latitude, longitude, weight } per Leaflet.heat
// Mock seeded: coordinate reali del centro di Trento con pesi simulati.
// ==========================================

// Punti base attorno al centro di Trento (lat, lng)
const TRENTO_BASE_POINTS = [
	[46.0748, 11.1217], // Piazza Duomo
	[46.0702, 11.1196], // Stazione FS
	[46.067, 11.1234], // Via Roma
	[46.076, 11.128], // Piazza Venezia
	[46.08, 11.115], // Lungadige
	[46.064, 11.13], // Quartiere Cristo
	[46.082, 11.133], // Viale Verona
	[46.073, 11.11], // Bondone direction
	[46.069, 11.126], // Piazza Mostra
	[46.0775, 11.1195], // Trento nord
	[46.065, 11.117], // Trento sud
	[46.071, 11.134], // Piazza S. Maria
	[46.079, 11.127], // Via Brennero
	[46.066, 11.112], // Via Verdi
	[46.084, 11.12] // Gardolo
];

// Pesi predefiniti per inquinamento aria (0-1, 1=alta concentrazione)
const AIR_WEIGHTS = [
	0.9, 0.8, 0.5, 0.6, 0.3, 0.4, 0.7, 0.2, 0.5, 0.6, 0.4, 0.5, 0.8, 0.3, 0.6
];
// Pesi predefiniti per inquinamento acustico
const NOISE_WEIGHTS = [
	0.8, 0.9, 0.6, 0.5, 0.3, 0.4, 0.6, 0.2, 0.7, 0.5, 0.4, 0.5, 0.7, 0.3, 0.5
];

router.get('/heatmap', async (req, res) => {
	try {
		const type = req.query.type || 'air';
		if (type !== 'air' && type !== 'noise') {
			return res
				.status(400)
				.json({
					error: "Il parametro 'type' deve essere 'air' o 'noise'"
				});
		}

		const weights = type === 'air' ? AIR_WEIGHTS : NOISE_WEIGHTS;
		const points = TRENTO_BASE_POINTS.map(([lat, lng], i) => ({
			latitude: lat,
			longitude: lng,
			weight: weights[i]
		}));

		return res.status(200).json({ points });
	} catch (err) {
		console.error('Errore nel recupero dei dati heatmap:', err);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});

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
		// [NOVITÀ RF10]: Recuperiamo dinamicamente l'UUID del mezzo 'macchina' dal database
		const { data: movementType, error: dbError } = await supabaseAdmin
			.from('movement_types')
			.select('id')
			.eq('label', 'Macchina') // etichetta canonica italiana (vedi utils/movementLabels)
			.single(); // Chiediamo un singolo record

		let drivingId = MOCK_DRIVING_MOVEMENT_TYPE_ID;
		if (!dbError && movementType) {
			drivingId = movementType.id;
		} else {
			console.warn(
				"[maps] Impossibile trovare l'ID per 'macchina' da DB, uso il mock UUID come fallback."
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
