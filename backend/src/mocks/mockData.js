function makePRNG(seed) {
	let s = seed >>> 0;
	return () => {
		s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
		return s / 4294967295;
	};
}



const MOCK_MOVEMENT_TYPES = [
	{ id: '00000001-0000-0000-0000-000000000001', label: 'Piedi' },
	{ id: '00000001-0000-0000-0000-000000000002', label: 'Bicicletta' },
	{ id: '00000001-0000-0000-0000-000000000003', label: 'Macchina' },
	{ id: '00000001-0000-0000-0000-000000000004', label: 'Bus' },
	{ id: '00000001-0000-0000-0000-000000000005', label: 'Monopattino' }
];

const MOCK_DRIVING_MOVEMENT_TYPE_ID = '00000001-0000-0000-0000-000000000003';


const TRANSPORT_CONFIG = [
	{
		type: MOCK_MOVEMENT_TYPES[0],
		co2Min: 0,
		co2Max: 0,
		ptsMin: 120,
		ptsMax: 200,
		weight: 0.09,
		distMin: 0.5,
		distMax: 3.0
	},
	{
		type: MOCK_MOVEMENT_TYPES[1],
		co2Min: 0,
		co2Max: 0,
		ptsMin: 100,
		ptsMax: 180,
		weight: 0.22,
		distMin: 1.0,
		distMax: 8.0
	},
	{
		type: MOCK_MOVEMENT_TYPES[2],
		co2Min: 1.8,
		co2Max: 7.2,
		ptsMin: 10,
		ptsMax: 30,
		weight: 0.28,
		distMin: 2.0,
		distMax: 15.0
	},
	{
		type: MOCK_MOVEMENT_TYPES[3],
		co2Min: 0.4,
		co2Max: 1.8,
		ptsMin: 30,
		ptsMax: 70,
		weight: 0.33,
		distMin: 1.5,
		distMax: 12.0
	},
	{
		type: MOCK_MOVEMENT_TYPES[4],
		co2Min: 0.05,
		co2Max: 0.15,
		ptsMin: 80,
		ptsMax: 140,
		weight: 0.08,
		distMin: 0.5,
		distMax: 5.0
	}
];



let _mockHistoryCache = null;

function getMockHistory() {
	if (_mockHistoryCache) return _mockHistoryCache;

	const rand = makePRNG(42);
	const records = [];
	const baseDate = new Date('2026-01-01T00:00:00.000Z');
	const endDate = new Date('2026-06-19T00:00:00.000Z');
	const totalDays = Math.floor((endDate - baseDate) / 86400000);

	for (let d = 0; d < totalDays; d++) {
		const tripsToday = 2 + Math.floor(rand() * 3);
		for (let t = 0; t < tripsToday; t++) {

			const r = rand();
			let cumWeight = 0;
			let cfg = TRANSPORT_CONFIG[0];
			for (const c of TRANSPORT_CONFIG) {
				cumWeight += c.weight;
				if (r < cumWeight) {
					cfg = c;
					break;
				}
			}

			const ts = new Date(baseDate);
			ts.setUTCDate(ts.getUTCDate() + d);
			ts.setUTCHours(
				7 + Math.floor(rand() * 13),
				Math.floor(rand() * 60),
				0,
				0
			);

			const durationMin = 10 + Math.floor(rand() * 50);
			const te = new Date(ts.getTime() + durationMin * 60000);

			const co2 = parseFloat(
				(cfg.co2Min + rand() * (cfg.co2Max - cfg.co2Min)).toFixed(3)
			);
			const pts = Math.round(
				cfg.ptsMin + rand() * (cfg.ptsMax - cfg.ptsMin)
			);

			records.push({
				id: `mock-hist-${String(records.length).padStart(4, '0')}`,
				timestamp_start: ts.toISOString(),
				timestamp_end: te.toISOString(),
				co2_kgs: co2,
				points: pts,
				movement_types: {
					id: cfg.type.id,
					label: cfg.type.label
				}
			});
		}
	}

	records.sort((a, b) => b.timestamp_start.localeCompare(a.timestamp_start));
	_mockHistoryCache = records;
	return records;
}


function getMockExportHistory() {
	return getMockHistory().map(
		({ id, timestamp_start, timestamp_end, co2_kgs, points }) => ({
			id,
			timestamp_start,
			timestamp_end,
			co2_kgs,
			points
		})
	);
}



const MOCK_PROMO_CODES = [
	{ id: 'promo-mock-001', code: 'ECOTRACK-VERDE-2026' },
	{ id: 'promo-mock-002', code: 'TRENTO-ECO-PRIMAVERA' }
];



function getMockDailyScore() {
	return {
		grade: 'B',
		normalized_score: 65.4,
		raw_points: 1240,
		total_km: 12.4,
		co2_saved_kgs: 0.94
	};
}

function _getCurrentWeekBounds() {
	const now = new Date('2026-06-19');
	const diffToMon = (now.getDay() + 6) % 7;
	const monday = new Date(now);
	monday.setDate(now.getDate() - diffToMon);
	const sunday = new Date(monday);
	sunday.setDate(monday.getDate() + 6);
	return {
		start: monday.toISOString().slice(0, 10),
		end: sunday.toISOString().slice(0, 10)
	};
}

function getMockWeeklyScore() {
	const { start, end } = _getCurrentWeekBounds();
	return {
		weekStart: start,
		weekEnd: end,
		weeklyScore: 321.8,
		daysWithActivity: 4
	};
}

const MOCK_LEADERBOARD_USERS = [
	{
		userId: 'usr-mock-001',
		displayName: 'Marco V.',
		weeklyScore: 91.4,
		rank: 1
	},
	{
		userId: 'usr-mock-002',
		displayName: 'Sara B.',
		weeklyScore: 87.2,
		rank: 2
	},
	{
		userId: 'usr-mock-003',
		displayName: 'Luca T.',
		weeklyScore: 83.5,
		rank: 3
	},
	{
		userId: 'usr-mock-004',
		displayName: 'Elena R.',
		weeklyScore: 79.1,
		rank: 4
	},
	{
		userId: 'usr-mock-005',
		displayName: 'Anonimo',
		weeklyScore: 74.8,
		rank: 5
	},
	{
		userId: 'usr-mock-006',
		displayName: 'Giulia M.',
		weeklyScore: 70.3,
		rank: 6
	},
	{
		userId: 'usr-mock-007',
		displayName: 'Paolo F.',
		weeklyScore: 65.9,
		rank: 7
	},
	{
		userId: 'usr-mock-008',
		displayName: 'Chiara D.',
		weeklyScore: 61.4,
		rank: 8
	},
	{
		userId: 'usr-mock-009',
		displayName: 'Alberto N.',
		weeklyScore: 57.2,
		rank: 9
	},
	{
		userId: 'usr-mock-010',
		displayName: 'Federica L.',
		weeklyScore: 53.0,
		rank: 10
	},
	{
		userId: 'usr-mock-011',
		displayName: 'Simone C.',
		weeklyScore: 48.7,
		rank: 11
	},
	{
		userId: 'usr-mock-012',
		displayName: 'Martina P.',
		weeklyScore: 44.5,
		rank: 12
	},
	{
		userId: 'usr-mock-013',
		displayName: 'Roberto G.',
		weeklyScore: 40.1,
		rank: 13
	},
	{
		userId: 'usr-mock-014',
		displayName: 'Valentina E.',
		weeklyScore: 35.8,
		rank: 14
	},
	{
		userId: 'usr-mock-015',
		displayName: 'Davide S.',
		weeklyScore: 31.4,
		rank: 15
	},
	{
		userId: 'usr-mock-016',
		displayName: 'Anna K.',
		weeklyScore: 27.2,
		rank: 16
	},
	{
		userId: 'usr-mock-017',
		displayName: 'Anonimo',
		weeklyScore: 23.0,
		rank: 17
	},
	{
		userId: 'usr-mock-018',
		displayName: 'Matteo Z.',
		weeklyScore: 18.7,
		rank: 18
	},
	{
		userId: 'usr-mock-019',
		displayName: 'Laura O.',
		weeklyScore: 14.3,
		rank: 19
	},
	{
		userId: 'usr-mock-020',
		displayName: 'Stefano I.',
		weeklyScore: 10.1,
		rank: 20
	}
];

function getMockLeaderboard(requestingUserId, limit = 10) {
	const { start, end } = _getCurrentWeekBounds();
	const leaderboard = MOCK_LEADERBOARD_USERS.slice(0, limit);
	const podium = MOCK_LEADERBOARD_USERS.slice(0, 3);
	const personalRank = {
		userId: requestingUserId || 'current-user',
		displayName: 'Tu',
		weeklyScore: 42.3,
		rank: 12,
		neighbors: [MOCK_LEADERBOARD_USERS[10], MOCK_LEADERBOARD_USERS[12]]
	};
	return {
		weekStart: start,
		weekEnd: end,
		podium,
		leaderboard,
		personalRank
	};
}

function getMockGamificationHistory(limit = 12) {
	const rand = makePRNG(99);
	const weeks = [];

	const lastSunday = new Date('2026-06-14');

	for (let w = 0; w < limit; w++) {
		const weekEnd = new Date(lastSunday);
		weekEnd.setDate(lastSunday.getDate() - w * 7);
		const weekStart = new Date(weekEnd);
		weekStart.setDate(weekEnd.getDate() - 6);

		const weeklyScore = parseFloat((20 + rand() * 75).toFixed(1));
		const rank = 1 + Math.floor(rand() * 20);
		const rewardLabel = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : null;

		weeks.push({
			weekStart: weekStart.toISOString().slice(0, 10),
			weekEnd: weekEnd.toISOString().slice(0, 10),
			weeklyScore,
			rank,
			rewardLabel
		});
	}

	return weeks;
}

module.exports = {
	MOCK_DRIVING_MOVEMENT_TYPE_ID,
	getMockHistory,
	getMockExportHistory,
	MOCK_PROMO_CODES,
	getMockDailyScore,
	getMockWeeklyScore,
	getMockLeaderboard,
	getMockGamificationHistory
};
