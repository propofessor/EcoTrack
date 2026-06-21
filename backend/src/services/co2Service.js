const EMISSION_FACTORS = {



	bus: 40,
	car_average: 110
};

async function getCarEmissionFactor(plate) {
	if (!plate) {
		return EMISSION_FACTORS.car_average;
	}

	try {
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


async function calculateEmissions(distances, userPlate) {
	const carEmissionFactor = await getCarEmissionFactor(userPlate);

	return {
		emissions: {
			piedi: 0,
			bicicletta: 0,
			autobus: distances.autobus
				? Math.round(distances.autobus * EMISSION_FACTORS.bus)
				: null,
			macchina: distances.macchina
				? Math.round(distances.macchina * carEmissionFactor)
				: null
		},
		note: userPlate
			? `Calcolo auto basato sui dati reali della targa ${userPlate}`
			: 'Calcolo auto basato sulla media nazionale (nessuna targa fornita)'
	};
}

module.exports = { calculateEmissions, EMISSION_FACTORS };
