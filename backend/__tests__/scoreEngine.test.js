// __tests__/scoreEngine.test.js
const {
	calculateRawPoints,
	normalizeScore,
	calculateGrade,
	computeDailyScore
} = require('../src/services/scoreEngine');

describe('ScoreEngine (RF11.1, RF11.2)', () => {
	// ==========================================
	// calculateRawPoints
	// ==========================================
	describe('calculateRawPoints', () => {
		it('Dovrebbe restituire punti positivi per un movimento a zero emissioni (es. bicycling)', () => {
			const punti = calculateRawPoints('bicycling', 10, 0);
			// baseline: 10km * 110 g/km = 1100g risparmiati rispetto all'auto
			expect(punti).toBe(1100);
		});

		it('Dovrebbe restituire 0 se la distanza è 0 o assente', () => {
			expect(calculateRawPoints('walking', 0, 0)).toBe(0);
			expect(calculateRawPoints('walking', undefined, 0)).toBe(0);
		});

		it("Dovrebbe restituire 0 (non negativo) se l'emissione reale supera il baseline", () => {
			// es. un mezzo con fattore di emissione peggiore della media nazionale
			const punti = calculateRawPoints('driving', 10, 2000);
			expect(punti).toBe(0);
		});

		it('Dovrebbe calcolare punti parziali per un movimento a emissione intermedia (es. transit)', () => {
			// 5km, baseline 550g, emissione reale 520g (bus, fattore 104g/km)
			const punti = calculateRawPoints('transit', 5, 520);
			expect(punti).toBe(30);
		});
	});

	// ==========================================
	// normalizeScore
	// ==========================================
	describe('normalizeScore', () => {
		it('Dovrebbe normalizzare correttamente in base ai km totali', () => {
			// 1100 punti grezzi su 10km → 1100/10/8 = 13.75 → round a 13.8
			const score = normalizeScore(1100, 10);
			expect(score).toBe(13.8);
		});

		it('Dovrebbe restituire 0 se i km totali sono 0', () => {
			expect(normalizeScore(1000, 0)).toBe(0);
		});

		it('Non dovrebbe mai superare il cap di 100', () => {
			const score = normalizeScore(999999, 0.001);
			expect(score).toBeLessThanOrEqual(100);
		});

		it('Dovrebbe garantire equità tra utenti con diversi livelli di attività (RF11.1)', () => {
			// Utente A: 1km a piedi (comportamento 100% virtuoso, poca attività)
			// Utente B: 20km in bici (comportamento 100% virtuoso, molta attività)
			// Entrambi dovrebbero ottenere un punteggio normalizzato comparabile,
			// perché entrambi hanno 0 emissioni reali rispetto al baseline.
			const puntiA = calculateRawPoints('walking', 1, 0);
			const scoreA = normalizeScore(puntiA, 1);

			const puntiB = calculateRawPoints('bicycling', 20, 0);
			const scoreB = normalizeScore(puntiB, 20);

			expect(scoreA).toBe(scoreB);
		});
	});

	// ==========================================
	// calculateGrade
	// ==========================================
	describe('calculateGrade', () => {
		it.each([
			[100, 'S'],
			[80, 'S'],
			[79.9, 'A'],
			[60, 'A'],
			[59.9, 'B'],
			[40, 'B'],
			[39.9, 'C'],
			[20, 'C'],
			[19.9, 'E'],
			[0, 'E']
		])(
			'Punteggio normalizzato %f dovrebbe dare voto %s',
			(score, expectedGrade) => {
				expect(calculateGrade(score)).toBe(expectedGrade);
			}
		);
	});

	// ==========================================
	// computeDailyScore (orchestrazione completa)
	// ==========================================
	describe('computeDailyScore', () => {
		it('Dovrebbe calcolare correttamente il punteggio aggregato di una giornata con più movimenti', () => {
			const movimenti = [
				{ movementLabel: 'walking', distanceKm: 1.2, co2Grams: 0 },
				{ movementLabel: 'bicycling', distanceKm: 3.5, co2Grams: 0 },
				{ movementLabel: 'transit', distanceKm: 8.0, co2Grams: 832 }
			];

			const risultato = computeDailyScore(movimenti);

			expect(risultato.totalKm).toBeCloseTo(12.7, 1);
			expect(risultato.rawPoints).toBeGreaterThan(0);
			expect(['S', 'A', 'B', 'C', 'E']).toContain(risultato.grade);
			expect(risultato.co2SavedKgs).toBeGreaterThanOrEqual(0);
		});

		it('Dovrebbe restituire voto E e punteggio 0 per una giornata senza movimenti', () => {
			const risultato = computeDailyScore([]);

			expect(risultato.rawPoints).toBe(0);
			expect(risultato.normalizedScore).toBe(0);
			expect(risultato.grade).toBe('E');
			expect(risultato.totalKm).toBe(0);
		});

		it('Dovrebbe restituire voto E per una giornata interamente in auto (nessun risparmio CO2)', () => {
			const movimenti = [
				{ movementLabel: 'driving', distanceKm: 15, co2Grams: 1650 }
			];

			const risultato = computeDailyScore(movimenti);

			expect(risultato.rawPoints).toBe(0);
			expect(risultato.grade).toBe('E');
		});
	});
});
