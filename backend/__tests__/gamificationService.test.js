// __tests__/gamificationService.test.js
// Unit tests for pure / stateless helpers in gamificationService.
// Async functions that hit Supabase are mocked at the DB level.

jest.mock('../src/db', () => ({
	db: { auth: { getUser: jest.fn() } },
	supabaseAdmin: { from: jest.fn() }
}));

const {
	getIsoWeekRange,
	resolveDisplayName,
	recalculateDailyScore,
	getWeeklyScoreForUser,
	getCurrentWeekLeaderboard,
	closeWeekAndAwardRewards
} = require('../src/services/gamificationService');
const { supabaseAdmin } = require('../src/db');

// ============================================================
// getIsoWeekRange
// ============================================================
describe('getIsoWeekRange (settimana ISO lun-dom)', () => {
	it('Dovrebbe restituire lunedì come weekStart e domenica come weekEnd per una data di mercoledì', () => {
		const result = getIsoWeekRange(new Date('2026-06-17T12:00:00Z')); // mercoledì
		expect(result.weekStart).toBe('2026-06-15'); // lunedì
		expect(result.weekEnd).toBe('2026-06-21'); // domenica
	});

	it('Dovrebbe gestire correttamente una domenica (che è fine settimana, non inizio)', () => {
		const result = getIsoWeekRange(new Date('2026-06-21T12:00:00Z')); // domenica
		expect(result.weekStart).toBe('2026-06-15');
		expect(result.weekEnd).toBe('2026-06-21');
	});

	it('Dovrebbe gestire correttamente un lunedì (inizio settimana)', () => {
		const result = getIsoWeekRange(new Date('2026-06-15T00:00:00Z')); // lunedì
		expect(result.weekStart).toBe('2026-06-15');
		expect(result.weekEnd).toBe('2026-06-21');
	});

	it('Dovrebbe gestire correttamente il cambio di mese', () => {
		const result = getIsoWeekRange(new Date('2026-06-30T12:00:00Z')); // martedì
		expect(result.weekStart).toBe('2026-06-29'); // lunedì
		expect(result.weekEnd).toBe('2026-07-05'); // domenica
	});
});

// ============================================================
// resolveDisplayName
// ============================================================
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

// ============================================================
// recalculateDailyScore - mocked DB
// ============================================================
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
		// history query returns empty array; upsert returns a score row
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

// ============================================================
// getWeeklyScoreForUser - mocked DB
// ============================================================
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

// ============================================================
// getCurrentWeekLeaderboard - mocked DB
// ============================================================
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
});
