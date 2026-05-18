// __tests__/maps.test.js
const request = require('supertest');
const { supabaseAdmin } = require('../src/db');
const { calculateEmissions } = require('../src/services/co2Service');

// 1. ISOLIAMO E MOCKIAMO IL DATABASE SUPABASE
const mockChain = {
	select: jest.fn().mockReturnThis(),
	eq: jest.fn().mockReturnThis(),
	order: jest.fn().mockReturnThis(),
	limit: jest.fn().mockReturnThis(),
	single: jest.fn()
};

jest.mock('../src/db', () => ({
	supabaseAdmin: {
		from: jest.fn(() => mockChain),
		auth: {
			getUser: jest.fn()
		}
	}
}));

// 2. MOCKIAMO IL SERVIZIO CO2
jest.mock('../src/services/co2Service', () => ({
	calculateEmissions: jest.fn()
}));

// 3. Mockiamo il middleware di autenticazione alla radice
jest.mock('../src/middleware/authMiddleware', () => {
	return (req, res, next) => {
		req.user = {
			id: 'utente-test-id',
			user_metadata: { plate: 'AB123CD' }
		};
		next();
	};
});

const app = require('../src/index');

describe('Test delle API di Mappe & Calcolo CO2 (/api/maps)', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockChain.select.mockReturnThis();
		mockChain.eq.mockReturnThis();
		mockChain.order.mockReturnThis();
		mockChain.limit.mockReturnThis();
	});

	// ==========================================
	// TEST ESISTENTI: POST /calculate-co2
	// ==========================================
	describe('POST /api/maps/calculate-co2', () => {
		const inputDistanzeValide = {
			distances: {
				walking: 2.0,
				bicycling: 5.0,
				transit: 12.5,
				driving: 20.0
			}
		};

		it("Dovrebbe calcolare le emissioni e restituire l'ID del mezzo corretto (200)", async () => {
			calculateEmissions.mockResolvedValue({
				emissions: {
					walking: 0,
					bicycling: 0,
					transit: 1100,
					driving: 3200
				}
			});

			const fintoUuidMezzo = '11111111-2222-3333-4444-555555555555';

			supabaseAdmin.from.mockReturnValue(mockChain);
			mockChain.single.mockResolvedValue({
				data: { id: fintoUuidMezzo },
				error: null
			});

			const risposta = await request(app)
				.post('/api/maps/calculate-co2')
				.set('Cookie', ['access_token=token_valido'])
				.send(inputDistanzeValide);

			expect(risposta.statusCode).toBe(200);
			expect(risposta.body.message).toBe(
				'Calcolo delle emissioni completato con successo'
			);
			expect(risposta.body.emissions.driving).toBe(3200);
			expect(risposta.body.driving_movement_type_id).toBe(fintoUuidMezzo);
		});

		it("Dovrebbe restituire 400 se l'oggetto delle distanze è mancante nel payload", async () => {
			const risposta = await request(app)
				.post('/api/maps/calculate-co2')
				.set('Cookie', ['access_token=token_valido'])
				.send({});

			expect(risposta.statusCode).toBe(400);
			expect(risposta.body.error).toBe(
				'Fornisci le distanze per il calcolo'
			);
		});
	});
});
