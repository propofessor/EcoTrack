// __tests__/history.test.js
const request = require('supertest');

// Configura l'oggetto globale finto per gestire le chiamate concatenate di Supabase
const mockChain = {
	select: jest.fn().mockReturnThis(),
	eq: jest.fn().mockReturnThis(),
	order: jest.fn().mockReturnThis(),
	insert: jest.fn().mockReturnThis()
};

// 1. MOCKIAMO IL MODULO DB ESPORTANDO SIA "db" CHE "supabaseAdmin"
// Questo risolve il conflitto di naming tra test, middleware e rotte.
const mockDb = {
	auth: {
		getUser: jest.fn()
	},
	from: jest.fn(() => mockChain)
};

jest.mock('../src/db', () => ({
	db: mockDb,
	supabaseAdmin: mockDb // <--- FONDAMENTALE: history.js usa questo!
}));

// 2. MOCKIAMO IL MIDDLEWARE DI AUTENTICAZIONE ALLA RADICE
// Taglia fuori i controlli reali dei cookie e inietta direttamente req.user
jest.mock('../src/middleware/authMiddleware', () => {
	return (req, res, next) => {
		req.user = {
			id: 'utente-ecologico-123'
		};
		next();
	};
});

// 3. MOCKIAMO IL SERVICE DI GAMIFICATION per evitare che il ricalcolo
// asincrono "best-effort" dopo il POST faccia query sullo stesso mock chain
jest.mock('../src/services/gamificationService', () => ({
	recalculateDailyScore: jest
		.fn()
		.mockResolvedValue({ data: null, error: null })
}));

// Importiamo l'app SOLO DOPO aver configurato i mock
const app = require('../src/index');

describe("Test del modulo Storico dell'Impronta Ecologica (/api/history - RF10)", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// Reimposta la catena per i metodi fluent di Supabase
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

			// L'ultimo metodo della catena (order) deve risolvere la promessa con i dati
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
			// L'etichetta del mezzo deve essere normalizzata in italiano canonico
			// (es. il valore 'bicycling' del DB diventa 'Bicicletta').
			expect(risposta.body.history[0].movement_types.label).toBe(
				'Bicicletta'
			);
			expect(mockChain.eq).toHaveBeenCalledWith(
				'user_id',
				'utente-ecologico-123'
			);
		});

		it('Dovrebbe restituire 500 se il database riscontra un errore', async () => {
			mockChain.order.mockResolvedValue({
				data: null,
				error: { message: 'Timeout della query' }
			});

			const risposta = await request(app)
				.get('/api/history')
				.set('Cookie', ['access_token=token_valido']);

			expect(risposta.statusCode).toBe(500);
			expect(risposta.body.error).toBe(
				'Impossibile recuperare lo storico dei viaggi'
			);
		});
	});

	// =========================================================================
	// SECTION 2: TEST PER IL SALVATAGGIO DI UN VIAGGIO (POST /api/history)
	// =========================================================================
	describe('POST /api/history - Salvataggio nuovo viaggio', () => {
		it('Dovrebbe salvare un viaggio valido nel DB e restituire 201', async () => {
			const fintoRecordInserito = {
				id: 'nuovo-uuid-creato',
				user_id: 'utente-ecologico-123',
				...fintoViaggioInput
			};

			// Nella rotta POST, l'ultimo metodo eseguito è .select() dopo l'insert
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

		it("Dovrebbe restituire 500 se Supabase supera un errore o rifiuta l'inserimento", async () => {
			mockChain.select.mockResolvedValue({
				data: null,
				error: { message: 'Foreign key constraint violation' }
			});

			const risposta = await request(app)
				.post('/api/history')
				.set('Cookie', ['access_token=token_valido'])
				.send(fintoViaggioInput);

			expect(risposta.statusCode).toBe(500);
			expect(risposta.body.error).toBe(
				'Impossibile salvare il viaggio nello storico'
			);
		});
	});
});
