const {
	canonicalMovementLabel,
	MOVEMENT_LABEL_MAP
} = require('../src/utils/movementLabels');

describe('canonicalMovementLabel (normalizzazione etichette mezzi)', () => {
	it('mappa le varianti inglesi verso la forma canonica italiana', () => {
		expect(canonicalMovementLabel('walking')).toBe('Piedi');
		expect(canonicalMovementLabel('bicycling')).toBe('Bicicletta');
		expect(canonicalMovementLabel('transit')).toBe('Bus');
		expect(canonicalMovementLabel('driving')).toBe('Macchina');
		expect(canonicalMovementLabel('scooter')).toBe('Monopattino');
		expect(canonicalMovementLabel('train')).toBe('Treno');
	});

	it('è case-insensitive e ignora gli spazi a inizio/fine', () => {
		expect(canonicalMovementLabel('  WALKING ')).toBe('Piedi');
		expect(canonicalMovementLabel('Bici')).toBe('Bicicletta');
		expect(canonicalMovementLabel('AUTOBUS')).toBe('Bus');
	});

	it('è idempotente sulle etichette già canoniche', () => {
		expect(canonicalMovementLabel('Piedi')).toBe('Piedi');
		expect(canonicalMovementLabel('Bicicletta')).toBe('Bicicletta');
		expect(canonicalMovementLabel('Treno')).toBe('Treno');
	});

	it('per valori non mappati capitalizza la prima lettera (fallback)', () => {
		expect(canonicalMovementLabel('aereo')).toBe('Aereo');
		expect(canonicalMovementLabel('SKATEBOARD')).toBe('Skateboard');
	});

	it('restituisce null/undefined invariati', () => {
		expect(canonicalMovementLabel(null)).toBeNull();
		expect(canonicalMovementLabel(undefined)).toBeUndefined();
	});

	it('restituisce la stringa originale se dopo il trim risulta vuota', () => {
		expect(canonicalMovementLabel('   ')).toBe('   ');
		expect(canonicalMovementLabel('')).toBe('');
	});

	it('espone la mappa delle etichette canoniche', () => {
		expect(MOVEMENT_LABEL_MAP.bus).toBe('Bus');
		expect(MOVEMENT_LABEL_MAP.driving).toBe('Macchina');
	});
});
