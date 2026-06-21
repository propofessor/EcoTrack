const request = require('supertest');
const app = require('../src/index');
const { db, supabaseAdmin } = require('../src/db');
const cieService = require('../src/services/cieService');


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


jest.mock('../src/services/cieService', () => ({
	getAuthorizationUrl: jest.fn(),
	getCieUserIdentity: jest.fn()
}));

describe('Test delle rotte di Autenticazione', () => {

	beforeEach(() => {
		jest.clearAllMocks();
	});


	it('Dovrebbe registrare un utente e restituire 201 (Senza toccare il DB reale)', async () => {

		db.auth.signUp.mockResolvedValue({
			data: {
				session: {
					access_token: 'finto_access_token',
					refresh_token: 'finto_refresh_token'
				}
			},
			error: null
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


		expect(db.auth.signUp).toHaveBeenCalledTimes(1);
	});


	it('Dovrebbe restituire 400 se mancano email, password o nome', async () => {
		const risposta = await request(app)
			.post('/api/auth/register')
			.send({ email: 'solo@email.it' });

		expect(risposta.statusCode).toBe(400);
		expect(risposta.body.error).toContain('obbligatori');
		expect(db.auth.signUp).not.toHaveBeenCalled();
	});


	it('Dovrebbe restituire 400 se la password non rispetta i requisiti di sicurezza (RF6.4)', async () => {
		const risposta = await request(app)
			.post('/api/auth/register')
			.send({ email: 'test@esempio.com', password: 'debole', name: 'Mario' });

		expect(risposta.statusCode).toBe(400);
		expect(risposta.body.error).toContain('password');
		expect(db.auth.signUp).not.toHaveBeenCalled();
	});


	it('Dovrebbe restituire 400 se Supabase segnala un errore (es. email già in uso)', async () => {

		db.auth.signUp.mockResolvedValue({
			data: { session: null },
			error: { message: 'User already registered' }
		});

		const utenteEsistente = {
			email: 'esistente@esempio.com',
			password: 'PasswordSicura123!',
			name: 'Mario Rossi'
		};

		const risposta = await request(app)
			.post('/api/auth/register')
			.send(utenteEsistente);


		expect(risposta.statusCode).toBe(400);
		expect(risposta.body.error).toBe('User already registered');
	});


	it("Dovrebbe restituire 500 se c'è un errore imprevisto (es. problema di connessione)", async () => {
		db.auth.signUp.mockRejectedValue(
			new Error('Database connection failed')
		);


		const risposta = await request(app).post('/api/auth/register').send({
			email: 'test_mock@esempio.com',
			password: 'PasswordSicura123!',
			name: 'Luigi Verdi'
		});
		expect(risposta.statusCode).toBe(500);
		expect(risposta.body.error).toBe('Errore interno del server');
	});


	describe('Test delle rotte di Login', () => {
		beforeEach(() => {
			jest.clearAllMocks();
		});


		it('Dovrebbe effettuare il login e restituire 200', async () => {

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
			expect(risposta.headers['set-cookie']).toBeDefined();
		});


		it('Dovrebbe restituire 401 per email o password errate', async () => {

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


		it('Dovrebbe restituire 500 in caso di errore di sistema (es. DB irraggiungibile)', async () => {

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

	describe('Test della rotta /auth/me', () => {
		beforeEach(() => {
			jest.clearAllMocks();
		});


		it('Dovrebbe restituire 401 se il cookie access_token manca', async () => {

			const risposta = await request(app).get('/api/auth/me');

			expect(risposta.statusCode).toBe(401);
			expect(risposta.body.error).toBe(
				'Non autorizzato: Access Token mancante'
			);


			expect(db.auth.getUser).not.toHaveBeenCalled();
		});


		it('Dovrebbe restituire 401 se il token è falso o scaduto', async () => {

			db.auth.getUser.mockResolvedValue({
				data: { user: null },
				error: { message: 'Invalid token' }
			});


			const risposta = await request(app)
				.get('/api/auth/me')
				.set('Cookie', ['access_token=token_falso']);

			expect(risposta.statusCode).toBe(401);
			expect(risposta.body.error).toBe(
				'Non autorizzato: Token non valido o scaduto'
			);
		});


		it('Dovrebbe restituire 200 e i dati del profilo se tutto è corretto', async () => {

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

			expect(risposta.body.name).toBe('Mario Rossi');
			expect(risposta.body.email).toBe('test@esempio.com');
		});


		it('Dovrebbe restituire 500 se la tabella users non risponde', async () => {
			db.auth.getUser.mockResolvedValue({
				data: { user: { id: '123' } },
				error: null
			});


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

		it('Dovrebbe restituire 500 in caso di crash o eccezione improvvisa (blocco catch)', async () => {

			db.auth.getUser.mockRejectedValue(
				new Error('Guasto critico di sistema')
			);

			const risposta = await request(app)
				.get('/api/auth/me')
				.set('Cookie', ['access_token=token_valido_ma_server_rotto']);


			expect(risposta.statusCode).toBe(500);
			expect(risposta.body.error).toBe('Errore interno del server');
		});
	});

	describe('Test della rotta /auth/logout', () => {
		beforeEach(() => {
			jest.clearAllMocks();
		});


		it('Dovrebbe effettuare il logout, cancellare i cookie e restituire 200', async () => {

			db.auth.signOut.mockResolvedValue({ error: null });

			const risposta = await request(app).post('/api/auth/logout');

			expect(risposta.statusCode).toBe(200);
			expect(risposta.body.message).toBe(
				'Logout effettuato con successo'
			);



			const setCookieHeaders = risposta.headers['set-cookie'];
			expect(setCookieHeaders).toBeDefined();


			const hasAccessTokenCleared = setCookieHeaders.some((cookie) =>
				cookie.includes('access_token=;')
			);
			const hasRefreshTokenCleared = setCookieHeaders.some((cookie) =>
				cookie.includes('refresh_token=;')
			);

			expect(hasAccessTokenCleared).toBe(true);
			expect(hasRefreshTokenCleared).toBe(true);
		});


		it('Dovrebbe restituire 500 in caso di crash o eccezione improvvisa durante il logout', async () => {

			db.auth.signOut.mockRejectedValue(
				new Error('Connessione persa durante il logout')
			);

			const risposta = await request(app).post('/api/auth/logout');


			expect(risposta.statusCode).toBe(500);
			expect(risposta.body.error).toBe('Errore interno del server');
		});
	});

	describe('Test della rotta /auth/refresh', () => {
		beforeEach(() => {
			jest.clearAllMocks();
		});


		it('Dovrebbe restituire 401 se il cookie refresh_token manca', async () => {

			const risposta = await request(app).post('/api/auth/refresh');

			expect(risposta.statusCode).toBe(401);
			expect(risposta.body.error).toBe(
				'Non autorizzato: Refresh Token mancante'
			);


			expect(db.auth.refreshSession).not.toHaveBeenCalled();
		});


		it('Dovrebbe restituire 401 se il refresh_token è rifiutato dal DB', async () => {

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


		it('Dovrebbe restituire 200 e impostare i nuovi cookie se il token è valido', async () => {

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


			const setCookieHeaders = risposta.headers['set-cookie'];
			expect(setCookieHeaders).toBeDefined();


			const hasNewAccessToken = setCookieHeaders.some((cookie) =>
				cookie.includes('nuovo_access_token')
			);
			const hasNewRefreshToken = setCookieHeaders.some((cookie) =>
				cookie.includes('nuovo_refresh_token')
			);

			expect(hasNewAccessToken).toBe(true);
			expect(hasNewRefreshToken).toBe(true);
		});


		it('Dovrebbe restituire 500 in caso di crash o eccezione improvvisa', async () => {

			db.auth.refreshSession.mockRejectedValue(
				new Error('Timeout del database')
			);

			const risposta = await request(app)
				.post('/api/auth/refresh')
				.set('Cookie', ['refresh_token=token_valido']);


			expect(risposta.statusCode).toBe(500);
			expect(risposta.body.error).toBe('Errore interno del server');
		});
	});

	describe('Test delle rotte Google OAuth', () => {
		beforeEach(() => {
			jest.clearAllMocks();
		});




		describe('GET /api/auth/google', () => {
			it("Dovrebbe reindirizzare correttamente l'utente verso l'URL di Google (302)", async () => {
				const fintoUrlGoogle =
					'https://accounts.google.com/o/oauth2/auth?client_id=...';


				db.auth.signInWithOAuth.mockResolvedValue({
					data: { url: fintoUrlGoogle },
					error: null
				});

				const risposta = await request(app).get('/api/auth/google');


				expect(risposta.statusCode).toBe(302);

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




		describe('GET /api/auth/google/callback', () => {
			it('Dovrebbe restituire 400 se il parametro "code" è assente nell\'URL', async () => {

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

				db.auth.exchangeCodeForSession.mockResolvedValue({
					data: {
						session: {
							access_token: 'google_access_token_valido',
							refresh_token: 'google_refresh_token_valido'
						}
					},
					error: null
				});


				const risposta = await request(app)
					.get('/api/auth/google/callback')
					.query({ code: 'codice_di_test_valido' });


				expect(risposta.statusCode).toBe(302);
				expect(risposta.headers.location).toBe('/');


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

	describe('Test delle rotte CIE ID (OpenID Connect)', () => {
		beforeEach(() => {
			jest.clearAllMocks();
		});




		describe('GET /api/auth/cie', () => {
			it("Dovrebbe generare l'URL, impostare i cookie di sicurezza dello state e reindirizzare alla CIE (302)", async () => {

				cieService.getAuthorizationUrl.mockReturnValue({
					url: 'https://collaudo.idserver.servizicie.interno.gov.it/idp/profile/oidc/authorize?client_id=...',
					state: 'finto_state_123',
					nonce: 'finto_nonce_123'
				});

				const risposta = await request(app).get('/api/auth/cie');


				expect(risposta.statusCode).toBe(302);
				expect(risposta.headers.location).toContain(
					'servizicie.interno.gov.it'
				);


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




		describe('GET /api/auth/cie/callback', () => {
			it('Dovrebbe restituire 400 se lo "state" ricevuto non coincide con quello nei cookie (Attacco CSRF)', async () => {
				const risposta = await request(app)
					.get('/api/auth/cie/callback')
					.query({ code: 'codice_valido', state: 'state_malizioso' })

					.set('Cookie', ['cie_state=state_originale_buono']);

				expect(risposta.statusCode).toBe(400);
				expect(risposta.body.error).toBe(
					'Richiesta non valida o controlli di sicurezza falliti'
				);
			});

			it('Dovrebbe autenticare con successo un utente CIE GIÀ ESISTENTE, impostare i cookie e andare in Home', async () => {

				cieService.getCieUserIdentity.mockResolvedValue({
					codiceFiscale: 'RSSMRA80A01H501U',
					email: 'rssmra80a01h501u@cie.internal',
					nomeCompleto: 'Mario Rossi'
				});


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


				supabaseAdmin.auth.admin.generateLink.mockResolvedValue({
					data: {
						properties: { hashed_token: 'finto_hashed_token_cie' }
					},
					error: null
				});


				db.auth.verifyOtp.mockResolvedValue({
					data: {
						session: {
							access_token: 'cie_access_token_reale',
							refresh_token: 'cie_refresh_token_reale'
						}
					},
					error: null
				});


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


				expect(
					supabaseAdmin.auth.admin.createUser
				).not.toHaveBeenCalled();


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


				supabaseAdmin.auth.admin.createUser.mockResolvedValue({
					data: { user: { id: 'nuovo-uuid-generato' } },
					error: null
				});


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
