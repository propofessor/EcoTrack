const request = require('supertest');


jest.mock('../src/db', () => ({
	db: { auth: { getUser: jest.fn() } },
	supabaseAdmin: { from: jest.fn() }
}));


jest.mock(
	'../src/middleware/apiKeyMiddleware',
	() => (req, res, next) => next()
);

const { supabaseAdmin } = require('../src/db');
const app = require('../src/index');


function makeChain(resolvedValue) {
	const chain = {
		select: jest.fn().mockReturnThis(),
		order: jest.fn().mockReturnThis(),
		range: jest.fn().mockReturnThis(),
		gte: jest.fn().mockReturnThis(),
		lte: jest.fn().mockReturnThis(),
		limit: jest.fn().mockReturnThis()
	};




	Object.keys(chain).forEach((k) => {
		chain[k].mockReturnValue({
			...chain,
			then: (res, rej) => Promise.resolve(resolvedValue).then(res, rej),
			catch: (rej) => Promise.resolve(resolvedValue).catch(rej)
		});
	});

	chain.then = (res, rej) => Promise.resolve(resolvedValue).then(res, rej);
	chain.catch = (rej) => Promise.resolve(resolvedValue).catch(rej);
	return chain;
}

describe('Test delle rotte della Dashboard Admin (/api/dashboard - RF3)', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});




	describe('GET /api/dashboard/co2-stats', () => {
		it('Dovrebbe restituire statistiche CO2 con paginazione (200)', async () => {
			const fakeData = [
				{
					co2_kgs: 1.2,
					points: 100,
					timestamp_start: '2026-06-18T08:00:00Z',
					movement_types: { label: 'driving' }
				}
			];
			supabaseAdmin.from.mockReturnValue(
				makeChain({ data: fakeData, error: null })
			);

			const risposta = await request(app).get('/api/dashboard/co2-stats');

			expect(risposta.statusCode).toBe(200);
			expect(risposta.body.data).toHaveLength(1);
			expect(risposta.body.count).toBe(1);


			expect(risposta.body.data[0].movement_types.label).toBe('Macchina');
		});

		it('Dovrebbe applicare i filtri date_start e date_end alla query', async () => {
			const chain = makeChain({ data: [], error: null });
			supabaseAdmin.from.mockReturnValue(chain);

			await request(app).get(
				'/api/dashboard/co2-stats?date_start=2026-06-01&date_end=2026-06-30'
			);


			const gteCall = chain.gte.mock.calls[0];
			const lteCall = chain.lte.mock.calls[0];
			expect(gteCall).toEqual(['timestamp_start', '2026-06-01']);
			expect(lteCall).toEqual(['timestamp_start', '2026-06-30']);
		});

		it('Dovrebbe restituire 500 se la query al database fallisce', async () => {
			supabaseAdmin.from.mockReturnValue(
				makeChain({ data: null, error: { message: 'DB timeout' } })
			);

			const risposta = await request(app).get('/api/dashboard/co2-stats');

			expect(risposta.statusCode).toBe(500);
			expect(risposta.body.error).toBe('Errore query database');
		});
	});




	describe('GET /api/dashboard/co2-stats.csv', () => {
		it('Dovrebbe restituire un file CSV con Content-Type text/csv (200)', async () => {
			const fakeData = [
				{
					co2_kgs: 0.5,
					points: 50,
					timestamp_start: '2026-06-18T08:00:00Z'
				},
				{
					co2_kgs: 1.2,
					points: 120,
					timestamp_start: '2026-06-17T09:00:00Z'
				}
			];
			supabaseAdmin.from.mockReturnValue(
				makeChain({ data: fakeData, error: null })
			);

			const risposta = await request(app).get(
				'/api/dashboard/co2-stats.csv'
			);

			expect(risposta.statusCode).toBe(200);
			expect(risposta.headers['content-type']).toContain('text/csv');
			expect(risposta.text).toContain('timestamp_start,co2_kgs,points');
			expect(risposta.text).toContain('2026-06-18T08:00:00Z,0.5,50');
		});

		it('Dovrebbe restituire 500 se la query al database fallisce (CSV)', async () => {
			supabaseAdmin.from.mockReturnValue(
				makeChain({ data: null, error: { message: 'Error' } })
			);

			const risposta = await request(app).get(
				'/api/dashboard/co2-stats.csv'
			);

			expect(risposta.statusCode).toBe(500);
		});
	});




	describe('GET /api/dashboard/leaderboard', () => {
		it('Dovrebbe restituire la classifica dei viaggi per punti (200)', async () => {
			const fakeData = [
				{
					user_id: 'u1',
					points: 500,
					timestamp_start: '2026-06-18T08:00:00Z'
				},
				{
					user_id: 'u2',
					points: 300,
					timestamp_start: '2026-06-17T09:00:00Z'
				}
			];
			supabaseAdmin.from.mockReturnValue(
				makeChain({ data: fakeData, error: null })
			);

			const risposta = await request(app).get(
				'/api/dashboard/leaderboard'
			);

			expect(risposta.statusCode).toBe(200);
			expect(risposta.body.data).toHaveLength(2);
		});

		it('Dovrebbe restituire 500 se il database fallisce (leaderboard)', async () => {
			supabaseAdmin.from.mockReturnValue(
				makeChain({ data: null, error: { message: 'Error' } })
			);

			const risposta = await request(app).get(
				'/api/dashboard/leaderboard'
			);

			expect(risposta.statusCode).toBe(500);
		});
	});
});
