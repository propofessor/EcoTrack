// auth.test.js
const request = require('supertest');
const app = require('../src/index');
const { db, supabaseAdmin } = require('../src/db'); // Importiamo il vero client per poterlo "sostituire"
const cieService = require('../src/services/cieService');

// 1. CREIAMO LA CONTROFIGURA (MOCK)
// Diciamo a Jest: "Sostituisci il vero supabaseClient con questo oggetto finto".
// jest.fn() crea una funzione "spia" che possiamo manipolare a nostro piacimento.
jest.mock('../src/db', () => {
	const mockDb = {
		auth: {
			signUp: jest.fn(),
			signInWithPassword: jest.fn(),
			getUser: jest.fn(),
			signOut: jest.fn(),
			refreshSession: jest.fn(),
			signInWithOAuth: jest.fn(),
			exchangeCodeForSession: jest.fn(),
			verifyOtp: jest.fn()
		},
		from: jest.fn()
	};

	const mockSupabaseAdmin = {
		from: jest.fn(),
		auth: {
			admin: {
				createUser: jest.fn(),
				generateLink: jest.fn()
			}
		}
	};

	return {
		db: mockDb,
		supabaseAdmin: mockSupabaseAdmin
	};
});

// 3. MOCK DEL SERVICE CIE (Evita di chiamare i server ministeriali)
jest.mock('../src/services/cieService', () => ({
	getAuthorizationUrl: jest.fn(),
	getCieUserIdentity: jest.fn()
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

	// --- CASO: VALIDAZIONE (Campi obbligatori mancanti) ---
	it('Dovrebbe restituire 400 se mancano email, password o nome', async () => {
		const risposta = await request(app)
			.post('/api/auth/register')
			.send({ email: 'solo@email.it' }); // mancano password e name

		expect(risposta.statusCode).toBe(400);
		expect(risposta.body.error).toContain('obbligatori');
		expect(db.auth.signUp).not.toHaveBeenCalled();
	});

	// --- CASO: VALIDAZIONE (Password debole, RF6.4) ---
	it('Dovrebbe restituire 400 se la password non rispetta i requisiti di sicurezza (RF6.4)', async () => {
		const risposta = await request(app)
			.post('/api/auth/register')
			.send({ email: 'test@esempio.com', password: 'debole', name: 'Mario' });

		expect(risposta.statusCode).toBe(400);
		expect(risposta.body.error).toContain('password');
		expect(db.auth.signUp).not.toHaveBeenCalled();
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
		db.auth.signUp.mockRejectedValue(
			new Error('Database connection failed')
		);

		// Inviamo il body direttamente (non annidato) per superare la validazione
		const risposta = await request(app).post('/api/auth/register').send({
			email: 'test_mock@esempio.com',
			password: 'PasswordSicura123!',
			name: 'Luigi Verdi'
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
	// --- NUOVO BLOCCO PER I TEST DI GOOGLE OAUTH ---
	describe('Test delle rotte Google OAuth', () => {
		beforeEach(() => {
			jest.clearAllMocks();
		});

		// ==========================================
		// TEST PER LA ROTTA: GET /api/auth/google
		// ==========================================
		describe('GET /api/auth/google', () => {
			it("Dovrebbe reindirizzare correttamente l'utente verso l'URL di Google (302)", async () => {
				const fintoUrlGoogle =
					'https://accounts.google.com/o/oauth2/auth?client_id=...';

				// Istruiamo il mock a restituire l'URL di reindirizzamento simulato
				db.auth.signInWithOAuth.mockResolvedValue({
					data: { url: fintoUrlGoogle },
					error: null
				});

				const risposta = await request(app).get('/api/auth/google');

				// Lo stato 302 indica un reindirizzamento (Redirect)
				expect(risposta.statusCode).toBe(302);
				// Verifichiamo che l'header 'location' punti all'URL fornito da Supabase
				expect(risposta.headers.location).toBe(fintoUrlGoogle);
				expect(db.auth.signInWithOAuth).toHaveBeenCalledTimes(1);
			});

			it("Dovrebbe restituire 500 se Supabase fallisce l'inizializzazione dell'OAuth", async () => {
				db.auth.signInWithOAuth.mockResolvedValue({
					data: null,
					error: { message: 'Errore di configurazione del provider' }
				});

				const risposta = await request(app).get('/api/auth/google');

				expect(risposta.statusCode).toBe(500);
				expect(risposta.body.error).toBe(
					'Impossibile avviare il login con Google'
				);
			});
		});

		// ==========================================
		// TEST PER LA ROTTA: GET /api/auth/google/callback
		// ==========================================
		describe('GET /api/auth/google/callback', () => {
			it('Dovrebbe restituire 400 se il parametro "code" è assente nell\'URL', async () => {
				// Effettuiamo la richiesta senza passare query parameter (?code=...)
				const risposta = await request(app).get(
					'/api/auth/google/callback'
				);

				expect(risposta.statusCode).toBe(400);
				expect(risposta.body.error).toBe(
					'Codice di autorizzazione mancante'
				);
				expect(db.auth.exchangeCodeForSession).not.toHaveBeenCalled();
			});

			it('Dovrebbe scambiare il codice, impostare i cookie e reindirizzare alla Home "/" (302)', async () => {
				// Simuliamo il successo dello scambio del codice con una sessione valida
				db.auth.exchangeCodeForSession.mockResolvedValue({
					data: {
						session: {
							access_token: 'google_access_token_valido',
							refresh_token: 'google_refresh_token_valido'
						}
					},
					error: null
				});

				// Inviamo la richiesta simulando il codice restituito da Google (?code=...)
				const risposta = await request(app)
					.get('/api/auth/google/callback')
					.query({ code: 'codice_di_test_valido' });

				// Controlliamo il reindirizzamento finale del backend alla home "/"
				expect(risposta.statusCode).toBe(302);
				expect(risposta.headers.location).toBe('/');

				// Verifichiamo l'impostazione corretta dei cookie di sicurezza
				const setCookieHeaders = risposta.headers['set-cookie'];
				expect(setCookieHeaders).toBeDefined();

				const hasAccessToken = setCookieHeaders.some((cookie) =>
					cookie.includes('access_token=google_access_token_valido')
				);
				const hasRefreshToken = setCookieHeaders.some((cookie) =>
					cookie.includes('refresh_token=google_refresh_token_valido')
				);

				expect(hasAccessToken).toBe(true);
				expect(hasRefreshToken).toBe(true);
				expect(db.auth.exchangeCodeForSession).toHaveBeenCalledWith(
					'codice_di_test_valido'
				);
			});

			it('Dovrebbe restituire 401 se lo scambio del codice fallisce su Supabase', async () => {
				db.auth.exchangeCodeForSession.mockResolvedValue({
					data: { session: null },
					error: { message: 'Auth code expired or invalid' }
				});

				const risposta = await request(app)
					.get('/api/auth/google/callback')
					.query({ code: 'codice_scaduto' });

				expect(risposta.statusCode).toBe(401);
				expect(risposta.body.error).toBe(
					'Autenticazione Google fallita'
				);
			});

			it('Dovrebbe rispondere con 500 in caso di crash improvviso del server (blocco catch)', async () => {
				// Provochiamo un errore drastico lanciando un'eccezione
				db.auth.exchangeCodeForSession.mockRejectedValue(
					new Error('Crash del server di autenticazione')
				);

				const risposta = await request(app)
					.get('/api/auth/google/callback')
					.query({ code: 'codice_qualsiasi' });

				expect(risposta.statusCode).toBe(500);
				expect(risposta.body.error).toBe('Errore interno del server');
			});
		});
	});
	// --- NUOVO BLOCCO PER I TEST DI AUTENTICAZIONE VIA CIE ---
	describe('Test delle rotte CIE ID (OpenID Connect)', () => {
		beforeEach(() => {
			jest.clearAllMocks();
		});

		// ==========================================
		// TEST PER LA ROTTA: GET /api/auth/cie (Inizio Flusso)
		// ==========================================
		describe('GET /api/auth/cie', () => {
			it("Dovrebbe generare l'URL, impostare i cookie di sicurezza dello state e reindirizzare alla CIE (302)", async () => {
				// Simuliamo il comportamento del service
				cieService.getAuthorizationUrl.mockReturnValue({
					url: 'https://collaudo.idserver.servizicie.interno.gov.it/idp/profile/oidc/authorize?client_id=...',
					state: 'finto_state_123',
					nonce: 'finto_nonce_123'
				});

				const risposta = await request(app).get('/api/auth/cie');

				// Controlliamo il reindirizzamento al portale ministeriale
				expect(risposta.statusCode).toBe(302);
				expect(risposta.headers.location).toContain(
					'servizicie.interno.gov.it'
				);

				// Verifichiamo che Express imposti i cookie anti-CSRF temporanei
				const setCookieHeaders = risposta.headers['set-cookie'];
				expect(setCookieHeaders).toBeDefined();

				const hasStateCookie = setCookieHeaders.some((c) =>
					c.includes('cie_state=finto_state_123')
				);
				const hasNonceCookie = setCookieHeaders.some((c) =>
					c.includes('cie_nonce=finto_nonce_123')
				);

				expect(hasStateCookie).toBe(true);
				expect(hasNonceCookie).toBe(true);
			});

			it('Dovrebbe rispondere con 500 se il service fallisce la generazione dei parametri', async () => {
				cieService.getAuthorizationUrl.mockImplementation(() => {
					throw new Error('Errore crittografico casuale');
				});

				const risposta = await request(app).get('/api/auth/cie');
				expect(risposta.statusCode).toBe(500);
				expect(risposta.body.error).toBe(
					"Errore nell'avvio del flusso CIE"
				);
			});
		});

		// ==========================================
		// TEST PER LA ROTTA: GET /api/auth/cie/callback (Ritorno da CIE)
		// ==========================================
		describe('GET /api/auth/cie/callback', () => {
			it('Dovrebbe restituire 400 se lo "state" ricevuto non coincide con quello nei cookie (Attacco CSRF)', async () => {
				const risposta = await request(app)
					.get('/api/auth/cie/callback')
					.query({ code: 'codice_valido', state: 'state_malizioso' })
					// Simuliamo che nel browser dell'utente ci sia un altro state salvato
					.set('Cookie', ['cie_state=state_originale_buono']);

				expect(risposta.statusCode).toBe(400);
				expect(risposta.body.error).toBe(
					'Richiesta non valida o controlli di sicurezza falliti'
				);
			});

			it('Dovrebbe autenticare con successo un utente CIE GIÀ ESISTENTE, impostare i cookie e andare in Home', async () => {
				// 1. Il service restituisce con successo i dati del Codice Fiscale letti dalla CIE
				cieService.getCieUserIdentity.mockResolvedValue({
					codiceFiscale: 'RSSMRA80A01H501U',
					email: 'rssmra80a01h501u@cie.internal',
					nomeCompleto: 'Mario Rossi'
				});

				// 2. Il database trova che l'utente esiste già
				const mockSingle = jest.fn().mockResolvedValue({
					data: { id: 'utente-uuid-esistente' },
					error: null
				});
				supabaseAdmin.from.mockReturnValue({
					select: jest.fn(() => ({
						eq: jest.fn(() => ({
							single: mockSingle
						}))
					}))
				});

				// 3. Mock per generateLink → hashed_token reale
				supabaseAdmin.auth.admin.generateLink.mockResolvedValue({
					data: {
						properties: { hashed_token: 'finto_hashed_token_cie' }
					},
					error: null
				});

				// 4. Mock per verifyOtp → sessione reale
				db.auth.verifyOtp.mockResolvedValue({
					data: {
						session: {
							access_token: 'cie_access_token_reale',
							refresh_token: 'cie_refresh_token_reale'
						}
					},
					error: null
				});

				// Eseguiamo la chiamata inviando i cookie corretti accoppiati alla query
				const risposta = await request(app)
					.get('/api/auth/cie/callback')
					.query({
						code: 'codice_cie_valido',
						state: 'mio_state_identico'
					})
					.set('Cookie', [
						'cie_state=mio_state_identico',
						'cie_nonce=mio_nonce'
					]);

				expect(risposta.statusCode).toBe(302);
				expect(risposta.headers.location).toBe('/');

				// L'admin non deve registrare nessuno perché l'utente esisteva già
				expect(
					supabaseAdmin.auth.admin.createUser
				).not.toHaveBeenCalled();

				// Verifica che i cookie di sessione reali siano stati emessi
				const setCookieHeaders = risposta.headers['set-cookie'];
				expect(setCookieHeaders).toBeDefined();
				expect(
					setCookieHeaders.some((c) =>
						c.includes('access_token=cie_access_token_reale')
					)
				).toBe(true);
			});

			it('Dovrebbe REGISTRARE AUTOMATICAMENTE un utente se non esiste ancora nel DB', async () => {
				cieService.getCieUserIdentity.mockResolvedValue({
					codiceFiscale: 'NDALCU90A01H501X',
					email: 'ndalcu90a01h501x@cie.internal',
					nomeCompleto: 'Luca Neri'
				});

				// Il database dice che non c'è nessun utente con questa email
				const mockSingle = jest.fn().mockResolvedValue({
					data: null,
					error: { message: 'No rows found' }
				});
				supabaseAdmin.from.mockReturnValue({
					select: jest.fn(() => ({
						eq: jest.fn(() => ({
							single: mockSingle
						}))
					}))
				});

				// Mockiamo la creazione dell'utente da parte dell'Admin di Supabase
				supabaseAdmin.auth.admin.createUser.mockResolvedValue({
					data: { user: { id: 'nuovo-uuid-generato' } },
					error: null
				});

				// Mock per generateLink + verifyOtp
				supabaseAdmin.auth.admin.generateLink.mockResolvedValue({
					data: {
						properties: { hashed_token: 'finto_hashed_token_nuovo' }
					},
					error: null
				});
				db.auth.verifyOtp.mockResolvedValue({
					data: {
						session: {
							access_token: 'cie_access_nuovo',
							refresh_token: 'cie_refresh_nuovo'
						}
					},
					error: null
				});

				const risposta = await request(app)
					.get('/api/auth/cie/callback')
					.query({ code: 'codice_nuovo_utente', state: 'state_ok' })
					.set('Cookie', [
						'cie_state=state_ok',
						'cie_nonce=nonce_ok'
					]);

				expect(risposta.statusCode).toBe(302);
				expect(
					supabaseAdmin.auth.admin.createUser
				).toHaveBeenCalledTimes(1);
			});

			it('Dovrebbe restituire 500 se generateLink fallisce', async () => {
				cieService.getCieUserIdentity.mockResolvedValue({
					codiceFiscale: 'RSSMRA80A01H501U',
					email: 'rssmra80a01h501u@cie.internal',
					nomeCompleto: 'Mario Rossi'
				});
				supabaseAdmin.from.mockReturnValue({
					select: jest.fn(() => ({
						eq: jest.fn(() => ({
							single: jest.fn().mockResolvedValue({
								data: { id: 'utente-uuid-esistente' },
								error: null
							})
						}))
					}))
				});
				supabaseAdmin.auth.admin.generateLink.mockResolvedValue({
					data: null,
					error: { message: 'Supabase key error' }
				});

				const risposta = await request(app)
					.get('/api/auth/cie/callback')
					.query({ code: 'code', state: 'st' })
					.set('Cookie', ['cie_state=st']);

				expect(risposta.statusCode).toBe(500);
				expect(risposta.body.error).toBe(
					'Impossibile generare la sessione CIE'
				);
			});

			it('Dovrebbe restituire 500 se verifyOtp non restituisce una sessione valida', async () => {
				cieService.getCieUserIdentity.mockResolvedValue({
					codiceFiscale: 'RSSMRA80A01H501U',
					email: 'rssmra80a01h501u@cie.internal',
					nomeCompleto: 'Mario Rossi'
				});
				supabaseAdmin.from.mockReturnValue({
					select: jest.fn(() => ({
						eq: jest.fn(() => ({
							single: jest.fn().mockResolvedValue({
								data: { id: 'utente-uuid-esistente' },
								error: null
							})
						}))
					}))
				});
				supabaseAdmin.auth.admin.generateLink.mockResolvedValue({
					data: {
						properties: { hashed_token: 'tok' }
					},
					error: null
				});
				db.auth.verifyOtp.mockResolvedValue({
					data: { session: null },
					error: { message: 'OTP expired' }
				});

				const risposta = await request(app)
					.get('/api/auth/cie/callback')
					.query({ code: 'code', state: 'st' })
					.set('Cookie', ['cie_state=st']);

				expect(risposta.statusCode).toBe(500);
				expect(risposta.body.error).toBe(
					'Impossibile avviare la sessione CIE'
				);
			});

			it('Dovrebbe restituire 500 se lo scambio di identità ministeriale fallisce', async () => {
				// Simuliamo un errore di rete o di firma del token del server CIE
				cieService.getCieUserIdentity.mockRejectedValue(
					new Error('CIE Token Signature Invalid')
				);

				const risposta = await request(app)
					.get('/api/auth/cie/callback')
					.query({ code: 'codice_corrotto', state: 'state_ok' })
					.set('Cookie', ['cie_state=state_ok']);

				expect(risposta.statusCode).toBe(500);
				expect(risposta.body.error).toBe(
					'Errore interno durante il login CIE'
				);
			});
		});
	});
});
