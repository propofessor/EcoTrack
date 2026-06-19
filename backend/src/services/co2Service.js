// src/services/co2Service.js
const EMISSION_FACTORS = {
	bus: 104,
	car_average: 110
};

async function getCarEmissionFactor(plate) {
	if (!plate) {
		return EMISSION_FACTORS.car_average;
	}

	try {
		console.log(`Ricerca dati online per la targa: ${plate}...`);

		if (plate.toUpperCase().startsWith('E')) return 0;
		if (plate.toUpperCase().startsWith('A')) return 140;

		return 120;
	} catch (error) {
		console.error(
			'Errore durante il recupero dei dati online per la targa:',
			error.message
		);
		return EMISSION_FACTORS.car_average;
	}
}

/**
 * Calcola le emissioni per tutti i mezzi, date le loro distanze in km.
 * @returns {{ emissions: { walking: number, bicycling: number, transit: number|null, driving: number|null }, note: string }}
 */
async function calculateEmissions(distances, userPlate) {
	const carEmissionFactor = await getCarEmissionFactor(userPlate);

	return {
		emissions: {
			walking: 0,
			bicycling: 0,
			transit: distances.transit
				? Math.round(distances.transit * EMISSION_FACTORS.bus)
				: null,
			driving: distances.driving
				? Math.round(distances.driving * carEmissionFactor)
				: null
		},
		note: userPlate
			? `Calcolo auto basato sui dati reali della targa ${userPlate}`
			: 'Calcolo auto basato sulla media nazionale (nessuna targa fornita)'
	};
}

module.exports = { calculateEmissions };
