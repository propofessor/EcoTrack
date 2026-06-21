const { calculateEmissions } = require('../src/services/co2Service');

describe('co2Service - calculateEmissions (RF9)', () => {



	it('Dovrebbe restituire 0 per piedi (RF9.1)', async () => {
		const result = await calculateEmissions({ piedi: 5 });
		expect(result.emissions.piedi).toBe(0);
	});

	it('Dovrebbe restituire 0 per bicicletta (RF9.1)', async () => {
		const result = await calculateEmissions({ bicicletta: 10 });
		expect(result.emissions.bicicletta).toBe(0);
	});




	it('Dovrebbe calcolare le emissioni autobus a 40 g/km (RF9.2)', async () => {
		const result = await calculateEmissions({ autobus: 10 });
		expect(result.emissions.autobus).toBe(400);
	});

	it('Dovrebbe restituire null per autobus se la distanza non è fornita', async () => {
		const result = await calculateEmissions({ piedi: 2 });
		expect(result.emissions.autobus).toBeNull();
	});




	it('Dovrebbe usare 110 g/km (media nazionale) se nessuna targa è fornita', async () => {
		const result = await calculateEmissions({ macchina: 10 });
		expect(result.emissions.macchina).toBe(1100);
		expect(result.note).toContain('media nazionale');
	});

	it('Dovrebbe usare 0 g/km per targa iniziante con E (veicolo elettrico)', async () => {
		const result = await calculateEmissions({ macchina: 20 }, 'EV001AB');
		expect(result.emissions.macchina).toBe(0);
	});

	it('Dovrebbe usare 140 g/km per targa iniziante con A', async () => {
		const result = await calculateEmissions({ macchina: 10 }, 'AB123CD');
		expect(result.emissions.macchina).toBe(1400);
	});

	it('Dovrebbe usare 120 g/km per targa generica', async () => {
		const result = await calculateEmissions({ macchina: 10 }, 'ZZ999ZZ');
		expect(result.emissions.macchina).toBe(1200);
	});

	it('Dovrebbe restituire null per macchina se la distanza non è fornita', async () => {
		const result = await calculateEmissions({ piedi: 3 });
		expect(result.emissions.macchina).toBeNull();
	});




	it('Dovrebbe calcolare correttamente un viaggio misto bici + trasporto pubblico', async () => {
		const result = await calculateEmissions({ bicicletta: 5, autobus: 8 });
		expect(result.emissions.bicicletta).toBe(0);
		expect(result.emissions.autobus).toBe(320);
		expect(result.emissions.macchina).toBeNull();
	});
});
