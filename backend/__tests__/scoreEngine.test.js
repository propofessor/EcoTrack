const {
	calculateRawPoints,
	normalizeScore,
	calculateGrade,
	computeDailyScore
} = require('../src/services/scoreEngine');

describe('ScoreEngine (RF11.1, RF11.2)', () => {



	describe('calculateRawPoints', () => {
		it('Dovrebbe restituire punti positivi per un movimento a zero emissioni (es. bicicletta)', () => {
			const punti = calculateRawPoints('bicicletta', 10, 0);

			expect(punti).toBe(1100);
		});

		it('Dovrebbe restituire 0 se la distanza è 0 o assente', () => {
			expect(calculateRawPoints('piedi', 0, 0)).toBe(0);
			expect(calculateRawPoints('piedi', undefined, 0)).toBe(0);
		});

		it("Dovrebbe restituire 0 (non negativo) se l'emissione reale supera il baseline", () => {

			const punti = calculateRawPoints('macchina', 10, 2000);
			expect(punti).toBe(0);
		});

		it('Dovrebbe calcolare punti parziali per un movimento a emissione intermedia', () => {

			const punti = calculateRawPoints('autobus', 5, 520);
			expect(punti).toBe(30);
		});
	});




	describe('normalizeScore', () => {
		it('Dovrebbe dare 100 per una giornata interamente green (risparmio massimo)', () => {

			const score = normalizeScore(1100, 10);
			expect(score).toBe(100);
		});

		it('Dovrebbe dare ~50 quando si risparmia metà del massimo per km', () => {

			expect(normalizeScore(550, 10)).toBe(50);
		});

		it('Dovrebbe restituire 0 se i km totali sono 0', () => {
			expect(normalizeScore(1000, 0)).toBe(0);
		});

		it('Non dovrebbe mai superare il cap di 100', () => {
			const score = normalizeScore(999999, 0.001);
			expect(score).toBeLessThanOrEqual(100);
		});

		it('Dovrebbe garantire equità tra utenti con diversi livelli di attività (RF11.1)', () => {




			const puntiA = calculateRawPoints('piedi', 1, 0);
			const scoreA = normalizeScore(puntiA, 1);

			const puntiB = calculateRawPoints('bicicletta', 20, 0);
			const scoreB = normalizeScore(puntiB, 20);

			expect(scoreA).toBe(scoreB);
		});
	});




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




	describe('computeDailyScore', () => {
		it('Dovrebbe calcolare correttamente il punteggio aggregato di una giornata con più movimenti', () => {
			const movimenti = [
				{ movementLabel: 'piedi', distanceKm: 1.2, co2Grams: 0 },
				{ movementLabel: 'bicicletta', distanceKm: 3.5, co2Grams: 0 },
				{ movementLabel: 'autobus', distanceKm: 8.0, co2Grams: 832 }
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
				{ movementLabel: 'macchina', distanceKm: 15, co2Grams: 1650 }
			];

			const risultato = computeDailyScore(movimenti);

			expect(risultato.rawPoints).toBe(0);
			expect(risultato.grade).toBe('E');
		});
	});
});
