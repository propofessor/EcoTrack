import { useEffect, useState } from 'react';
import { getCo2Stats, getLeaderboard, getMapData } from '../api/dashboardapi.js';

const FORCE_MOCK = import.meta.env.VITE_FORCE_MOCK === 'true';
// Fallback mock data for each dataset (shown when API is unavailable)
const MOCK = {
	co2_monthly: [
		{ month: '2026-01', co2: 136.5, Macchina: 110.0, Bus: 22.0, Monopattino: 4.5, Bicicletta: 0, Piedi: 0 },
		{ month: '2026-02', co2: 150.3, Macchina: 120.0, Bus: 26.0, Monopattino: 4.3, Bicicletta: 0, Piedi: 0 },
		{ month: '2026-03', co2: 127.3, Macchina: 100.0, Bus: 24.0, Monopattino: 3.3, Bicicletta: 0, Piedi: 0 },
		{ month: '2026-04', co2: 160.2, Macchina: 128.0, Bus: 28.0, Monopattino: 4.2, Bicicletta: 0, Piedi: 0 },
		{ month: '2026-05', co2: 141.0, Macchina: 112.0, Bus: 25.0, Monopattino: 4.0, Bicicletta: 0, Piedi: 0 },
		{ month: '2026-06', co2: 115.0, Macchina:  90.0, Bus: 21.0, Monopattino: 4.0, Bicicletta: 0, Piedi: 0 },
	],
	transport_split: [
		{ name: 'Macchina',    co2: 312.4, count: 48 },
		{ name: 'Bus',         co2:  87.6, count: 62 },
		{ name: 'Bicicletta',  co2:   0.0, count: 35 },
		{ name: 'Monopattino', co2:   4.1, count: 18 },
		{ name: 'Piedi',       co2:   0.0, count: 41 },
	],
	history: [
		{ timestamp_start: '2026-06-17T08:30:00', co2_kgs: 3.2, points: 20,  movement_type: 'Macchina'    },
		{ timestamp_start: '2026-06-16T17:45:00', co2_kgs: 0.8, points: 55,  movement_type: 'Bus'         },
		{ timestamp_start: '2026-06-15T09:00:00', co2_kgs: 0.0, points: 140, movement_type: 'Bicicletta'  },
		{ timestamp_start: '2026-06-14T18:15:00', co2_kgs: 0.2, points: 90,  movement_type: 'Monopattino' },
		{ timestamp_start: '2026-06-12T08:00:00', co2_kgs: 4.1, points: 15,  movement_type: 'Macchina'    },
		{ timestamp_start: '2026-06-11T19:00:00', co2_kgs: 0.0, points: 165, movement_type: 'Piedi'       },
		{ timestamp_start: '2026-06-10T10:30:00', co2_kgs: 0.9, points: 48,  movement_type: 'Bus'         },
		{ timestamp_start: '2026-06-09T07:45:00', co2_kgs: 2.7, points: 22,  movement_type: 'Macchina'    },
		{ timestamp_start: '2026-06-08T16:00:00', co2_kgs: 0.0, points: 130, movement_type: 'Bicicletta'  },
	],
	leaderboard: [
		{ rank: 1,  label: 'Utente 001', points: 5240 },
		{ rank: 2,  label: 'Utente 002', points: 4890 },
		{ rank: 3,  label: 'Utente 003', points: 4620 },
		{ rank: 4,  label: 'Utente 004', points: 4380 },
		{ rank: 5,  label: 'Utente 005', points: 4150 },
		{ rank: 6,  label: 'Utente 006', points: 3920 },
		{ rank: 7,  label: 'Utente 007', points: 3710 },
		{ rank: 8,  label: 'Utente 008', points: 3480 },
		{ rank: 9,  label: 'Utente 009', points: 3260 },
		{ rank: 10, label: 'Utente 010', points: 3050 },
	],
	co2_heatmap: [
		{ lat: 46.0679, lng: 11.1211, weight: 0.90 },
		{ lat: 46.0718, lng: 11.1204, weight: 0.85 },
		{ lat: 46.0631, lng: 11.1132, weight: 0.70 },
		{ lat: 46.0745, lng: 11.1185, weight: 0.65 },
		{ lat: 46.0620, lng: 11.1280, weight: 0.60 },
		{ lat: 46.0695, lng: 11.1145, weight: 0.55 },
		{ lat: 46.0660, lng: 11.1260, weight: 0.50 },
		{ lat: 46.0780, lng: 11.1230, weight: 0.45 },
		{ lat: 46.0590, lng: 11.1190, weight: 0.40 },
		{ lat: 46.0710, lng: 11.1310, weight: 0.38 },
		{ lat: 46.0640, lng: 11.1090, weight: 0.33 },
		{ lat: 46.0800, lng: 11.1140, weight: 0.28 },
		{ lat: 46.0560, lng: 11.1250, weight: 0.40 },
		{ lat: 46.0690, lng: 11.1340, weight: 0.35 },
		{ lat: 46.0730, lng: 11.1080, weight: 0.45 },
	],
};

// Datasets that don't use date range filters
const NO_DATE_FILTER = new Set(['leaderboard', 'co2_heatmap']);

export function useWidgetData(config = {}) {
	const { dataset, dateMode, dynamicDays, startDate, endDate } = config;

	const [data, setData]       = useState([]);
	const [loading, setLoading] = useState(true);
	// True when the data shown is the local MOCK fallback (API unavailable/empty),
	// so the UI can signal it to the user (RNF4 "gestione errori").
	const [usingFallback, setUsingFallback] = useState(false);

	useEffect(() => {
		if (!dataset) {
			setData([]);
			setUsingFallback(false);
			setLoading(false);
			return;
		}

		setLoading(true);

		const buildDateParams = () => {
			if (NO_DATE_FILTER.has(dataset)) return {};
			const params = {};
			if (dateMode === 'dynamic' && dynamicDays) {
				const d = new Date();
				d.setDate(d.getDate() - Number(dynamicDays));
				params.date_start = d.toISOString();
			} else if (dateMode === 'static') {
				if (startDate) params.date_start = startDate;
				if (endDate)   params.date_end   = endDate;
			}
			return params;
		};

		const fetchAndTransform = async () => {
			if (FORCE_MOCK) return MOCK[dataset] ?? [];
			switch (dataset) {
				case 'co2_monthly': {
					const res  = await getCo2Stats({ ...buildDateParams(), limit: 1000 });
					const rows = res?.data || [];
					if (rows.length === 0) return MOCK.co2_monthly;

					// Pivot per mese × mezzo: ogni riga porta i kg CO2 di ciascun
					// mezzo più il totale mensile in `co2` (così istogramma e
					// tabella, che leggono `co2`, continuano a funzionare).
					const agg   = {};            // month -> { label -> sumCo2 }
					const modes = new Set();     // unione dei mezzi presenti
					rows.forEach(row => {
						const month = row.timestamp_start?.slice(0, 7) || 'N/D';
						const label = row.movement_types?.label || 'Altro';
						const co2   = parseFloat(row.co2_kgs) || 0;
						if (!agg[month]) agg[month] = {};
						agg[month][label] = (agg[month][label] || 0) + co2;
						modes.add(label);
					});
					return Object.entries(agg)
						.sort(([a], [b]) => a.localeCompare(b))
						.map(([month, byMode]) => {
							const out = { month };
							let total = 0;
							// Garantiamo che ogni mezzo sia presente (0 se assente),
							// così le linee non hanno interruzioni.
							modes.forEach(label => {
								const v = byMode[label] || 0;
								out[label] = parseFloat(v.toFixed(2));
								total += v;
							});
							out.co2 = parseFloat(total.toFixed(2));
							return out;
						});
				}

				case 'transport_split': {
					const res  = await getCo2Stats({ ...buildDateParams(), limit: 1000 });
					const rows = res?.data || [];
					if (rows.length === 0) return MOCK.transport_split;

					const agg = {};
					rows.forEach(row => {
						const label = row.movement_types?.label || 'Altro';
						if (!agg[label]) agg[label] = { co2: 0, count: 0 };
						agg[label].co2   += parseFloat(row.co2_kgs) || 0;
						agg[label].count += 1;
					});
					return Object.entries(agg).map(([name, v]) => ({
						name,
						co2:   parseFloat(v.co2.toFixed(2)),
						count: v.count,
					}));
				}

				case 'history': {
					const res  = await getCo2Stats({ ...buildDateParams(), limit: 100, sort_by: 'timestamp_start', sort_dir: 'desc' });
					const rows = res?.data || [];
					if (rows.length === 0) return MOCK.history;
					return rows.map(r => ({
						timestamp_start: r.timestamp_start,
						co2_kgs:         parseFloat(r.co2_kgs) || 0,
						points:          r.points || 0,
						movement_type:   r.movement_types?.label || '—',
					}));
				}

				case 'leaderboard': {
					const res  = await getLeaderboard({ limit: 20 });
					const rows = res?.data || [];
					if (rows.length === 0) return MOCK.leaderboard;
					return rows.map((r, i) => ({
						rank:   i + 1,
						label:  `Utente ${String(i + 1).padStart(3, '0')}`,
						points: r.points || 0,
					}));
				}

				case 'co2_heatmap': {
					const res    = await getMapData();
					const points = res?.points || [];
					if (points.length === 0) return MOCK.co2_heatmap;
					return points.map(p => ({ lat: p.latitude, lng: p.longitude, weight: p.weight }));
				}

				default:
					return [];
			}
		};

		fetchAndTransform()
			.then(result => {
				setData(result);
				// Each case returns the MOCK[dataset] array by reference when the
				// API is empty/unavailable, so an identity check detects fallback.
				setUsingFallback(result === MOCK[dataset]);
			})
			.catch(() => {
				setData(MOCK[dataset] || []);
				setUsingFallback(true);
			})
			.finally(() => setLoading(false));

	}, [dataset, dateMode, dynamicDays, startDate, endDate]);

	return { data, loading, usingFallback };
}
