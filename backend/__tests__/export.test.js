// __tests__/export.test.js
const request = require('supertest');

// Creiamo due funzioni stub separate per tracciare le tabelle in modo indipendente
const mockHistoryFrom = jest.fn();
const mockPromoFrom = jest.fn();

// Mock di Supabase: intercettiamo il metodo .from() e smistiamo la catena
jest.mock('../src/db', () => ({
	supabaseAdmin: {
		from: jest.fn((tabella) => {
			if (tabella === 'history') return mockHistoryFrom();
			if (tabella === 'promotional_codes') return mockPromoFrom();
		}),
		auth: { getUser: jest.fn() }
	}
}));

// Mock del middleware di autenticazione
jest.mock('../src/middleware/authMiddleware', () => {
	return (req, res, next) => {
		req.user = {
			id: 'utente-mobile-uuid',
			name: 'Mario Rossi'
		};
		next();
	};
});

const app = require('../src/index');

describe('Test delle API di Esportazione Dati (/api/export)', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('GET /api/export/user-data', () => {
		it("Dovrebbe esportare correttamente lo storico e i premi dell'utente loggato", async () => {
			// Configura la catena fluente per la tabella history
			mockHistoryFrom.mockReturnValue({
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				order: jest.fn().mockResolvedValue({
					data: [
						{ id: 'trip-1', co2_kgs: 2.5, points: 10 },
						{ id: 'trip-2', co2_kgs: 0.0, points: 25 }
					],
					error: null
				})
			});

			// Configura la catena fluente per la tabella promotional_codes
			mockPromoFrom.mockReturnValue({
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockResolvedValue({
					data: [{ id: 'promo-1', code: '1111-2222' }],
					error: null
				})
			});

			const risposta = await request(app)
				.get('/api/export/user-data')
				.set('Cookie', ['access_token=token_valido']);

			expect(risposta.statusCode).toBe(200);
			expect(risposta.body.success).toBe(true);
			expect(risposta.body.user.id).toBe('utente-mobile-uuid');
			expect(risposta.body.stats.totalTrips).toBe(2);
			expect(risposta.body.stats.totalPointsEarned).toBe(35);
			expect(risposta.body.history).toHaveLength(2);
			expect(risposta.body.rewards).toHaveLength(1);
		});

		it('Dovrebbe restituire 500 se la query sullo storico fallisce', async () => {
			// Forziamo il fallimento della tabella history ritornando l'error
			mockHistoryFrom.mockReturnValue({
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				order: jest.fn().mockResolvedValue({
					data: null,
					error: { message: 'Errore controllato del database' }
				})
			});

			// I premi rispondono normalmente vuoti
			mockPromoFrom.mockReturnValue({
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockResolvedValue({ data: [], error: null })
			});

			const risposta = await request(app)
				.get('/api/export/user-data')
				.set('Cookie', ['access_token=token_valido']);

			expect(risposta.statusCode).toBe(500);
			expect(risposta.body.error).toBe(
				'Errore nel recupero dei dati storici'
			);
		});
	});
});
