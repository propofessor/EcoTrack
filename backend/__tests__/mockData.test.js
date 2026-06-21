const {
	MOCK_DRIVING_MOVEMENT_TYPE_ID,
	getMockHistory,
	getMockExportHistory,
	MOCK_PROMO_CODES,
	getMockDailyScore,
	getMockWeeklyScore,
	getMockLeaderboard,
	getMockGamificationHistory
} = require('../src/mocks/mockData');

describe('getMockHistory', () => {
	it('produce uno storico non vuoto e deterministico tra le chiamate', () => {
		const a = getMockHistory();
		const b = getMockHistory();
		expect(a.length).toBeGreaterThan(0);
		expect(b).toBe(a);
	});

	it('ogni record ha la forma attesa', () => {
		const [record] = getMockHistory();
		expect(record).toEqual(
			expect.objectContaining({
				id: expect.any(String),
				timestamp_start: expect.any(String),
				timestamp_end: expect.any(String),
				co2_kgs: expect.any(Number),
				points: expect.any(Number),
				movement_types: expect.objectContaining({
					id: expect.any(String),
					label: expect.any(String)
				})
			})
		);
	});

	it('è ordinato per timestamp_start decrescente', () => {
		const history = getMockHistory();
		for (let i = 1; i < history.length; i++) {
			expect(
				history[i - 1].timestamp_start >= history[i].timestamp_start
			).toBe(true);
		}
	});
});

describe('getMockExportHistory', () => {
	it('rimuove il join movement_types mantenendo i campi base', () => {
		const [row] = getMockExportHistory();
		expect(row).toEqual(
			expect.objectContaining({
				id: expect.any(String),
				timestamp_start: expect.any(String),
				timestamp_end: expect.any(String),
				co2_kgs: expect.any(Number),
				points: expect.any(Number)
			})
		);
		expect(row.movement_types).toBeUndefined();
	});
});

describe('getMockDailyScore / getMockWeeklyScore', () => {
	it('getMockDailyScore restituisce un voto giornaliero coerente', () => {
		const score = getMockDailyScore();
		expect(score.grade).toBe('B');
		expect(typeof score.normalized_score).toBe('number');
		expect(typeof score.raw_points).toBe('number');
	});

	it('getMockWeeklyScore ha weekStart <= weekEnd', () => {
		const weekly = getMockWeeklyScore();
		expect(weekly.weekStart <= weekly.weekEnd).toBe(true);
		expect(weekly.daysWithActivity).toBeGreaterThanOrEqual(0);
	});
});

describe('getMockLeaderboard', () => {
	it('rispetta il limite e restituisce podio e posizione personale', () => {
		const board = getMockLeaderboard('current-user', 5);
		expect(board.leaderboard).toHaveLength(5);
		expect(board.podium).toHaveLength(3);
		expect(board.personalRank.userId).toBe('current-user');
		expect(board.personalRank.neighbors).toHaveLength(2);
	});

	it('usa limit=10 come default', () => {
		const board = getMockLeaderboard();
		expect(board.leaderboard).toHaveLength(10);
		expect(board.personalRank.userId).toBe('current-user');
	});
});

describe('getMockGamificationHistory', () => {
	it('restituisce esattamente `limit` settimane con la forma attesa', () => {
		const weeks = getMockGamificationHistory(4);
		expect(weeks).toHaveLength(4);
		expect(weeks[0]).toEqual(
			expect.objectContaining({
				weekStart: expect.any(String),
				weekEnd: expect.any(String),
				weeklyScore: expect.any(Number),
				rank: expect.any(Number)
			})
		);
	});

	it('usa 12 settimane come default', () => {
		expect(getMockGamificationHistory()).toHaveLength(12);
	});
});

describe('costanti esportate', () => {
	it('espone l’ID del mezzo "guida" e i codici promozionali mock', () => {
		expect(MOCK_DRIVING_MOVEMENT_TYPE_ID).toBe(
			'00000001-0000-0000-0000-000000000003'
		);
		expect(MOCK_PROMO_CODES.length).toBeGreaterThan(0);
		expect(MOCK_PROMO_CODES[0]).toHaveProperty('code');
	});
});
