// src/utils/movementLabels.js
// Etichette canoniche (in italiano) dei mezzi di trasporto.
//
// Lo storico (`movement_types.label`) può contenere valori eterogenei a seconda
// di come sono stati popolati i dati (es. il riconoscimento attività di Google
// restituisce `walking`, `bicycling`, `transit`, `driving`). Questa utility
// normalizza qualunque variante — inglese o italiana, con qualsiasi casing —
// verso un'unica forma canonica italiana, così l'API espone SEMPRE etichette in
// italiano a dashboard e app mobile.

// Variante normalizzata (trim + lowercase) → etichetta canonica da mostrare.
const MOVEMENT_LABEL_MAP = {
	walking:     'Piedi',
	on_foot:     'Piedi',
	'a piedi':   'Piedi',
	piedi:       'Piedi',

	bicycling:   'Bicicletta',
	cycling:     'Bicicletta',
	bike:        'Bicicletta',
	bici:        'Bicicletta',
	bicicletta:  'Bicicletta',

	transit:     'Bus',
	bus:         'Bus',
	autobus:     'Bus',

	driving:     'Macchina',
	car:         'Macchina',
	auto:        'Macchina',
	macchina:    'Macchina',

	scooter:     'Monopattino',
	monopattino: 'Monopattino',

	train:       'Treno',
	treno:       'Treno',
};

/**
 * Restituisce l'etichetta canonica italiana per un mezzo di trasporto.
 * Per valori non mappati ritorna l'input con l'iniziale maiuscola, così anche
 * eventuali mezzi futuri risultano comunque presentabili. È idempotente: le
 * etichette già canoniche (es. 'Piedi') vengono mappate su sé stesse.
 *
 * @param {string} raw  Etichetta grezza proveniente da `movement_types.label`
 * @returns {string}    Etichetta canonica in italiano
 */
function canonicalMovementLabel(raw) {
	if (raw == null) return raw;
	const key = String(raw).trim().toLowerCase();
	if (!key) return String(raw);
	if (MOVEMENT_LABEL_MAP[key]) return MOVEMENT_LABEL_MAP[key];
	return key.charAt(0).toUpperCase() + key.slice(1);
}

module.exports = { MOVEMENT_LABEL_MAP, canonicalMovementLabel };
