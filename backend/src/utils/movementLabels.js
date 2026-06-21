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


function canonicalMovementLabel(raw) {
	if (raw == null) return raw;
	const key = String(raw).trim().toLowerCase();
	if (!key) return String(raw);
	if (MOVEMENT_LABEL_MAP[key]) return MOVEMENT_LABEL_MAP[key];
	return key.charAt(0).toUpperCase() + key.slice(1);
}

module.exports = { MOVEMENT_LABEL_MAP, canonicalMovementLabel };
