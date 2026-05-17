// __tests__/history.test.js
const request = require('supertest');
const app = require('../src/index'); // Assicurati che il percorso sia corretto
const { db } = require('../src/db'); // Destrutturato per accedere alle spie di controllo (mock)

// Configura l'oggetto globale finto per gestire le chiamate concatenate di Supabase
const mockChain = {
	select: jest.fn().mockReturnThis(),
	eq: jest.fn().mockReturnThis(),
	order: jest.fn().mockReturnThis(),
	insert: jest.fn().mockReturnThis()
};

// 1. MOCKIAMO IL MODULO DB ESPORTANDO L'OGGETTO "db" CHE IL MIDDLEWARE E LE ROTTE SI ASPETTANO
jest.mock('../src/db', () => ({
	db: {
		auth: {
			getUser: jest.fn()
		},
		from: jest.fn(() => mockChain) // Restituisce la catena ad ogni chiamata di .from()
	}
}));

describe("Test del modulo Storico dell'Impronta Ecologica (/api/history - RF10)", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// Reimposta il comportamento di default della catena per prevenire interferenze tra i test
		mockChain.select.mockReturnThis();
		mockChain.eq.mockReturnThis();
		mockChain.order.mockReturnThis();
		mockChain.insert.mockReturnThis();
	});

	const fintoViaggioInput = {
		timestamp_start: '2026-05-17T10:00:00Z',
		timestamp_end: '2026-05-17T10:30:00Z',
		movement_type_id: '550e8400-e29b-41d4-a716-446655440000',
		co2_kgs: 0.0,
		points: 25.5
	};

	// =========================================================================
	// SECTION 1: TEST PER IL RECUPERO DELLO STORICO (GET /api/history)
	// =========================================================================
	describe('GET /api/history - Lettura storico viaggi', () => {
		it("Dovrebbe restituire l'elenco dei viaggi ordinati con successo (200)", async () => {
			db.auth.getUser.mockResolvedValue({
				data: { user: { id: 'utente-ecologico-123' } },
				error: null
			});

			const fintoStoricoDalDb = [
				{
					id: 'uuid-viaggio-1',
					timestamp_start: '2026-05-17T10:00:00Z',
					timestamp_end: '2026-05-17T10:30:00Z',
					co2_kgs: 0.0,
					points: 25.5,
					movement_types: { id: 'uuid-mezzo-1', label: 'bicycling' }
				}
			];

			mockChain.order.mockResolvedValue({
				data: fintoStoricoDalDb,
				error: null
			});

			const risposta = await request(app)
				.get('/api/history')
				.set('Cookie', ['access_token=token_valido']);

			expect(risposta.statusCode).toBe(200);
			expect(risposta.body.message).toBe(
				'Storico recuperato con successo'
			);
			expect(risposta.body.history).toHaveLength(1);
			expect(risposta.body.history[0].movement_types.label).toBe(
				'bicycling'
			);
			expect(mockChain.eq).toHaveBeenCalledWith(
				'user_id',
				'utente-ecologico-123'
			);
		});

		it('Dovrebbe restituire 400 se il database riscontra un errore', async () => {
			db.auth.getUser.mockResolvedValue({
				data: { user: { id: 'utente-1' } },
				error: null
			});
			mockChain.order.mockResolvedValue({
				data: null,
				error: { message: 'Timeout della query' }
			});

			const risposta = await request(app)
				.get('/api/history')
				.set('Cookie', ['access_token=token_valido']);

			expect(risposta.statusCode).toBe(400);
			expect(risposta.body.error).toBe(
				'Impossibile recuperare lo storico dei viaggi'
			);
		});

		it("Dovrebbe rifiutare l'accesso (401) se il cookie di sessione è assente", async () => {
			const risposta = await request(app).get('/api/history');

			expect(risposta.statusCode).toBe(401);
			expect(risposta.body.error).toContain('Accesso negato');
		});
	});

	// =========================================================================
	// SECTION 2: TEST PER IL SALVATAGGIO DI UN VIAGGIO (POST /api/history)
	// =========================================================================
	describe('POST /api/history - Salvataggio nuovo viaggio', () => {
		it('Dovrebbe salvare un viaggio valido nel DB e restituire 201', async () => {
			db.auth.getUser.mockResolvedValue({
				data: { user: { id: 'utente-ecologico-123' } },
				error: null
			});

			const fintoRecordInserito = {
				id: 'nuovo-uuid-creato',
				user_id: 'utente-ecologico-123',
				...fintoViaggioInput
			};
			mockChain.select.mockResolvedValue({
				data: [fintoRecordInserito],
				error: null
			});

			const risposta = await request(app)
				.post('/api/history')
				.set('Cookie', ['access_token=token_valido'])
				.send(fintoViaggioInput);

			expect(risposta.statusCode).toBe(201);
			expect(risposta.body.message).toBe(
				'Viaggio salvato nello storico con successo'
			);
			expect(risposta.body.entry.id).toBe('nuovo-uuid-creato');

			expect(mockChain.insert).toHaveBeenCalledWith([
				{
					user_id: 'utente-ecologico-123',
					...fintoViaggioInput
				}
			]);
		});

		it('Dovrebbe restituire 400 se mancano campi obbligatori richiesti dai vincoli NOT NULL dello schema', async () => {
			db.auth.getUser.mockResolvedValue({
				data: { user: { id: 'utente-1' } },
				error: null
			});

			const payloadIncompleto = {
				timestamp_start: '2026-05-17T10:00:00Z',
				timestamp_end: '2026-05-17T10:30:00Z',
				co2_kgs: 12.5
			};

			const risposta = await request(app)
				.post('/api/history')
				.set('Cookie', ['access_token=token_valido'])
				.send(payloadIncompleto);

			expect(risposta.statusCode).toBe(400);
			expect(risposta.body.error).toContain(
				'Tutti i campi sono obbligatori'
			);
		});

		it("Dovrebbe restituire 400 se Supabase supera un errore o rifiuta l'inserimento", async () => {
			db.auth.getUser.mockResolvedValue({
				data: { user: { id: 'utente-1' } },
				error: null
			});
			mockChain.select.mockResolvedValue({
				data: null,
				error: { message: 'Foreign key constraint violation' }
			});

			const risposta = await request(app)
				.post('/api/history')
				.set('Cookie', ['access_token=token_valido'])
				.send(fintoViaggioInput);

			expect(risposta.statusCode).toBe(400);
			expect(risposta.body.error).toBe(
				'Impossibile salvare il viaggio nello storico'
			);
		});
	});
});
