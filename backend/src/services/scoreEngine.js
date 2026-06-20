// src/services/scoreEngine.js
//
// ScoreEngine richiesto da User Story 11 (RF11): trasforma la CO2
// risparmiata in punti, normalizza per equità tra utenti con diversi
// livelli di attività (RF11.1), e calcola il voto giornaliero su scala
// S-E (RF11.2).
//
// Tenuto deliberatamente senza dipendenze da Express o da Supabase:
// stesso stile di co2Service.js, così resta testabile in isolamento e
// riusabile sia dalla rotta REST sia da un eventuale job futuro.

// Fattore di emissione "baseline" usato come termine di paragone per il
// risparmio di CO2: la stessa distanza percorsa interamente in auto con
// il fattore medio nazionale (coerente con EMISSION_FACTORS.car_average
// già definito in co2Service.js).
const BASELINE_CAR_EMISSION_FACTOR_G_PER_KM = 110;

// Normalizzazione: il punteggio normalizzato esprime QUANTO la giornata si è
// avvicinata al comportamento ideale (zero emissioni) rispetto al peggiore
// possibile (tutto in auto al fattore baseline). È la frazione di CO2
// risparmiata per km rispetto al massimo risparmiabile — che è il baseline
// stesso (110 g/km) — riportata su scala 0-100.
//
//   risparmioPerKm = totalRawPoints / totalKm        // 0 .. 110 g/km
//   normalizzato   = risparmioPerKm / baseline * 100  // 0 .. 100
//
// Dividere per i km totali garantisce equità tra utenti con diversi livelli di
// attività (RF11.1): chi fa 1km a piedi e chi fa 20km in bici sono entrambi al
// 100% virtuosi e ottengono lo stesso punteggio. Esempi: giornata interamente
// green → 100 (voto S); interamente in auto → 0 (voto E); metà e metà → ~50 (B).
const NORMALIZED_SCORE_CAP = 100;

/**
 * Calcola i punti grezzi (CO2 risparmiata in grammi rispetto al baseline
 * "tutto in auto") per un singolo movimento.
 *
 * @param {string} movementLabel - es. 'piedi', 'bicicletta', 'autobus', 'macchina'
 * @param {number} distanceKm
 * @param {number} actualCo2Grams - CO2 effettivamente emessa per questo movimento (da co2Service)
 * @returns {number} grammi di CO2 risparmiati (può essere 0 per 'macchina')
 */
function calculateRawPoints(movementLabel, distanceKm, actualCo2Grams) {
	if (!distanceKm || distanceKm <= 0) return 0;

	const baselineEmission = distanceKm * BASELINE_CAR_EMISSION_FACTOR_G_PER_KM;
	const co2Saved = baselineEmission - (actualCo2Grams || 0);

	// Non penalizziamo: un movimento 'macchina' con fattore reale peggiore
	// della media nazionale non deve generare punti negativi, semplicemente 0.
	return Math.max(0, Math.round(co2Saved));
}

/**
 * Normalizza il punteggio grezzo giornaliero come frazione del risparmio di
 * CO2 per km rispetto al massimo risparmiabile (il baseline auto), su scala
 * 0-100 (RF11.1: "normalizzare per garantire equità tra utenti con diversi
 * livelli di attività").
 *
 * @param {number} totalRawPoints - somma di calculateRawPoints su tutti i movimenti del giorno
 * @param {number} totalKm - somma delle distanze percorse nel giorno
 * @returns {number} punteggio normalizzato, 0-100 (100 = giornata interamente green)
 */
function normalizeScore(totalRawPoints, totalKm) {
	if (!totalKm || totalKm <= 0) return 0;

	const savedPerKm = totalRawPoints / totalKm; // 0 .. 110 g/km
	const normalized =
		(savedPerKm / BASELINE_CAR_EMISSION_FACTOR_G_PER_KM) * 100; // 0 .. 100
	return Math.min(NORMALIZED_SCORE_CAP, Math.round(normalized * 10) / 10);
}

/**
 * Assegna il voto alfabetico S-E in base al punteggio normalizzato
 * (RF11.2: "scala S-E, dove S è il voto massimo ed E è il voto minimo").
 *
 * Soglie scelte sui percentili dello 0-100 normalizzato:
 *   S: comportamento quasi interamente a basso impatto
 *   A/B/C: fasce intermedie
 *   E: nessun comportamento sostenibile registrato (es. solo 'macchina', o nessun movimento)
 *
 * @param {number} normalizedScore - 0-100
 * @returns {'S'|'A'|'B'|'C'|'E'}
 */
function calculateGrade(normalizedScore) {
	if (normalizedScore >= 80) return 'S';
	if (normalizedScore >= 60) return 'A';
	if (normalizedScore >= 40) return 'B';
	if (normalizedScore >= 20) return 'C';
	return 'E';
}

/**
 * Funzione di alto livello che orchestra il calcolo completo per una
 * giornata, a partire dalla lista di movimenti registrati. Pensata per
 * essere chiamata sia incrementalmente (un movimento alla volta, RF11.1
 * "calcolo deve avvenire real time per ogni attività") sia in batch
 * (ricalcolo completo della giornata, usato dalle rotte di gamification).
 *
 * @param {Array<{movementLabel: string, distanceKm: number, co2Grams: number}>} dayMovements
 * @returns {{rawPoints: number, normalizedScore: number, grade: string, totalKm: number, co2SavedKgs: number}}
 */
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
