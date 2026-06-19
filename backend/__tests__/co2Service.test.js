// __tests__/co2Service.test.js
const { calculateEmissions } = require('../src/services/co2Service');

describe('co2Service - calculateEmissions (RF9)', () => {
	// ==========================================
	// Walking / Bicycling: zero emissions
	// ==========================================
	it('Dovrebbe restituire 0 per walking (RF9.1)', async () => {
		const result = await calculateEmissions({ walking: 5 });
		expect(result.emissions.walking).toBe(0);
	});

	it('Dovrebbe restituire 0 per bicycling (RF9.1)', async () => {
		const result = await calculateEmissions({ bicycling: 10 });
		expect(result.emissions.bicycling).toBe(0);
	});

	// ==========================================
	// Transit: 104 g/km (RF9.2)
	// ==========================================
	it('Dovrebbe calcolare le emissioni transit a 104 g/km (RF9.2)', async () => {
		const result = await calculateEmissions({ transit: 10 });
		expect(result.emissions.transit).toBe(1040); // 10 × 104
	});

	it('Dovrebbe restituire null per transit se la distanza non è fornita', async () => {
		const result = await calculateEmissions({ walking: 2 });
		expect(result.emissions.transit).toBeNull();
	});

	// ==========================================
	// Driving: plate-specific or average 110 g/km (RF9.3)
	// ==========================================
	it('Dovrebbe usare 110 g/km (media nazionale) se nessuna targa è fornita', async () => {
		const result = await calculateEmissions({ driving: 10 });
		expect(result.emissions.driving).toBe(1100); // 10 × 110
		expect(result.note).toContain('media nazionale');
	});

	it('Dovrebbe usare 0 g/km per targa iniziante con E (veicolo elettrico)', async () => {
		const result = await calculateEmissions({ driving: 20 }, 'EV001AB');
		expect(result.emissions.driving).toBe(0);
	});

	it('Dovrebbe usare 140 g/km per targa iniziante con A', async () => {
		const result = await calculateEmissions({ driving: 10 }, 'AB123CD');
		expect(result.emissions.driving).toBe(1400); // 10 × 140
	});

	it('Dovrebbe usare 120 g/km per targa generica', async () => {
		const result = await calculateEmissions({ driving: 10 }, 'ZZ999ZZ');
		expect(result.emissions.driving).toBe(1200); // 10 × 120
	});

	it('Dovrebbe restituire null per driving se la distanza non è fornita', async () => {
		const result = await calculateEmissions({ walking: 3 });
		expect(result.emissions.driving).toBeNull();
	});

	// ==========================================
	// Mix di modalità
	// ==========================================
	it('Dovrebbe calcolare correttamente un viaggio misto bici + trasporto pubblico', async () => {
		const result = await calculateEmissions({ bicycling: 5, transit: 8 });
		expect(result.emissions.bicycling).toBe(0);
		expect(result.emissions.transit).toBe(832); // 8 × 104
		expect(result.emissions.driving).toBeNull();
	});
});
