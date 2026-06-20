// __tests__/gamification.extra.test.js
// Copertura dei rami di errore/catch (500) delle rotte di gamification
// non coperti da gamification.test.js (che testa gli happy path).

const request = require('supertest');

jest.mock('../src/services/gamificationService', () => ({
	recalculateDailyScore: jest.fn(),
	getWeeklyScoreForUser: jest.fn(),
	getCurrentWeekLeaderboard: jest.fn(),
	getUserWeeklyHistory: jest.fn()
}));

jest.mock('../src/middleware/authMiddleware', () => {
	return (req, res, next) => {
		req.user = { id: 'utente-test' };
		next();
	};
});

const gamificationService = require('../src/services/gamificationService');
const app = require('../src/index');

const COOKIE = ['access_token=token_valido'];

let errSpy;
beforeEach(() => {
	jest.clearAllMocks();
	errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => errSpy.mockRestore());

describe('GET /api/gamification/daily-score (catch)', () => {
	it('restituisce 500 se il service solleva un’eccezione', async () => {
		gamificationService.recalculateDailyScore.mockRejectedValue(
			new Error('crash')
		);
		const res = await request(app)
			.get('/api/gamification/daily-score')
			.set('Cookie', COOKIE);
		expect(res.statusCode).toBe(500);
		expect(res.body.error).toBe('Errore interno del server');
	});
});

describe('GET /api/gamification/weekly-score (errori)', () => {
	it('restituisce 500 se il service segnala un errore controllato', async () => {
		gamificationService.getWeeklyScoreForUser.mockResolvedValue({
			data: null,
			error: { message: 'KO' }
		});
		const res = await request(app)
			.get('/api/gamification/weekly-score')
			.set('Cookie', COOKIE);
		expect(res.statusCode).toBe(500);
		expect(res.body.error).toBe('Errore nel calcolo del punteggio settimanale');
	});

	it('restituisce 500 se il service solleva un’eccezione', async () => {
		gamificationService.getWeeklyScoreForUser.mockRejectedValue(
			new Error('crash')
		);
		const res = await request(app)
			.get('/api/gamification/weekly-score')
			.set('Cookie', COOKIE);
		expect(res.statusCode).toBe(500);
		expect(res.body.error).toBe('Errore interno del server');
	});
});

describe('GET /api/gamification/leaderboard (errori)', () => {
	it('restituisce 500 se il service segnala un errore controllato', async () => {
		gamificationService.getCurrentWeekLeaderboard.mockResolvedValue({
			data: null,
			error: { message: 'KO' }
		});
		const res = await request(app)
			.get('/api/gamification/leaderboard')
			.set('Cookie', COOKIE);
		expect(res.statusCode).toBe(500);
		expect(res.body.error).toBe('Errore nel recupero della classifica');
	});

	it('restituisce 500 se il service solleva un’eccezione', async () => {
		gamificationService.getCurrentWeekLeaderboard.mockRejectedValue(
			new Error('crash')
		);
		const res = await request(app)
			.get('/api/gamification/leaderboard')
			.set('Cookie', COOKIE);
		expect(res.statusCode).toBe(500);
		expect(res.body.error).toBe('Errore interno del server');
	});
});

describe('GET /api/gamification/history (catch)', () => {
	it('restituisce 500 se il service solleva un’eccezione', async () => {
		gamificationService.getUserWeeklyHistory.mockRejectedValue(
			new Error('crash')
		);
		const res = await request(app)
			.get('/api/gamification/history')
			.set('Cookie', COOKIE);
		expect(res.statusCode).toBe(500);
		expect(res.body.error).toBe('Errore interno del server');
	});
});
