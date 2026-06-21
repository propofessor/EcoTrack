const BASELINE_CAR_EMISSION_FACTOR_G_PER_KM = 110;


const NORMALIZED_SCORE_CAP = 100;


function calculateRawPoints(movementLabel, distanceKm, actualCo2Grams) {
	if (!distanceKm || distanceKm <= 0) return 0;

	const baselineEmission = distanceKm * BASELINE_CAR_EMISSION_FACTOR_G_PER_KM;
	const co2Saved = baselineEmission - (actualCo2Grams || 0);



	return Math.max(0, Math.round(co2Saved));
}


function normalizeScore(totalRawPoints, totalKm) {
	if (!totalKm || totalKm <= 0) return 0;

	const savedPerKm = totalRawPoints / totalKm;
	const normalized =
		(savedPerKm / BASELINE_CAR_EMISSION_FACTOR_G_PER_KM) * 100;
	return Math.min(NORMALIZED_SCORE_CAP, Math.round(normalized * 10) / 10);
}


function calculateGrade(normalizedScore) {
	if (normalizedScore >= 80) return 'S';
	if (normalizedScore >= 60) return 'A';
	if (normalizedScore >= 40) return 'B';
	if (normalizedScore >= 20) return 'C';
	return 'E';
}


function computeDailyScore(dayMovements) {
	let totalRawPoints = 0;
	let totalKm = 0;

	for (const movement of dayMovements) {
		totalRawPoints += calculateRawPoints(
			movement.movementLabel,
			movement.distanceKm,
			movement.co2Grams
		);
		totalKm += movement.distanceKm || 0;
	}

	const normalizedScore = normalizeScore(totalRawPoints, totalKm);
	const grade = calculateGrade(normalizedScore);

	return {
		rawPoints: totalRawPoints,
		normalizedScore,
		grade,
		totalKm: Math.round(totalKm * 100) / 100,
		co2SavedKgs: Math.round((totalRawPoints / 1000) * 1000) / 1000
	};
}

module.exports = {
	calculateRawPoints,
	normalizeScore,
	calculateGrade,
	computeDailyScore,
	BASELINE_CAR_EMISSION_FACTOR_G_PER_KM
};
