const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db');
const requireAuth = require('../middleware/authMiddleware');
const { calculateEmissions } = require('../services/co2Service');
const { MOCK_DRIVING_MOVEMENT_TYPE_ID } = require('../mocks/mockData');

router.use(requireAuth);




const TRENTO_BASE_POINTS = [
	[46.0748, 11.1217],
	[46.0702, 11.1196],
	[46.067, 11.1234],
	[46.076, 11.128],
	[46.08, 11.115],
	[46.064, 11.13],
	[46.082, 11.133],
	[46.073, 11.11],
	[46.069, 11.126],
	[46.0775, 11.1195],
	[46.065, 11.117],
	[46.071, 11.134],
	[46.079, 11.127],
	[46.066, 11.112],
	[46.084, 11.12]
];


const AIR_WEIGHTS = [
	0.9, 0.8, 0.5, 0.6, 0.3, 0.4, 0.7, 0.2, 0.5, 0.6, 0.4, 0.5, 0.8, 0.3, 0.6
];

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

		const { data: movementType, error: dbError } = await supabaseAdmin
			.from('movement_types')
			.select('id')
			.eq('label', 'Macchina')
			.single();

		let drivingId = MOCK_DRIVING_MOVEMENT_TYPE_ID;
		if (!dbError && movementType) {
			drivingId = movementType.id;
		} else {
			console.warn(
				"[maps] Impossibile trovare l'ID per 'macchina' da DB, uso il mock UUID come fallback."
			);
		}


		return res.status(200).json({
			message: 'Calcolo delle emissioni completato con successo',
			emissions: results.emissions,

			driving_movement_type_id: drivingId
		});
	} catch (err) {
		console.error('Errore nel calcolo delle emissioni:', err);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});

module.exports = router;
