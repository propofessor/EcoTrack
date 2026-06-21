const request = require('supertest');

jest.mock('../src/db', () => {
	const mockDb = {
		auth: {
			signUp: jest.fn(),
			signInWithPassword: jest.fn(),
			getUser: jest.fn(),
			signOut: jest.fn(),
			refreshSession: jest.fn(),
			signInWithOAuth: jest.fn(),
			signInWithIdToken: jest.fn(),
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
				generateLink: jest.fn(),
				updateUserById: jest.fn()
			}
		}
	};
	return { db: mockDb, supabaseAdmin: mockSupabaseAdmin };
});

jest.mock('../src/services/cieService', () => ({
	getAuthorizationUrl: jest.fn(),
	getCieUserIdentity: jest.fn()
}));

const app = require('../src/index');
const { db, supabaseAdmin } = require('../src/db');
const cieService = require('../src/services/cieService');


function mockUserLookup(result) {
	supabaseAdmin.from.mockReturnValue({
		select: jest.fn(() => ({
			eq: jest.fn(() => ({
				single: jest.fn().mockResolvedValue(result)
			}))
		}))
	});
}

const VALID_SESSION = {
	access_token: 'access_reale',
	refresh_token: 'refresh_reale',
	user: { id: 'user-uuid' }
};

beforeEach(() => {
	jest.clearAllMocks();
});


describe('POST /api/auth/register (verifica email richiesta)', () => {
	it('restituisce 201 con email_verification_required quando manca la sessione', async () => {
		db.auth.signUp.mockResolvedValue({ data: { session: null }, error: null });

		const res = await request(app).post('/api/auth/register').send({
			email: 'nuovo@esempio.com',
			password: 'PasswordSicura123!',
			name: 'Nuovo Utente'
		});

		expect(res.statusCode).toBe(201);
		expect(res.body.email_verification_required).toBe(true);
	});
});


describe('GET /api/auth/google (catch)', () => {
	it('restituisce 500 se signInWithOAuth solleva un’eccezione', async () => {
		db.auth.signInWithOAuth.mockRejectedValue(new Error('crash'));

		const res = await request(app).get('/api/auth/google');

		expect(res.statusCode).toBe(500);
		expect(res.body.error).toBe('Errore interno del server');
	});
});


describe('POST /api/auth/resend-verification', () => {
	it('restituisce 400 se manca l’email', async () => {
		const res = await request(app).post('/api/auth/resend-verification').send({});
		expect(res.statusCode).toBe(400);
		expect(res.body.error).toBe('Email obbligatoria');
	});

	it('restituisce 200 quando la generazione del link va a buon fine', async () => {
		supabaseAdmin.auth.admin.generateLink.mockResolvedValue({ error: null });
		const res = await request(app)
			.post('/api/auth/resend-verification')
			.send({ email: 'a@b.it' });
		expect(res.statusCode).toBe(200);
	});

	it('restituisce comunque 200 anche se Supabase segnala un errore (anti-enumeration)', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
		supabaseAdmin.auth.admin.generateLink.mockResolvedValue({
			error: { message: 'rate limit' }
		});
		const res = await request(app)
			.post('/api/auth/resend-verification')
			.send({ email: 'a@b.it' });
		expect(res.statusCode).toBe(200);
		warnSpy.mockRestore();
	});

	it('restituisce 500 se la chiamata solleva un’eccezione', async () => {
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		supabaseAdmin.auth.admin.generateLink.mockRejectedValue(new Error('boom'));
		const res = await request(app)
			.post('/api/auth/resend-verification')
			.send({ email: 'a@b.it' });
		expect(res.statusCode).toBe(500);
		errSpy.mockRestore();
	});
});


describe('POST /api/auth/forgot-password', () => {
	it('restituisce 400 se manca l’email', async () => {
		const res = await request(app).post('/api/auth/forgot-password').send({});
		expect(res.statusCode).toBe(400);
	});

	it('restituisce 200 in caso di successo', async () => {
		supabaseAdmin.auth.admin.generateLink.mockResolvedValue({ error: null });
		const res = await request(app)
			.post('/api/auth/forgot-password')
			.send({ email: 'a@b.it' });
		expect(res.statusCode).toBe(200);
	});

	it('restituisce comunque 200 anche con errore (anti-enumeration)', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
		supabaseAdmin.auth.admin.generateLink.mockResolvedValue({
			error: { message: 'no user' }
		});
		const res = await request(app)
			.post('/api/auth/forgot-password')
			.send({ email: 'a@b.it' });
		expect(res.statusCode).toBe(200);
		warnSpy.mockRestore();
	});

	it('restituisce 500 in caso di eccezione', async () => {
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		supabaseAdmin.auth.admin.generateLink.mockRejectedValue(new Error('boom'));
		const res = await request(app)
			.post('/api/auth/forgot-password')
			.send({ email: 'a@b.it' });
		expect(res.statusCode).toBe(500);
		errSpy.mockRestore();
	});
});


describe('POST /api/auth/reset-password', () => {
	it('restituisce 400 se mancano token_hash o newPassword', async () => {
		const res = await request(app)
			.post('/api/auth/reset-password')
			.send({ token_hash: 'abc' });
		expect(res.statusCode).toBe(400);
		expect(res.body.error).toContain('obbligatori');
	});

	it('restituisce 400 se la nuova password è debole (RF6.4)', async () => {
		const res = await request(app)
			.post('/api/auth/reset-password')
			.send({ token_hash: 'abc', newPassword: 'debole' });
		expect(res.statusCode).toBe(400);
		expect(res.body.error).toContain('password');
	});

	it('restituisce 400 se il token OTP non è valido', async () => {
		db.auth.verifyOtp.mockResolvedValue({
			data: { session: null },
			error: { message: 'expired' }
		});
		const res = await request(app)
			.post('/api/auth/reset-password')
			.send({ token_hash: 'abc', newPassword: 'PasswordSicura123!' });
		expect(res.statusCode).toBe(400);
		expect(res.body.error).toContain('Token non valido');
	});

	it('restituisce 500 se l’aggiornamento password fallisce', async () => {
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		db.auth.verifyOtp.mockResolvedValue({
			data: { session: VALID_SESSION },
			error: null
		});
		supabaseAdmin.auth.admin.updateUserById.mockResolvedValue({
			error: { message: 'update KO' }
		});
		const res = await request(app)
			.post('/api/auth/reset-password')
			.send({ token_hash: 'abc', newPassword: 'PasswordSicura123!' });
		expect(res.statusCode).toBe(500);
		expect(res.body.error).toBe('Impossibile aggiornare la password');
		errSpy.mockRestore();
	});

	it('restituisce 200 quando la password viene aggiornata con successo', async () => {
		db.auth.verifyOtp.mockResolvedValue({
			data: { session: VALID_SESSION },
			error: null
		});
		supabaseAdmin.auth.admin.updateUserById.mockResolvedValue({ error: null });
		const res = await request(app)
			.post('/api/auth/reset-password')
			.send({ token_hash: 'abc', newPassword: 'PasswordSicura123!' });
		expect(res.statusCode).toBe(200);
		expect(supabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith(
			'user-uuid',
			{ password: 'PasswordSicura123!' }
		);
	});
});


describe('GET /api/auth/cie/callback (errore creazione utente)', () => {
	it('restituisce 500 se la createUser fallisce', async () => {
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		cieService.getCieUserIdentity.mockResolvedValue({
			codiceFiscale: 'XXX',
			email: 'x@cie.internal',
			nomeCompleto: 'Tizio Caio'
		});
		mockUserLookup({ data: null, error: { message: 'no rows' } });
		supabaseAdmin.auth.admin.createUser.mockResolvedValue({
			data: null,
			error: { message: 'create KO' }
		});

		const res = await request(app)
			.get('/api/auth/cie/callback')
			.query({ code: 'c', state: 'st' })
			.set('Cookie', ['cie_state=st']);

		expect(res.statusCode).toBe(500);
		expect(res.body.error).toBe("Errore durante la registrazione dell'utente CIE");
		errSpy.mockRestore();
	});
});


describe('GET /api/auth/cie/mobile-url', () => {
	it('restituisce 200 con url/state/nonce', async () => {
		cieService.getAuthorizationUrl.mockReturnValue({
			url: 'https://cie/authorize',
			state: 's',
			nonce: 'n'
		});
		const res = await request(app).get('/api/auth/cie/mobile-url');
		expect(res.statusCode).toBe(200);
		expect(res.body).toEqual({ url: 'https://cie/authorize', state: 's', nonce: 'n' });
	});

	it('restituisce 500 se il service solleva un’eccezione', async () => {
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		cieService.getAuthorizationUrl.mockImplementation(() => {
			throw new Error('crypto KO');
		});
		const res = await request(app).get('/api/auth/cie/mobile-url');
		expect(res.statusCode).toBe(500);
		errSpy.mockRestore();
	});
});


describe('GET /api/auth/cie/mobile-callback', () => {
	function happyPathMocks() {
		cieService.getCieUserIdentity.mockResolvedValue({
			codiceFiscale: 'XXX',
			email: 'x@cie.internal',
			nomeCompleto: 'Tizio Caio'
		});
		supabaseAdmin.auth.admin.generateLink.mockResolvedValue({
			data: { properties: { hashed_token: 'tok' } },
			error: null
		});
		db.auth.verifyOtp.mockResolvedValue({
			data: { session: VALID_SESSION },
			error: null
		});
	}

	it('restituisce 400 se mancano code o state', async () => {
		const res = await request(app).get('/api/auth/cie/mobile-callback');
		expect(res.statusCode).toBe(400);
		expect(res.body.error).toBe('Parametri mancanti');
	});

	it('autentica un utente esistente e restituisce i token (200)', async () => {
		happyPathMocks();
		mockUserLookup({ data: { id: 'utente-esistente' }, error: null });

		const res = await request(app)
			.get('/api/auth/cie/mobile-callback')
			.query({ code: 'c', state: 's' });

		expect(res.statusCode).toBe(200);
		expect(res.body.access_token).toBe('access_reale');
		expect(supabaseAdmin.auth.admin.createUser).not.toHaveBeenCalled();
	});

	it('registra automaticamente un nuovo utente (200)', async () => {
		happyPathMocks();
		mockUserLookup({ data: null, error: { message: 'no rows' } });
		supabaseAdmin.auth.admin.createUser.mockResolvedValue({
			data: { user: { id: 'nuovo' } },
			error: null
		});

		const res = await request(app)
			.get('/api/auth/cie/mobile-callback')
			.query({ code: 'c', state: 's' });

		expect(res.statusCode).toBe(200);
		expect(supabaseAdmin.auth.admin.createUser).toHaveBeenCalledTimes(1);
	});

	it('restituisce 500 se la createUser fallisce', async () => {
		cieService.getCieUserIdentity.mockResolvedValue({
			codiceFiscale: 'XXX',
			email: 'x@cie.internal',
			nomeCompleto: 'Tizio Caio'
		});
		mockUserLookup({ data: null, error: { message: 'no rows' } });
		supabaseAdmin.auth.admin.createUser.mockResolvedValue({
			data: null,
			error: { message: 'create KO' }
		});

		const res = await request(app)
			.get('/api/auth/cie/mobile-callback')
			.query({ code: 'c', state: 's' });

		expect(res.statusCode).toBe(500);
		expect(res.body.error).toBe('Errore registrazione CIE');
	});

	it('restituisce 500 se generateLink fallisce', async () => {
		cieService.getCieUserIdentity.mockResolvedValue({
			codiceFiscale: 'XXX',
			email: 'x@cie.internal',
			nomeCompleto: 'Tizio Caio'
		});
		mockUserLookup({ data: { id: 'esistente' }, error: null });
		supabaseAdmin.auth.admin.generateLink.mockResolvedValue({
			data: null,
			error: { message: 'link KO' }
		});

		const res = await request(app)
			.get('/api/auth/cie/mobile-callback')
			.query({ code: 'c', state: 's' });

		expect(res.statusCode).toBe(500);
		expect(res.body.error).toBe('Impossibile generare la sessione CIE');
	});

	it('restituisce 500 se verifyOtp non produce una sessione', async () => {
		cieService.getCieUserIdentity.mockResolvedValue({
			codiceFiscale: 'XXX',
			email: 'x@cie.internal',
			nomeCompleto: 'Tizio Caio'
		});
		mockUserLookup({ data: { id: 'esistente' }, error: null });
		supabaseAdmin.auth.admin.generateLink.mockResolvedValue({
			data: { properties: { hashed_token: 'tok' } },
			error: null
		});
		db.auth.verifyOtp.mockResolvedValue({
			data: { session: null },
			error: { message: 'otp KO' }
		});

		const res = await request(app)
			.get('/api/auth/cie/mobile-callback')
			.query({ code: 'c', state: 's' });

		expect(res.statusCode).toBe(500);
		expect(res.body.error).toBe('Impossibile avviare la sessione CIE');
	});

	it('restituisce 500 (catch) se lo scambio identità fallisce', async () => {
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		cieService.getCieUserIdentity.mockRejectedValue(new Error('CIE KO'));

		const res = await request(app)
			.get('/api/auth/cie/mobile-callback')
			.query({ code: 'c', state: 's' });

		expect(res.statusCode).toBe(500);
		expect(res.body.error).toBe('Errore interno del server');
		errSpy.mockRestore();
	});
});


describe('POST /api/auth/google/token', () => {
	it('restituisce 400 se manca id_token', async () => {
		const res = await request(app).post('/api/auth/google/token').send({});
		expect(res.statusCode).toBe(400);
	});

	it('restituisce 401 se signInWithIdToken fallisce', async () => {
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		db.auth.signInWithIdToken.mockResolvedValue({
			data: { session: null },
			error: { message: 'bad token' }
		});
		const res = await request(app)
			.post('/api/auth/google/token')
			.send({ id_token: 'x' });
		expect(res.statusCode).toBe(401);
		expect(res.body.error).toBe('Autenticazione Google fallita');
		errSpy.mockRestore();
	});

	it('restituisce 200 e i token in caso di successo', async () => {
		db.auth.signInWithIdToken.mockResolvedValue({
			data: { session: VALID_SESSION },
			error: null
		});
		const res = await request(app)
			.post('/api/auth/google/token')
			.send({ id_token: 'x' });
		expect(res.statusCode).toBe(200);
		expect(res.body.access_token).toBe('access_reale');
	});

	it('restituisce 500 in caso di eccezione', async () => {
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		db.auth.signInWithIdToken.mockRejectedValue(new Error('boom'));
		const res = await request(app)
			.post('/api/auth/google/token')
			.send({ id_token: 'x' });
		expect(res.statusCode).toBe(500);
		errSpy.mockRestore();
	});
});


describe('GET /api/auth/google/mobile-url', () => {
	it('restituisce 200 con l’URL OAuth', async () => {
		db.auth.signInWithOAuth.mockResolvedValue({
			data: { url: 'https://google/oauth' },
			error: null
		});
		const res = await request(app).get('/api/auth/google/mobile-url');
		expect(res.statusCode).toBe(200);
		expect(res.body.url).toBe('https://google/oauth');
	});

	it('restituisce 500 se Supabase non fornisce un URL', async () => {
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		db.auth.signInWithOAuth.mockResolvedValue({
			data: null,
			error: { message: 'KO' }
		});
		const res = await request(app).get('/api/auth/google/mobile-url');
		expect(res.statusCode).toBe(500);
		errSpy.mockRestore();
	});
});


describe('GET /api/auth/google/mobile-callback', () => {
	it('reindirizza con errore se manca il code', async () => {
		const res = await request(app).get('/api/auth/google/mobile-callback');
		expect(res.statusCode).toBe(302);
		expect(res.headers.location).toBe('ecotrack://auth/google?error=missing_code');
	});

	it('reindirizza con auth_failed se lo scambio fallisce', async () => {
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		db.auth.exchangeCodeForSession.mockResolvedValue({
			data: { session: null },
			error: { message: 'KO' }
		});
		const res = await request(app)
			.get('/api/auth/google/mobile-callback')
			.query({ code: 'c' });
		expect(res.statusCode).toBe(302);
		expect(res.headers.location).toBe('ecotrack://auth/google?error=auth_failed');
		errSpy.mockRestore();
	});

	it('reindirizza con i token in caso di successo', async () => {
		db.auth.exchangeCodeForSession.mockResolvedValue({
			data: { session: VALID_SESSION },
			error: null
		});
		const res = await request(app)
			.get('/api/auth/google/mobile-callback')
			.query({ code: 'c' });
		expect(res.statusCode).toBe(302);
		expect(res.headers.location).toContain('ecotrack://auth/google?');
		expect(res.headers.location).toContain('access_token=access_reale');
	});

	it('reindirizza con server_error in caso di eccezione', async () => {
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		db.auth.exchangeCodeForSession.mockRejectedValue(new Error('boom'));
		const res = await request(app)
			.get('/api/auth/google/mobile-callback')
			.query({ code: 'c' });
		expect(res.statusCode).toBe(302);
		expect(res.headers.location).toBe('ecotrack://auth/google?error=server_error');
		errSpy.mockRestore();
	});
});


describe('GET /api/auth/google/web-url', () => {
	it('restituisce 200 con l’URL OAuth', async () => {
		db.auth.signInWithOAuth.mockResolvedValue({
			data: { url: 'https://google/web' },
			error: null
		});
		const res = await request(app).get('/api/auth/google/web-url');
		expect(res.statusCode).toBe(200);
		expect(res.body.url).toBe('https://google/web');
	});

	it('restituisce 500 se manca l’URL', async () => {
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		db.auth.signInWithOAuth.mockResolvedValue({ data: null, error: { message: 'KO' } });
		const res = await request(app).get('/api/auth/google/web-url');
		expect(res.statusCode).toBe(500);
		errSpy.mockRestore();
	});
});


describe('GET /api/auth/google/web-callback', () => {
	const WEB_APP_URL = 'http://localhost:8081';

	it('reindirizza con missing_code se manca il code', async () => {
		const res = await request(app).get('/api/auth/google/web-callback');
		expect(res.statusCode).toBe(302);
		expect(res.headers.location).toBe(`${WEB_APP_URL}/?error=missing_code`);
	});

	it('reindirizza con auth_failed se lo scambio fallisce', async () => {
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		db.auth.exchangeCodeForSession.mockResolvedValue({
			data: { session: null },
			error: { message: 'KO' }
		});
		const res = await request(app)
			.get('/api/auth/google/web-callback')
			.query({ code: 'c' });
		expect(res.statusCode).toBe(302);
		expect(res.headers.location).toBe(`${WEB_APP_URL}/?error=auth_failed`);
		errSpy.mockRestore();
	});

	it('imposta i cookie e reindirizza alla web app in caso di successo', async () => {
		db.auth.exchangeCodeForSession.mockResolvedValue({
			data: { session: VALID_SESSION },
			error: null
		});
		const res = await request(app)
			.get('/api/auth/google/web-callback')
			.query({ code: 'c' });
		expect(res.statusCode).toBe(302);
		expect(res.headers.location).toBe(WEB_APP_URL);
		const cookies = res.headers['set-cookie'];
		expect(cookies.some((c) => c.includes('access_token=access_reale'))).toBe(true);
	});

	it('reindirizza con server_error in caso di eccezione', async () => {
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		db.auth.exchangeCodeForSession.mockRejectedValue(new Error('boom'));
		const res = await request(app)
			.get('/api/auth/google/web-callback')
			.query({ code: 'c' });
		expect(res.statusCode).toBe(302);
		expect(res.headers.location).toBe(`${WEB_APP_URL}/?error=server_error`);
		errSpy.mockRestore();
	});
});
