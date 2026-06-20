// src/utils/labels.js
// Etichette descrittive (in italiano) usate dalla dashboard per tipi di widget
// e dataset. Centralizzate qui così la modale di configurazione e l'intestazione
// dei widget restano sempre allineate.

export const WIDGET_TYPES = [
	{ value: 'ChartBar',  label: 'Istogramma'        },
	{ value: 'ChartPie',  label: 'Grafico a Torta'   },
	{ value: 'ChartLine', label: 'Grafico a Linee'   },
	{ value: 'DataTable', label: 'Tabella Dati'      },
	{ value: 'MapWidget', label: 'Mappa Interattiva' },
];

export const DATASETS = [
	{ value: 'co2_monthly',     label: 'CO2 Mensile per Mezzo'            },
	{ value: 'transport_split', label: 'Distribuzione Mezzi di Trasporto' },
	{ value: 'history',         label: 'Storico Viaggi'                   },
	{ value: 'leaderboard',     label: 'Classifica Utenti (Anonimizzata)' },
	{ value: 'co2_heatmap',     label: 'Dati Mappa CO2'                   },
];

const WIDGET_TYPE_LABELS = Object.fromEntries(WIDGET_TYPES.map(t => [t.value, t.label]));
const DATASET_LABELS     = Object.fromEntries(DATASETS.map(d => [d.value, d.label]));

/** Nome descrittivo del tipo di widget (fallback: il valore grezzo). */
export function widgetTypeLabel(value) {
	return WIDGET_TYPE_LABELS[value] || value;
}

/** Nome descrittivo del dataset (fallback: il valore grezzo). */
export function datasetLabel(value) {
	return DATASET_LABELS[value] || value;
}

// ── Colori dei mezzi di trasporto ────────────────────────────────────────────
// Ordine e colori canonici, condivisi tra i grafici così ogni mezzo ha sempre
// lo stesso colore (es. nel grafico a linee "CO2 Mensile per Mezzo").
export const TRANSPORT_ORDER = ['Macchina', 'Bus', 'Treno', 'Monopattino', 'Bicicletta', 'Piedi'];

export const TRANSPORT_COLORS = {
	Macchina:    '#ef4444',
	Bus:         '#3b82f6',
	Treno:       '#8b5cf6',
	Monopattino: '#f59e0b',
	Bicicletta:  '#10b981',
	Piedi:       '#06b6d4',
};

// Palette di riserva per etichette non previste nella mappa.
const FALLBACK_PALETTE = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

/** Colore stabile per un mezzo; per etichette sconosciute usa la palette per indice. */
export function transportColor(label, idx = 0) {
	return TRANSPORT_COLORS[label] || FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length];
}
