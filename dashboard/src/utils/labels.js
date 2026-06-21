export const WIDGET_TYPES = [
	{ value: 'ChartBar', label: 'Istogramma' },
	{ value: 'ChartPie', label: 'Grafico a Torta' },
	{ value: 'ChartLine', label: 'Grafico a Linee' },
	{ value: 'DataTable', label: 'Tabella Dati' },
	{ value: 'MapWidget', label: 'Mappa Interattiva' }
];

export const DATASETS = [
	{ value: 'co2_monthly', label: 'CO2 Mensile per Mezzo' },
	{ value: 'transport_split', label: 'Distribuzione Mezzi di Trasporto' },
	{ value: 'history', label: 'Storico Viaggi' },
	{ value: 'leaderboard', label: 'Classifica Utenti (Anonimizzata)' },
	{ value: 'co2_heatmap', label: 'Dati Mappa CO2' }
];

const WIDGET_TYPE_LABELS = Object.fromEntries(
	WIDGET_TYPES.map((t) => [t.value, t.label])
);
const DATASET_LABELS = Object.fromEntries(
	DATASETS.map((d) => [d.value, d.label])
);


export function widgetTypeLabel(value) {
	return WIDGET_TYPE_LABELS[value] || value;
}


export function datasetLabel(value) {
	return DATASET_LABELS[value] || value;
}


export const TRANSPORT_ORDER = [
	'Macchina',
	'Bus',
	'Treno',
	'Monopattino',
	'Bicicletta',
	'Piedi'
];

const TRANSPORT_COLORS = {
	Macchina:    '#8ab834',
	Bus:         '#e7dc0c',
	Treno:       '#f59e0b',
	Monopattino: '#d05305',
	Bicicletta:  '#b73410',
	Piedi:       '#3f981e'
};


const FALLBACK_PALETTE = [
	'#10b981',
	'#3b82f6',
	'#f59e0b',
	'#ef4444',
	'#8b5cf6',
	'#06b6d4'
];


export function transportColor(label, idx = 0) {
	return (
		TRANSPORT_COLORS[label] ||
		FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length]
	);
}
