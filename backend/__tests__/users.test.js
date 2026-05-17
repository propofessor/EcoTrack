// users.test.js
const request = require('supertest');
const app = require('../src/index'); // Assicurati che il percorso verso il tuo file principale Express sia corretto
const { db, supabaseAdmin } = require('../src/db');

// 1. CREIAMO LE CONTROFIGURE PER IL MIDDLEWARE E PER L'ADMIN
jest.mock('../src/db', () => ({
	db: {
		auth: {
			// Questo serve al nostro middleware (il "buttafuori")
			getUser: jest.fn()
		}
	},
	supabaseAdmin: {
		auth: {
			admin: {
				// Questi servono per le operazioni sul profilo
				updateUserById: jest.fn(),
				deleteUser: jest.fn()
			}
		}
	}
}));

describe('Test delle rotte del Profilo Utente (/api/users)', () => {
	// Prima di ogni test, ripuliamo le controfigure
	beforeEach(() => {
		jest.clearAllMocks();
	});

	// Utente fittizio che useremo nei test
	const fintoUtente = {
		id: 'utente-123',
		email: 'mario.rossi@example.com',
		user_metadata: {
			name: 'Mario Rossi',
			plate: 'AB123CD'
		}
	};

	// ==========================================
	// TEST DEL MIDDLEWARE (Accesso Negato)
	// ==========================================
	describe('Sicurezza delle rotte (Middleware)', () => {
		it('Dovrebbe restituire 401 se non viene fornito nessun token nei cookie', async () => {
			// Proviamo ad accedere alla rotta senza inviare nessun cookie
			const risposta = await request(app).get('/api/users/me');

			expect(risposta.statusCode).toBe(401);
			expect(risposta.body.error).toContain('Accesso negato');
			// Verifichiamo che il database non sia stato interpellato
			expect(db.auth.getUser).not.toHaveBeenCalled();
		});

		it('Dovrebbe restituire 401 se il token non è valido o è scaduto', async () => {
			// Istruiamo la controfigura a simulare un token scaduto
			db.auth.getUser.mockResolvedValue({
				data: { user: null },
				error: { message: 'Token expired' }
			});

			const risposta = await request(app)
				.get('/api/users/me')
				.set('Cookie', ['access_token=token_scaduto']); // Inviamo un cookie finto

			expect(risposta.statusCode).toBe(401);
			expect(risposta.body.error).toContain('Sessione scaduta');
		});
	});

	// ==========================================
	// TEST: LEGGI IL PROFILO (GET /me)
	// ==========================================
	describe('GET /api/users/me', () => {
		it("Dovrebbe restituire i dati dell'utente se il token è valido", async () => {
			// Il buttafuori chiede chi è l'utente, e noi gli diamo il nostro fintoUtente
			db.auth.getUser.mockResolvedValue({
				data: { user: fintoUtente },
				error: null
			});

			const risposta = await request(app)
				.get('/api/users/me')
				.set('Cookie', ['access_token=token_valido']);

			expect(risposta.statusCode).toBe(200);
			// Controlliamo che il server ci abbia risposto con i dati corretti
			expect(risposta.body.user.email).toBe('mario.rossi@example.com');
			expect(risposta.body.profile.plate).toBe('AB123CD');
		});
	});

	// ==========================================
	// TEST: AGGIORNA IL PROFILO (PUT /me)
	// ==========================================
	describe('PUT /api/users/me', () => {
		it("Dovrebbe aggiornare la targa dell'utente e restituire 200", async () => {
			// 1. Passiamo il controllo del middleware
			db.auth.getUser.mockResolvedValue({
				data: { user: fintoUtente },
				error: null
			});

			// 2. Simuliamo il successo dell'aggiornamento tramite l'Admin
			supabaseAdmin.auth.admin.updateUserById.mockResolvedValue({
				data: {
					user: {
						...fintoUtente,
						user_metadata: { plate: 'NUOVA999' }
					}
				},
				error: null
			});

			const risposta = await request(app)
				.put('/api/users/me')
				.set('Cookie', ['access_token=token_valido'])
				.send({ plate: 'NUOVA999' }); // I dati che stiamo inviando nel body

			expect(risposta.statusCode).toBe(200);
			expect(risposta.body.message).toBe(
				'Profilo aggiornato con successo'
			);

			// Verifichiamo che l'Admin sia stato chiamato con l'ID corretto e i nuovi dati
			expect(
				supabaseAdmin.auth.admin.updateUserById
			).toHaveBeenCalledWith('utente-123', {
				user_metadata: { plate: 'NUOVA999' }
			});
		});
	});

	// ==========================================
	// TEST: ELIMINA ACCOUNT (DELETE /me)
	// ==========================================
	describe('DELETE /api/users/me', () => {
		it("Dovrebbe eliminare l'utente, pulire i cookie e restituire 200", async () => {
			// 1. Passiamo il controllo del middleware
			db.auth.getUser.mockResolvedValue({
				data: { user: fintoUtente },
				error: null
			});

			// 2. Simuliamo la cancellazione avvenuta con successo
			supabaseAdmin.auth.admin.deleteUser.mockResolvedValue({
				error: null
			});

			const risposta = await request(app)
				.delete('/api/users/me')
				.set('Cookie', ['access_token=token_valido']);

			expect(risposta.statusCode).toBe(200);
			expect(risposta.body.message).toContain(
				'Account eliminato definitivamente'
			);

			// Verifichiamo che l'Admin abbia cancellato l'utente giusto
			expect(supabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith(
				'utente-123'
			);

			// Verifichiamo che Express abbia inviato l'istruzione di cancellare i cookie
			const setCookieHeaders = risposta.headers['set-cookie'];
			expect(setCookieHeaders).toBeDefined();
			// Controlliamo che i cookie access_token e refresh_token siano stati svuotati
			expect(
				setCookieHeaders.some((c) => c.includes('access_token=;'))
			).toBe(true);
		});
	});
});
