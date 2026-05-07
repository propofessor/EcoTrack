// auth.test.js
const request = require('supertest');
const app = require('../src/index');
const db = require('../src/db'); // Importiamo il vero client per poterlo "sostituire"

// 1. CREIAMO LA CONTROFIGURA (MOCK)
// Diciamo a Jest: "Sostituisci il vero supabaseClient con questo oggetto finto".
// jest.fn() crea una funzione "spia" che possiamo manipolare a nostro piacimento.
jest.mock('../src/db', () => ({
	auth: {
		signUp: jest.fn(),
		signInWithPassword: jest.fn(),
		getUser: jest.fn(),
		signOut: jest.fn(),
		refreshSession: jest.fn()
	},
	from: jest.fn()
}));

describe('Test delle rotte di Autenticazione', () => {
	// Prima di ogni test, "puliamo" la memoria della nostra controfigura
	beforeEach(() => {
		jest.clearAllMocks();
	});

	// --- CASO 1: SUCCESSO (Happy Path) ---
	it('Dovrebbe registrare un utente e restituire 201 (Senza toccare il DB reale)', async () => {
		// Istruiamo la controfigura: "Quando vieni chiamata, fai finta che sia andato tutto bene"
		db.auth.signUp.mockResolvedValue({
			data: {
				session: {
					access_token: 'finto_access_token',
					refresh_token: 'finto_refresh_token'
				}
			},
			error: null // Nessun errore!
		});

		const nuovoUtente = {
			email: 'test_mock@esempio.com',
			password: 'PasswordSicura123!',
			name: 'Luigi Verdi'
		};

		const risposta = await request(app)
			.post('/api/auth/register')
			.send(nuovoUtente);

		expect(risposta.statusCode).toBe(201);
		expect(risposta.body.message).toBe('Utente creato con successo');
		expect(risposta.headers['set-cookie']).toBeDefined();

		// Verifichiamo che la nostra API abbia effettivamente chiamato la "controfigura"
		expect(db.auth.signUp).toHaveBeenCalledTimes(1);
	});

	// --- CASO 2: ERRORE (Utente già esistente) ---
	it('Dovrebbe restituire 400 se Supabase segnala un errore (es. email già in uso)', async () => {
		// Istruiamo la controfigura: "Questa volta fai finta che l'email esista già"
		db.auth.signUp.mockResolvedValue({
			data: { session: null },
			error: { message: 'User already registered' } // Errore finto
		});

		const utenteEsistente = {
			email: 'esistente@esempio.com',
			password: 'PasswordSicura123!',
			name: 'Mario Rossi'
		};

		const risposta = await request(app)
			.post('/api/auth/register')
			.send(utenteEsistente);

		// Ci aspettiamo che la nostra API gestisca l'errore e restituisca 400
		expect(risposta.statusCode).toBe(400);
		expect(risposta.body.error).toBe('User already registered');
	});

	// --- CASO 3: ERRORE (Internal Server Error) ---
	it("Dovrebbe restituire 500 se c'è un errore imprevisto (es. problema di connessione)", async () => {
		// Istruiamo la controfigura: "Questa volta fai finta che ci sia un errore imprevisto"
		db.auth.signUp.mockRejectedValue(
			new Error('Database connection failed')
		);

		const nuovoUtente = {
			email: 'test_mock@esempio.com',
			password: 'PasswordSicura123!',
			name: 'Luigi Verdi'
		};

		const risposta = await request(app).post('/api/auth/register').send({
			nuovoUtente
		});
		expect(risposta.statusCode).toBe(500);
		expect(risposta.body.error).toBe('Errore interno del server');
	});

	// --- NUOVO BLOCCO PER I TEST DI LOGIN ---
	describe('Test delle rotte di Login', () => {
		beforeEach(() => {
			jest.clearAllMocks(); // Puliamo la memoria della controfigura prima di ogni test
		});

		// --- CASO 1: SUCCESSO (200) ---
		it('Dovrebbe effettuare il login e restituire 200', async () => {
			// Istruiamo la controfigura per un login di successo
			db.auth.signInWithPassword.mockResolvedValue({
				data: {
					session: {
						access_token: 'finto_access_token_login',
						refresh_token: 'finto_refresh_token_login'
					}
				},
				error: null
			});

			const credenziali = {
				email: 'test_login@esempio.com',
				password: 'PasswordCorretta123!'
			};

			const risposta = await request(app)
				.post('/api/auth/login')
				.send(credenziali);

			expect(risposta.statusCode).toBe(200);
			expect(risposta.body.message).toBe('Login effettuato con successo');
			expect(risposta.headers['set-cookie']).toBeDefined(); // Verifica che i cookie siano impostati
		});

		// --- CASO 2: CREDENZIALI ERRATE (401) ---
		it('Dovrebbe restituire 401 per email o password errate', async () => {
			// Istruiamo la controfigura per simulare un errore di credenziali
			db.auth.signInWithPassword.mockResolvedValue({
				data: { session: null },
				error: { message: 'Invalid login credentials' }
			});

			const credenzialiSbagliate = {
				email: 'sbagliata@esempio.com',
				password: 'password_sbagliata'
			};

			const risposta = await request(app)
				.post('/api/auth/login')
				.send(credenzialiSbagliate);

			expect(risposta.statusCode).toBe(401);
			expect(risposta.body.error).toBe('Credenziali non valide');
		});

		// --- CASO 3: ERRORE INTERNO DEL SERVER (500) ---
		it('Dovrebbe restituire 500 in caso di errore di sistema (es. DB irraggiungibile)', async () => {
			// Istruiamo la controfigura a lanciare un'eccezione grave
			db.auth.signInWithPassword.mockRejectedValue(
				new Error('Connessione al DB caduta')
			);

			const credenziali = {
				email: 'sfortunato@esempio.com',
				password: 'Password123!'
			};

			const risposta = await request(app)
				.post('/api/auth/login')
				.send(credenziali);

			expect(risposta.statusCode).toBe(500);
			expect(risposta.body.error).toBe('Errore interno del server');
		});
	});
	// --- NUOVO BLOCCO PER I TEST DEL PROFILO UTENTE ---
	describe('Test della rotta /auth/me', () => {
		beforeEach(() => {
			jest.clearAllMocks();
		});

		// --- CASO 1: MANCA IL COOKIE (401) ---
		it('Dovrebbe restituire 401 se il cookie access_token manca', async () => {
			// Facciamo la richiesta SENZA inviare nessun cookie
			const risposta = await request(app).get('/api/auth/me');

			expect(risposta.statusCode).toBe(401);
			expect(risposta.body.error).toBe(
				'Non autorizzato: Access Token mancante'
			);

			// Verifichiamo che il DB non sia stato nemmeno interpellato
			expect(db.auth.getUser).not.toHaveBeenCalled();
		});

		// --- CASO 2: TOKEN NON VALIDO (401) ---
		it('Dovrebbe restituire 401 se il token è falso o scaduto', async () => {
			// Istruiamo la controfigura a rifiutare il token
			db.auth.getUser.mockResolvedValue({
				data: { user: null },
				error: { message: 'Invalid token' }
			});

			// Usiamo .set('Cookie', ...) per simulare un browser che invia il cookie
			const risposta = await request(app)
				.get('/api/auth/me')
				.set('Cookie', ['access_token=token_falso']);

			expect(risposta.statusCode).toBe(401);
			expect(risposta.body.error).toBe(
				'Non autorizzato: Token non valido o scaduto'
			);
		});

		// --- CASO 3: SUCCESSO (200) ---
		it('Dovrebbe restituire 200 e i dati del profilo se tutto è corretto', async () => {
			// 1. La controfigura accetta il token e ci dice che l'utente è l'ID "123"
			db.auth.getUser.mockResolvedValue({
				data: { user: { id: '123' } },
				error: null
			});

			const fintoProfilo = {
				id: '123',
				email: 'test@esempio.com',
				name: 'Mario Rossi',
				plate: 'AB123CD',
				preferences: { theme: 'dark' }
			};

			// 2. Simuliamo la "catena" di chiamate al database: from().select().eq().single()
			db.from.mockImplementation(() => ({
				select: () => ({
					eq: () => ({
						single: jest.fn().mockResolvedValue({
							data: fintoProfilo,
							error: null
						})
					})
				})
			}));

			const risposta = await request(app)
				.get('/api/auth/me')
				.set('Cookie', ['access_token=token_valido_e_vero']);

			expect(risposta.statusCode).toBe(200);
			// Verifichiamo che i dati restituiti siano proprio quelli di Mario Rossi!
			expect(risposta.body.name).toBe('Mario Rossi');
			expect(risposta.body.email).toBe('test@esempio.com');
		});

		// --- CASO 4: ERRORE DEL DATABASE (500) ---
		it('Dovrebbe restituire 500 se la tabella users non risponde', async () => {
			db.auth.getUser.mockResolvedValue({
				data: { user: { id: '123' } },
				error: null
			});

			// Simuliamo un errore durante la lettura della tabella
			db.from.mockImplementation(() => ({
				select: () => ({
					eq: () => ({
						single: jest.fn().mockResolvedValue({
							data: null,
							error: { message: 'Database down' }
						})
					})
				})
			}));

			const risposta = await request(app)
				.get('/api/auth/me')
				.set('Cookie', ['access_token=token_valido_e_vero']);

			expect(risposta.statusCode).toBe(500);
			expect(risposta.body.error).toBe(
				'Errore nel recupero dei dati utente'
			);
		});
		// --- CASO 5: ERRORE INTERNO DEL SERVER (500) - BLOCCO CATCH ---
		it('Dovrebbe restituire 500 in caso di crash o eccezione improvvisa (blocco catch)', async () => {
			// Istruiamo la controfigura a simulare un crash totale e imprevisto
			db.auth.getUser.mockRejectedValue(
				new Error('Guasto critico di sistema')
			);

			const risposta = await request(app)
				.get('/api/auth/me')
				.set('Cookie', ['access_token=token_valido_ma_server_rotto']);

			// Ci aspettiamo che il blocco "catch (err)" finale catturi il guasto
			expect(risposta.statusCode).toBe(500);
			expect(risposta.body.error).toBe('Errore interno del server');
		});
	});
	// --- NUOVO BLOCCO PER I TEST DI LOGOUT ---
	describe('Test della rotta /auth/logout', () => {
		beforeEach(() => {
			jest.clearAllMocks();
		});

		// --- CASO 1: SUCCESSO (200) ---
		it('Dovrebbe effettuare il logout, cancellare i cookie e restituire 200', async () => {
			// Istruiamo la controfigura a non dare nessun errore durante il signOut
			db.auth.signOut.mockResolvedValue({ error: null });

			const risposta = await request(app).post('/api/auth/logout');

			expect(risposta.statusCode).toBe(200);
			expect(risposta.body.message).toBe(
				'Logout effettuato con successo'
			);

			// Verifichiamo che i cookie siano presenti nell'intestazione e impostati per essere cancellati
			// (Express aggiunge dei comandi speciali nell'header 'set-cookie' quando usiamo clearCookie)
			const setCookieHeaders = risposta.headers['set-cookie'];
			expect(setCookieHeaders).toBeDefined();

			// Verifichiamo che entrambi i cookie vengano sovrascritti
			const hasAccessTokenCleared = setCookieHeaders.some((cookie) =>
				cookie.includes('access_token=;')
			);
			const hasRefreshTokenCleared = setCookieHeaders.some((cookie) =>
				cookie.includes('refresh_token=;')
			);

			expect(hasAccessTokenCleared).toBe(true);
			expect(hasRefreshTokenCleared).toBe(true);
		});

		// --- CASO 2: ERRORE INTERNO DEL SERVER (500) - BLOCCO CATCH ---
		it('Dovrebbe restituire 500 in caso di crash o eccezione improvvisa durante il logout', async () => {
			// Istruiamo la controfigura a simulare un crash totale
			db.auth.signOut.mockRejectedValue(
				new Error('Connessione persa durante il logout')
			);

			const risposta = await request(app).post('/api/auth/logout');

			// Verifichiamo che l'API non si blocchi, ma gestisca l'errore gentilmente
			expect(risposta.statusCode).toBe(500);
			expect(risposta.body.error).toBe('Errore interno del server');
		});
	});
	// --- NUOVO BLOCCO PER I TEST DI REFRESH TOKEN ---
	describe('Test della rotta /auth/refresh', () => {
		beforeEach(() => {
			jest.clearAllMocks();
		});

		// --- CASO 1: MANCA IL COOKIE (401) ---
		it('Dovrebbe restituire 401 se il cookie refresh_token manca', async () => {
			// Facciamo la richiesta senza impostare alcun cookie
			const risposta = await request(app).post('/api/auth/refresh');

			expect(risposta.statusCode).toBe(401);
			expect(risposta.body.error).toBe(
				'Non autorizzato: Refresh Token mancante'
			);

			// Verifichiamo che il DB non sia stato disturbato inutilmente
			expect(db.auth.refreshSession).not.toHaveBeenCalled();
		});

		// --- CASO 2: TOKEN NON VALIDO (401) ---
		it('Dovrebbe restituire 401 se il refresh_token è rifiutato dal DB', async () => {
			// La controfigura ci restituisce un errore
			db.auth.refreshSession.mockResolvedValue({
				data: { session: null },
				error: { message: 'Invalid Refresh Token' }
			});

			const risposta = await request(app)
				.post('/api/auth/refresh')
				.set('Cookie', ['refresh_token=token_scaduto']);

			expect(risposta.statusCode).toBe(401);
			expect(risposta.body.error).toBe(
				'Refresh Token non valido o scaduto'
			);
		});

		// --- CASO 3: SUCCESSO (200) ---
		it('Dovrebbe restituire 200 e impostare i nuovi cookie se il token è valido', async () => {
			// La controfigura accetta il token e ci dà una nuova sessione
			db.auth.refreshSession.mockResolvedValue({
				data: {
					session: {
						access_token: 'nuovo_access_token',
						refresh_token: 'nuovo_refresh_token'
					}
				},
				error: null
			});

			const risposta = await request(app)
				.post('/api/auth/refresh')
				.set('Cookie', ['refresh_token=token_valido']);

			expect(risposta.statusCode).toBe(200);
			expect(risposta.body.message).toBe(
				'Access token aggiornato con successo'
			);

			// Verifichiamo che l'header Set-Cookie sia presente
			const setCookieHeaders = risposta.headers['set-cookie'];
			expect(setCookieHeaders).toBeDefined();

			// Verifichiamo che contenga i "nuovi" token forniti dalla nostra controfigura
			const hasNewAccessToken = setCookieHeaders.some((cookie) =>
				cookie.includes('nuovo_access_token')
			);
			const hasNewRefreshToken = setCookieHeaders.some((cookie) =>
				cookie.includes('nuovo_refresh_token')
			);

			expect(hasNewAccessToken).toBe(true);
			expect(hasNewRefreshToken).toBe(true);
		});

		// --- CASO 4: ERRORE INTERNO DEL SERVER (500) - BLOCCO CATCH ---
		it('Dovrebbe restituire 500 in caso di crash o eccezione improvvisa', async () => {
			// Simuliamo un disastro di sistema
			db.auth.refreshSession.mockRejectedValue(
				new Error('Timeout del database')
			);

			const risposta = await request(app)
				.post('/api/auth/refresh')
				.set('Cookie', ['refresh_token=token_valido']);

			// Verifichiamo l'intervento della rete di salvataggio (il blocco catch)
			expect(risposta.statusCode).toBe(500);
			expect(risposta.body.error).toBe('Errore interno del server');
		});
	});
});
