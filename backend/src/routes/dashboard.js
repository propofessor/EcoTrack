// backend/src/routes/dashboard.js
const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db');
const checkApiKey = require('../middleware/apiKeyMiddleware');
const { canonicalMovementLabel } = require('../utils/movementLabels');

router.use(checkApiKey);

const SORTABLE_COLS = new Set(['timestamp_start', 'co2_kgs', 'points']);

// ─── Deterministic mock data (used when Supabase is empty / unavailable) ──────

const TRANSPORT_TYPES = [
	{ label: 'Macchina',    co2Min: 1.8,  co2Max: 7.2,  ptsMin: 10,  ptsMax: 30  },
	{ label: 'Bus',         co2Min: 0.4,  co2Max: 1.8,  ptsMin: 30,  ptsMax: 70  },
	{ label: 'Bicicletta',  co2Min: 0,    co2Max: 0,    ptsMin: 100, ptsMax: 180 },
	{ label: 'Monopattino', co2Min: 0.05, co2Max: 0.15, ptsMin: 80,  ptsMax: 140 },
	{ label: 'Piedi',       co2Min: 0,    co2Max: 0,    ptsMin: 120, ptsMax: 200 },
];

// Realistic urban distribution for a small Italian city with good public transport
const TRANSPORT_WEIGHTS = [0.30, 0.28, 0.24, 0.08, 0.10];

function makePRNG(seed) {
	let s = (seed >>> 0);
	return () => {
		s = ((Math.imul(s, 1664525) + 1013904223) >>> 0);
		return s / 4294967295;
	};
}

let _mockCo2Cache = null;

function getMockCo2Stats() {
	if (_mockCo2Cache) return _mockCo2Cache;

	const rand = makePRNG(42);
	const records = [];
	const baseDate = new Date('2026-01-01T00:00:00.000Z');
	const endDate  = new Date('2026-06-19T00:00:00.000Z');
	const totalDays = Math.floor((endDate - baseDate) / 86400000);

	for (let d = 0; d < totalDays; d++) {
		const tripsToday = 2 + Math.floor(rand() * 3); // 2–4 trips/day
		for (let t = 0; t < tripsToday; t++) {
			// Pick transport type by weighted distribution
			const r = rand();
			let cumWeight = 0;
			let typeIdx = 0;
			for (let k = 0; k < TRANSPORT_WEIGHTS.length; k++) {
				cumWeight += TRANSPORT_WEIGHTS[k];
				if (r < cumWeight) { typeIdx = k; break; }
			}
			const tp = TRANSPORT_TYPES[typeIdx];

			const ts = new Date(baseDate);
			ts.setDate(ts.getDate() + d);
			ts.setHours(7 + Math.floor(rand() * 13), Math.floor(rand() * 60));

			const co2 = parseFloat((tp.co2Min + rand() * (tp.co2Max - tp.co2Min)).toFixed(3));
			const pts = Math.round(tp.ptsMin + rand() * (tp.ptsMax - tp.ptsMin));

			records.push({
				co2_kgs: co2,
				points: pts,
				timestamp_start: ts.toISOString(),
				movement_types: { label: tp.label },
			});
		}
	}

	records.sort((a, b) => b.timestamp_start.localeCompare(a.timestamp_start));
	_mockCo2Cache = records;
	return records;
}

const MOCK_LEADERBOARD = [
	{ user_id: 'usr-001', points: 5240 },
	{ user_id: 'usr-002', points: 4890 },
	{ user_id: 'usr-003', points: 4620 },
	{ user_id: 'usr-004', points: 4380 },
	{ user_id: 'usr-005', points: 4150 },
	{ user_id: 'usr-006', points: 3920 },
	{ user_id: 'usr-007', points: 3710 },
	{ user_id: 'usr-008', points: 3480 },
	{ user_id: 'usr-009', points: 3260 },
	{ user_id: 'usr-010', points: 3050 },
	{ user_id: 'usr-011', points: 2840 },
	{ user_id: 'usr-012', points: 2630 },
	{ user_id: 'usr-013', points: 2420 },
	{ user_id: 'usr-014', points: 2210 },
	{ user_id: 'usr-015', points: 2000 },
	{ user_id: 'usr-016', points: 1790 },
	{ user_id: 'usr-017', points: 1580 },
	{ user_id: 'usr-018', points: 1370 },
	{ user_id: 'usr-019', points: 1160 },
	{ user_id: 'usr-020', points:  950 },
];

// Trento-area pollution heatmap (mock sensor data)
const MOCK_MAP_POINTS = [
	{ latitude: 46.0679, longitude: 11.1211, weight: 0.90 }, // Piazza Dante – centro
	{ latitude: 46.0718, longitude: 11.1204, weight: 0.85 }, // Stazione FS
	{ latitude: 46.0631, longitude: 11.1132, weight: 0.70 }, // MUSE
	{ latitude: 46.0745, longitude: 11.1185, weight: 0.65 }, // Ponte S. Lorenzo
	{ latitude: 46.0620, longitude: 11.1280, weight: 0.60 }, // Via Brennero Sud
	{ latitude: 46.0695, longitude: 11.1145, weight: 0.55 }, // Via Torre Verde
	{ latitude: 46.0660, longitude: 11.1260, weight: 0.50 }, // Piedicastello
	{ latitude: 46.0780, longitude: 11.1230, weight: 0.48 }, // Gardolo
	{ latitude: 46.0590, longitude: 11.1190, weight: 0.42 }, // Mattarello
	{ latitude: 46.0710, longitude: 11.1310, weight: 0.38 }, // Povo
	{ latitude: 46.0640, longitude: 11.1090, weight: 0.33 }, // Ravina
	{ latitude: 46.0800, longitude: 11.1140, weight: 0.28 }, // Villazzano
	{ latitude: 46.0560, longitude: 11.1250, weight: 0.40 }, // Cadine
	{ latitude: 46.0690, longitude: 11.1340, weight: 0.35 }, // Cognola
	{ latitude: 46.0730, longitude: 11.1080, weight: 0.45 }, // Sardagna
];

// ─── Routes ────────────────────────────────────────────────────────────────────

// GET /api/dashboard/co2-stats
router.get('/co2-stats', async (req, res) => {
	try {
		const {
			date_start,
			date_end,
			offset   = 0,
			limit    = 100,
			sort_by  = 'timestamp_start',
			sort_dir = 'desc',
		} = req.query;

		const col       = SORTABLE_COLS.has(sort_by) ? sort_by : 'timestamp_start';
		const ascending = sort_dir === 'asc';

		let query = supabaseAdmin
			.from('history')
			.select('co2_kgs, points, timestamp_start, movement_types(label)')
			.order(col, { ascending })
			.range(Number(offset), Number(offset) + Number(limit) - 1);

		if (date_start) query = query.gte('timestamp_start', date_start);
		if (date_end)   query = query.lte('timestamp_start', date_end);

		const { data, error } = await query;

		// Un errore reale del DB deve emergere come 500 (RNF4 "gestione errori"),
		// non essere mascherato dai dati mock. Il fallback mock resta solo per il
		// caso legittimo di DB vuoto / demo offline.
		if (error) {
			console.error('[dashboard] co2-stats – errore query database:', error.message);
			return res.status(500).json({ error: 'Errore query database' });
		}

		let result = data;

		if (!result || result.length === 0) {
			result = getMockCo2Stats();
			if (date_start) result = result.filter(r => r.timestamp_start >= date_start);
			if (date_end)   result = result.filter(r => r.timestamp_start <= date_end);
			if (ascending)  result = [...result].reverse();
			result = result.slice(Number(offset), Number(offset) + Number(limit));
		}

		// Normalizziamo le etichette dei mezzi verso la forma canonica italiana
		// (es. 'walking' → 'Piedi'), così la dashboard riceve sempre testo IT a
		// prescindere da come sono memorizzati i dati nel DB.
		result = result.map(row =>
			row?.movement_types
				? { ...row, movement_types: { ...row.movement_types, label: canonicalMovementLabel(row.movement_types.label) } }
				: row
		);

		return res.json({ data: result, count: result.length });
	} catch (err) {
		console.error('[dashboard] co2-stats error:', err);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});

// GET /api/dashboard/co2-stats.csv
router.get('/co2-stats.csv', async (req, res) => {
	try {
		const { date_start, date_end } = req.query;

		let query = supabaseAdmin
			.from('history')
			.select('co2_kgs, points, timestamp_start')
			.order('timestamp_start', { ascending: false });

		if (date_start) query = query.gte('timestamp_start', date_start);
		if (date_end)   query = query.lte('timestamp_start', date_end);

		const { data, error } = await query;

		if (error) {
			console.error('[dashboard] co2-stats.csv – errore query database:', error.message);
			return res.status(500).json({ error: 'Errore query database' });
		}

		let rows = data;

		if (!rows || rows.length === 0) {
			rows = getMockCo2Stats();
			if (date_start) rows = rows.filter(r => r.timestamp_start >= date_start);
			if (date_end)   rows = rows.filter(r => r.timestamp_start <= date_end);
		}

		const header = 'timestamp_start,co2_kgs,points';
		const csv = [header, ...rows.map(r => `${r.timestamp_start},${r.co2_kgs},${r.points}`)].join('\n');

		res.setHeader('Content-Type', 'text/csv');
		res.setHeader('Content-Disposition', 'attachment; filename="co2-stats.csv"');
		return res.send(csv);
	} catch (err) {
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});

// GET /api/dashboard/leaderboard
router.get('/leaderboard', async (req, res) => {
	try {
		const { limit = 20 } = req.query;

		// Classifica PER UTENTE: sommiamo i punti di tutti i viaggi di ogni
		// utente. (Prima si ordinava `history` per i punti del singolo
		// viaggio, restituendo i viaggi migliori e non gli utenti migliori.)
		const { data, error } = await supabaseAdmin
			.from('history')
			.select('user_id, points');

		if (error) {
			console.error('[dashboard] leaderboard – errore query database:', error.message);
			return res.status(500).json({ error: 'Errore query database' });
		}

		let result;

		if (!data || data.length === 0) {
			result = MOCK_LEADERBOARD.slice(0, Number(limit));
		} else {
			const totals = {};
			for (const row of data) {
				if (!row.user_id) continue;
				totals[row.user_id] = (totals[row.user_id] || 0) + (Number(row.points) || 0);
			}
			result = Object.entries(totals)
				.map(([user_id, points]) => ({ user_id, points }))
				.sort((a, b) => b.points - a.points)
				.slice(0, Number(limit));
		}

		return res.json({ data: result });
	} catch (err) {
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});

// GET /api/dashboard/map-data  (heatmap for the municipality dashboard)
router.get('/map-data', (req, res) => {
	return res.json({ points: MOCK_MAP_POINTS });
});

module.exports = router;
