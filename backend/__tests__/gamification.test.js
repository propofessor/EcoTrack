const request = require('supertest');


jest.mock('../src/services/gamificationService', () => ({
	recalculateDailyScore: jest.fn(),
	getWeeklyScoreForUser: jest.fn(),
	getCurrentWeekLeaderboard: jest.fn(),
	getUserWeeklyHistory: jest.fn()
}));


jest.mock('../src/middleware/authMiddleware', () => {
	return (req, res, next) => {
		req.user = { id: 'utente-gamification-456' };
		next();
	};
});

const gamificationService = require('../src/services/gamificationService');
const app = require('../src/index');

describe('Test delle API di Gamification (/api/gamification - RF11)', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});




	describe('GET /api/gamification/daily-score', () => {
		it('Dovrebbe restituire il voto e il punteggio giornaliero (200)', async () => {
			gamificationService.recalculateDailyScore.mockResolvedValue({
				data: {
					grade: 'A',
					normalized_score: 65.5,
					raw_points: 850,
					total_km: 12.3,
					co2_saved_kgs: 0.85
				},
				error: null
			});

			const risposta = await request(app)
				.get('/api/gamification/daily-score')
				.set('Cookie', ['access_token=token_valido']);

			expect(risposta.statusCode).toBe(200);
			expect(risposta.body.score.grade).toBe('A');
			expect(risposta.body.score.normalizedScore).toBe(65.5);
			expect(
				gamificationService.recalculateDailyScore
			).toHaveBeenCalledWith(
				'utente-gamification-456',
				expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
			);
		});

		it('Dovrebbe restituire 500 se il service segnala un errore', async () => {
			gamificationService.recalculateDailyScore.mockResolvedValue({
				data: null,
				error: { message: 'Database down' }
			});

			const risposta = await request(app)
				.get('/api/gamification/daily-score')
				.set('Cookie', ['access_token=token_valido']);

			expect(risposta.statusCode).toBe(500);
			expect(risposta.body.error).toBe(
				'Errore nel calcolo del punteggio giornaliero'
			);
		});
	});




	describe('GET /api/gamification/weekly-score', () => {
		it('Dovrebbe restituire il punteggio settimanale aggregato (200)', async () => {
			gamificationService.getWeeklyScoreForUser.mockResolvedValue({
				data: {
					weekStart: '2026-06-15',
					weekEnd: '2026-06-21',
					weeklyScore: 320.5,
					daysWithActivity: 5
				},
				error: null
			});

			const risposta = await request(app)
				.get('/api/gamification/weekly-score')
				.set('Cookie', ['access_token=token_valido']);

			expect(risposta.statusCode).toBe(200);
			expect(risposta.body.weeklyScore).toBe(320.5);
			expect(risposta.body.daysWithActivity).toBe(5);
		});
	});




	describe('GET /api/gamification/leaderboard', () => {
		it('Dovrebbe restituire podio, classifica e posizione personale (200)', async () => {
			gamificationService.getCurrentWeekLeaderboard.mockResolvedValue({
				data: {
					weekStart: '2026-06-15',
					weekEnd: '2026-06-21',
					podium: [
						{
							userId: 'u1',
							displayName: 'Mario R.',
							weeklyScore: 500,
							rank: 1
						}
					],
					leaderboard: [
						{
							userId: 'u1',
							displayName: 'Mario R.',
							weeklyScore: 500,
							rank: 1
						}
					],
					personalRank: {
						userId: 'utente-gamification-456',
						rank: 7,
						weeklyScore: 200,
						neighbors: []
					}
				},
				error: null
			});

			const risposta = await request(app)
				.get('/api/gamification/leaderboard')
				.set('Cookie', ['access_token=token_valido']);

			expect(risposta.statusCode).toBe(200);
			expect(risposta.body.podium).toHaveLength(1);
			expect(risposta.body.personalRank.rank).toBe(7);
		});

		it('Dovrebbe limitare il parametro limit ai soli valori 10 o 20 (RF11.4)', async () => {
			gamificationService.getCurrentWeekLeaderboard.mockResolvedValue({
				data: {
					weekStart: 'x',
					weekEnd: 'y',
					podium: [],
					leaderboard: [],
					personalRank: null
				},
				error: null
			});

			await request(app)
				.get('/api/gamification/leaderboard?limit=999')
				.set('Cookie', ['access_token=token_valido']);

			expect(
				gamificationService.getCurrentWeekLeaderboard
			).toHaveBeenCalledWith(expect.objectContaining({ limit: 10 }));
		});

		it('Dovrebbe accettare limit=20 come valore esplicito valido', async () => {
			gamificationService.getCurrentWeekLeaderboard.mockResolvedValue({
				data: {
					weekStart: 'x',
					weekEnd: 'y',
					podium: [],
					leaderboard: [],
					personalRank: null
				},
				error: null
			});

			await request(app)
				.get('/api/gamification/leaderboard?limit=20')
				.set('Cookie', ['access_token=token_valido']);

			expect(
				gamificationService.getCurrentWeekLeaderboard
			).toHaveBeenCalledWith(expect.objectContaining({ limit: 20 }));
		});
	});




	describe('GET /api/gamification/history', () => {
		it('Dovrebbe restituire lo storico settimanale personale (200)', async () => {
			gamificationService.getUserWeeklyHistory.mockResolvedValue({
				data: [
					{
						week_start: '2026-06-08',
						week_end: '2026-06-14',
						weekly_score: 410,
						rank: 2,
						rewards: [
							{
								reward_label: 'Medaglia Argento Settimanale 🥈',
								awarded_at: '2026-06-14T23:55:00Z'
							}
						]
					}
				],
				error: null
			});

			const risposta = await request(app)
				.get('/api/gamification/history')
				.set('Cookie', ['access_token=token_valido']);

			expect(risposta.statusCode).toBe(200);
			expect(risposta.body.weeklyHistory).toHaveLength(1);
			expect(
				risposta.body.weeklyHistory[0].rewards[0].reward_label
			).toContain('Argento');
		});

		it('Dovrebbe restituire 500 se il service fallisce', async () => {
			gamificationService.getUserWeeklyHistory.mockResolvedValue({
				data: null,
				error: { message: 'Errore controllato' }
			});

			const risposta = await request(app)
				.get('/api/gamification/history')
				.set('Cookie', ['access_token=token_valido']);

			expect(risposta.statusCode).toBe(500);
			expect(risposta.body.error).toBe(
				'Errore nel recupero dello storico delle performance'
			);
		});
	});
});
