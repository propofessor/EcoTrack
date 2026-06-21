jest.mock('../src/db', () => ({
	db: { auth: { getUser: jest.fn() } },
	supabaseAdmin: { from: jest.fn() }
}));


jest.mock('../src/services/notificationService', () => ({
	notifyUser: jest.fn().mockResolvedValue(undefined),
	notifyMany: jest.fn().mockResolvedValue(undefined)
}));

const {
	getIsoWeekRange,
	resolveDisplayName,
	recalculateDailyScore,
	getWeeklyScoreForUser,
	getCurrentWeekLeaderboard,
	closeWeekAndAwardRewards,
	getUserWeeklyHistory
} = require('../src/services/gamificationService');
const { supabaseAdmin } = require('../src/db');
const {
	notifyUser,
	notifyMany
} = require('../src/services/notificationService');


function chainResolving(result) {
	const chain = {};
	const methods = [
		'select', 'eq', 'gte', 'lte', 'in', 'upsert',
		'insert', 'update', 'single', 'order', 'limit'
	];
	methods.forEach((m) => {
		chain[m] = jest.fn(() => chain);
	});
	chain.then = (resolve, reject) =>
		Promise.resolve(result).then(resolve, reject);
	chain.catch = (reject) => Promise.resolve(result).catch(reject);
	return chain;
}


function queueFrom(...chains) {
	let i = 0;
	supabaseAdmin.from.mockImplementation(
		() => chains[i++] ?? chains[chains.length - 1]
	);
}


describe('getIsoWeekRange (settimana ISO lun-dom)', () => {
	it('Dovrebbe restituire lunedì come weekStart e domenica come weekEnd per una data di mercoledì', () => {
		const result = getIsoWeekRange(new Date('2026-06-17T12:00:00Z'));
		expect(result.weekStart).toBe('2026-06-15');
		expect(result.weekEnd).toBe('2026-06-21');
	});

	it('Dovrebbe gestire correttamente una domenica (che è fine settimana, non inizio)', () => {
		const result = getIsoWeekRange(new Date('2026-06-21T12:00:00Z'));
		expect(result.weekStart).toBe('2026-06-15');
		expect(result.weekEnd).toBe('2026-06-21');
	});

	it('Dovrebbe gestire correttamente un lunedì (inizio settimana)', () => {
		const result = getIsoWeekRange(new Date('2026-06-15T00:00:00Z'));
		expect(result.weekStart).toBe('2026-06-15');
		expect(result.weekEnd).toBe('2026-06-21');
	});

	it('Dovrebbe gestire correttamente il cambio di mese', () => {
		const result = getIsoWeekRange(new Date('2026-06-30T12:00:00Z'));
		expect(result.weekStart).toBe('2026-06-29');
		expect(result.weekEnd).toBe('2026-07-05');
	});
});


describe('resolveDisplayName (privacy classifica, RF11.4)', () => {
	it("Dovrebbe restituire 'Utente EcoTrack' se l'utente è null", () => {
		expect(resolveDisplayName(null)).toBe('Utente EcoTrack');
	});

	it("Dovrebbe restituire 'Utente EcoTrack' se l'utente è undefined", () => {
		expect(resolveDisplayName(undefined)).toBe('Utente EcoTrack');
	});

	it("Dovrebbe restituire 'Utente anonimo' se visibility = anonymous", () => {
		const user = { name: 'Mario Rossi', preferences: { leaderboard_visibility: 'anonymous' } };
		expect(resolveDisplayName(user)).toBe('Utente anonimo');
	});

	it('Dovrebbe restituire il nome completo se visibility = full_name', () => {
		const user = { name: 'Mario Rossi', preferences: { leaderboard_visibility: 'full_name' } };
		expect(resolveDisplayName(user)).toBe('Mario Rossi');
	});

	it("Dovrebbe restituire 'Nome I.' per visibility = nickname con nome composto", () => {
		const user = { name: 'Mario Rossi', preferences: { leaderboard_visibility: 'nickname' } };
		expect(resolveDisplayName(user)).toBe('Mario R.');
	});

	it("Dovrebbe restituire solo il primo nome per visibility = nickname con nome singolo", () => {
		const user = { name: 'Madonna', preferences: { leaderboard_visibility: 'nickname' } };
		expect(resolveDisplayName(user)).toBe('Madonna');
	});

	it("Dovrebbe usare nickname come default se preferences non è impostato", () => {
		const user = { name: 'Luca Neri', preferences: {} };
		expect(resolveDisplayName(user)).toBe('Luca N.');
	});

	it("Dovrebbe restituire 'Utente EcoTrack' se full_name ma name è undefined", () => {
		const user = { name: undefined, preferences: { leaderboard_visibility: 'full_name' } };
		expect(resolveDisplayName(user)).toBe('Utente EcoTrack');
	});
});


describe('recalculateDailyScore (RF11.1 - integrazione DB mockato)', () => {
	beforeEach(() => jest.clearAllMocks());

	function makeSupabaseChain(resolvedValue) {
		const chain = {};
		const methods = ['select', 'eq', 'gte', 'lte', 'upsert', 'single'];
		methods.forEach((m) => {
			chain[m] = jest.fn().mockReturnValue(chain);
		});
		chain.then = (res, rej) => Promise.resolve(resolvedValue).then(res, rej);
		chain.catch = (rej) => Promise.resolve(resolvedValue).catch(rej);
		return chain;
	}

	it('Dovrebbe propagare un errore Supabase nel recupero storico', async () => {
		const errorChain = makeSupabaseChain({
			data: null,
			error: { message: 'DB down' }
		});
		supabaseAdmin.from.mockReturnValue(errorChain);

		const result = await recalculateDailyScore('user-1', '2026-06-18');

		expect(result.error).toBeDefined();
		expect(result.data).toBeNull();
	});

	it('Dovrebbe restituire un punteggio calcolato per una giornata senza dati storici', async () => {

		const historyChain = makeSupabaseChain({ data: [], error: null });
		const upsertChain = makeSupabaseChain({
			data: { grade: 'E', normalized_score: 0, raw_points: 0 },
			error: null
		});

		let callIndex = 0;
		supabaseAdmin.from.mockImplementation(() =>
			callIndex++ === 0 ? historyChain : upsertChain
		);

		const result = await recalculateDailyScore('user-1', '2026-06-18');

		expect(result.error).toBeNull();
		expect(result.data.grade).toBe('E');
	});
});


describe('getWeeklyScoreForUser (RF11.3 - integrazione DB mockato)', () => {
	beforeEach(() => jest.clearAllMocks());

	it('Dovrebbe sommare correttamente i punteggi giornalieri della settimana', async () => {
		const rows = [
			{ normalized_score: '45.5', score_date: '2026-06-16' },
			{ normalized_score: '60.0', score_date: '2026-06-17' },
			{ normalized_score: '30.0', score_date: '2026-06-18' }
		];
		const chain = {
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			gte: jest.fn().mockReturnThis(),
			lte: jest.fn().mockResolvedValue({ data: rows, error: null })
		};
		supabaseAdmin.from.mockReturnValue(chain);

		const result = await getWeeklyScoreForUser('user-1', new Date('2026-06-18'));

		expect(result.error).toBeNull();
		expect(result.data.weeklyScore).toBe(135.5);
		expect(result.data.daysWithActivity).toBe(3);
	});

	it('Dovrebbe restituire 0 se non ci sono dati per la settimana', async () => {
		const chain = {
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			gte: jest.fn().mockReturnThis(),
			lte: jest.fn().mockResolvedValue({ data: [], error: null })
		};
		supabaseAdmin.from.mockReturnValue(chain);

		const result = await getWeeklyScoreForUser('user-1');

		expect(result.error).toBeNull();
		expect(result.data.weeklyScore).toBe(0);
		expect(result.data.daysWithActivity).toBe(0);
	});
});


describe('getCurrentWeekLeaderboard (RF11.4 - integrazione DB mockato)', () => {
	beforeEach(() => jest.clearAllMocks());

	it("Dovrebbe restituire classifica vuota se non ci sono punteggi", async () => {
		const chain = {
			select: jest.fn().mockReturnThis(),
			gte: jest.fn().mockReturnThis(),
			lte: jest.fn().mockResolvedValue({ data: [], error: null })
		};
		supabaseAdmin.from.mockReturnValue(chain);

		const result = await getCurrentWeekLeaderboard({ limit: 10 });

		expect(result.error).toBeNull();
		expect(result.data.podium).toHaveLength(0);
		expect(result.data.leaderboard).toHaveLength(0);
	});

	it('Dovrebbe propagare un errore Supabase nel recupero dei punteggi', async () => {
		queueFrom(chainResolving({ data: null, error: { message: 'DB down' } }));

		const result = await getCurrentWeekLeaderboard({ limit: 10 });

		expect(result.error).toBeDefined();
		expect(result.data).toBeNull();
	});

	it('Dovrebbe propagare un errore Supabase nel recupero degli utenti', async () => {
		queueFrom(
			chainResolving({
				data: [{ user_id: 'u1', normalized_score: '50' }],
				error: null
			}),
			chainResolving({ data: null, error: { message: 'users KO' } })
		);

		const result = await getCurrentWeekLeaderboard({ limit: 10 });

		expect(result.error).toBeDefined();
		expect(result.data).toBeNull();
	});

	it('Dovrebbe costruire podio, classifica e posizione personale con i vicini', async () => {
		queueFrom(
			chainResolving({
				data: [
					{ user_id: 'u1', normalized_score: '90' },
					{ user_id: 'u2', normalized_score: '80' },
					{ user_id: 'u3', normalized_score: '70' }
				],
				error: null
			}),
			chainResolving({
				data: [
					{ id: 'u1', name: 'Anna Bianchi', preferences: {} },
					{ id: 'u2', name: 'Bruno Conti', preferences: {} },
					{ id: 'u3', name: 'Carla Dini', preferences: {} }
				],
				error: null
			})
		);

		const result = await getCurrentWeekLeaderboard({
			limit: 20,
			requestingUserId: 'u2'
		});

		expect(result.error).toBeNull();
		expect(result.data.leaderboard).toHaveLength(3);
		expect(result.data.leaderboard[0].rank).toBe(1);
		expect(result.data.podium).toHaveLength(3);
		expect(result.data.personalRank.userId).toBe('u2');
		expect(result.data.personalRank.rank).toBe(2);

		expect(result.data.personalRank.neighbors).toHaveLength(3);
	});
});


describe('recalculateDailyScore (mappatura movimenti reali)', () => {
	beforeEach(() => jest.clearAllMocks());

	it('Dovrebbe ricostruire le distanze da mezzi emittenti e a emissione zero', async () => {
		const history = [

			{
				co2_kgs: '0.5',
				timestamp_start: '2026-06-18T08:00:00.000Z',
				timestamp_end: '2026-06-18T08:30:00.000Z',
				movement_types: { label: 'driving' }
			},

			{
				co2_kgs: '0.2',
				timestamp_start: '2026-06-18T09:00:00.000Z',
				timestamp_end: '2026-06-18T09:20:00.000Z',
				movement_types: { label: 'transit' }
			},

			{
				co2_kgs: '0',
				timestamp_start: '2026-06-18T18:00:00.000Z',
				timestamp_end: '2026-06-18T18:30:00.000Z',
				movement_types: { label: 'walking' }
			}
		];

		queueFrom(
			chainResolving({ data: history, error: null }),
			chainResolving({
				data: {
					grade: 'B',
					normalized_score: 65.4,
					raw_points: 800,
					total_km: 12,
					co2_saved_kgs: 0.9
				},
				error: null
			})
		);

		const result = await recalculateDailyScore('user-1', '2026-06-18');

		expect(result.error).toBeNull();
		expect(result.data.grade).toBe('B');

		expect(notifyUser).toHaveBeenCalledTimes(1);
	});

	it('Dovrebbe propagare un errore Supabase nel salvataggio (upsert)', async () => {
		queueFrom(
			chainResolving({ data: [], error: null }),
			chainResolving({ data: null, error: { message: 'upsert KO' } })
		);

		const result = await recalculateDailyScore('user-1', '2026-06-18');

		expect(result.error).toBeDefined();
		expect(result.data).toBeNull();
		expect(notifyUser).not.toHaveBeenCalled();
	});
});


describe('getWeeklyScoreForUser (ramo di errore)', () => {
	beforeEach(() => jest.clearAllMocks());

	it('Dovrebbe propagare un errore Supabase', async () => {
		queueFrom(chainResolving({ data: null, error: { message: 'KO' } }));

		const result = await getWeeklyScoreForUser('user-1');

		expect(result.error).toBeDefined();
		expect(result.data).toBeNull();
	});
});


describe('closeWeekAndAwardRewards (chiusura settimana e ricompense)', () => {
	beforeEach(() => jest.clearAllMocks());

	function leaderboardScores() {
		return chainResolving({
			data: [
				{ user_id: 'u1', normalized_score: '90' },
				{ user_id: 'u2', normalized_score: '80' },
				{ user_id: 'u3', normalized_score: '70' },
				{ user_id: 'u4', normalized_score: '60' }
			],
			error: null
		});
	}

	function leaderboardUsers() {
		return chainResolving({
			data: [
				{ id: 'u1', name: 'A A', preferences: {} },
				{ id: 'u2', name: 'B B', preferences: {} },
				{ id: 'u3', name: 'C C', preferences: {} },
				{ id: 'u4', name: 'D D', preferences: {} }
			],
			error: null
		});
	}

	function snapshotRows() {
		return [
			{ id: 's1', user_id: 'u1', rank: 1 },
			{ id: 's2', user_id: 'u2', rank: 2 },
			{ id: 's3', user_id: 'u3', rank: 3 },
			{ id: 's4', user_id: 'u4', rank: 4 }
		];
	}

	it('Dovrebbe propagare un errore dal calcolo della classifica', async () => {
		queueFrom(chainResolving({ data: null, error: { message: 'KO' } }));

		const result = await closeWeekAndAwardRewards(new Date('2026-06-21'));

		expect(result.error).toBeDefined();
		expect(result.data).toBeNull();
	});

	it('Dovrebbe restituire 0 ricompense se la classifica è vuota', async () => {
		queueFrom(chainResolving({ data: [], error: null }));

		const result = await closeWeekAndAwardRewards(new Date('2026-06-21'));

		expect(result.error).toBeNull();
		expect(result.data.rewardsAwarded).toBe(0);
	});

	it('Dovrebbe persistere lo snapshot e assegnare le medaglie ai primi 3', async () => {
		queueFrom(
			leaderboardScores(),
			leaderboardUsers(),
			chainResolving({ data: snapshotRows(), error: null }),
			chainResolving({ data: [], error: null }),
			chainResolving({ data: [{}, {}, {}], error: null })
		);

		const result = await closeWeekAndAwardRewards(new Date('2026-06-21'));

		expect(result.error).toBeNull();
		expect(result.data.rewardsAwarded).toBe(3);

		expect(notifyMany).toHaveBeenCalledTimes(1);
	});

	it('Dovrebbe essere idempotente: 0 ricompense se già assegnate', async () => {
		queueFrom(
			leaderboardScores(),
			leaderboardUsers(),
			chainResolving({ data: snapshotRows(), error: null }),
			chainResolving({ data: [{ id: 'reward-esistente' }], error: null })
		);

		const result = await closeWeekAndAwardRewards(new Date('2026-06-21'));

		expect(result.error).toBeNull();
		expect(result.data.rewardsAwarded).toBe(0);
	});

	it('Dovrebbe propagare un errore nel salvataggio dello snapshot', async () => {
		queueFrom(
			leaderboardScores(),
			leaderboardUsers(),
			chainResolving({ data: null, error: { message: 'snapshot KO' } })
		);

		const result = await closeWeekAndAwardRewards(new Date('2026-06-21'));

		expect(result.error).toBeDefined();
		expect(result.data).toBeNull();
	});

	it("Dovrebbe propagare un errore nell'inserimento delle ricompense", async () => {
		queueFrom(
			leaderboardScores(),
			leaderboardUsers(),
			chainResolving({ data: snapshotRows(), error: null }),
			chainResolving({ data: [], error: null }),
			chainResolving({ data: null, error: { message: 'reward KO' } })
		);

		const result = await closeWeekAndAwardRewards(new Date('2026-06-21'));

		expect(result.error).toBeDefined();
		expect(result.data).toBeNull();
	});
});


describe('getUserWeeklyHistory (storico settimanale personale)', () => {
	beforeEach(() => jest.clearAllMocks());

	it('Dovrebbe restituire lo storico settimanale con le ricompense', async () => {
		queueFrom(
			chainResolving({
				data: [
					{
						week_start: '2026-06-08',
						week_end: '2026-06-14',
						weekly_score: 410,
						rank: 2,
						rewards: [{ reward_label: 'Argento', awarded_at: 'x' }]
					}
				],
				error: null
			})
		);

		const result = await getUserWeeklyHistory('user-1', { limit: 12 });

		expect(result.error).toBeNull();
		expect(result.data).toHaveLength(1);
		expect(result.data[0].rank).toBe(2);
	});

	it('Dovrebbe propagare un errore Supabase', async () => {
		queueFrom(chainResolving({ data: null, error: { message: 'KO' } }));

		const result = await getUserWeeklyHistory('user-1');

		expect(result.error).toBeDefined();
		expect(result.data).toBeNull();
	});
});
