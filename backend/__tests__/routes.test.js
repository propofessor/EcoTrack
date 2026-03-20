/**
 * __tests__/routes.test.js
 *
 * Test suite per backend/src/routes.js
 *
 * Struttura cartelle assunta:
 *   backend/
 *     src/
 *       routes.js
 *       db.js
 *       utils.js
 *     __tests__/
 *       routes.test.js   ← questo file
 *
 * Dipendenze (se non già presenti):
 *   pnpm add -D jest supertest
 *
 * package.json — aggiungere:
 *   "scripts": {
 *     "test": "jest",
 *     "test:coverage": "jest --coverage --forceExit"
 *   },
 *   "jest": { "testEnvironment": "node" }
 */

const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');

// ─── Mock dei moduli esterni ───────────────────────────────────────────────────
// I path sono relativi a __tests__/, quindi risalgono a ../src/

jest.mock('../src/db');
jest.mock('../src/utils');
jest.mock('bcrypt');

const db = require('../src/db');
const { createSession, checkToken } = require('../src/utils');
const bcrypt = require('bcrypt');

// ─── Setup dell'app di test ────────────────────────────────────────────────────
// routes va importato DOPO i jest.mock(), così i require interni al modulo
// ricevono già le versioni mockate di db e utils.

const routes = require('../src/routes');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/', routes);

// ─── Helper ───────────────────────────────────────────────────────────────────

const sessionCookie = 'session=valid-token';

const mockUser = {
	id: 1,
	name: 'John Doe',
	email: 'john@example.com',
	plate: null,
	achievements: {},
	preferences: {}
};

// ─── Reset mock prima di ogni test ────────────────────────────────────────────

beforeEach(() => {
	jest.clearAllMocks();
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /session/login
// ═════════════════════════════════════════════════════════════════════════════

describe('POST /session/login', () => {
	const validBody = {
		provider_user_id: 'john@example.com',
		provider_data: { password: 's3cr3tP@ssword' },
		provider_type_name: 'local'
	};

	test('200 — credenziali valide: restituisce token e imposta cookie', async () => {
		db.getUserId.mockResolvedValue(1);
		createSession.mockReturnValue('mocked.jwt.token');

		const res = await request(app).post('/session/login').send(validBody);

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ token: 'mocked.jwt.token' });
		expect(res.headers['set-cookie']).toBeDefined();
		expect(res.headers['set-cookie'][0]).toBe('session=mocked.jwt.token');
		expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/i);
		expect(res.headers['set-cookie'][0]).toMatch(/Path=\//i);
	});

	test('400 — manca provider_user_id', async () => {
		const res = await request(app)
			.post('/session/login')
			.send({
				provider_data: { password: 'x' },
				provider_type_name: 'local'
			});

		expect(res.status).toBe(400);
		expect(res.body.message).toBe('All fields are required');
		expect(db.getUserId).not.toHaveBeenCalled();
	});

	test('400 — manca provider_data', async () => {
		const res = await request(app).post('/session/login').send({
			provider_user_id: 'john@example.com',
			provider_type_name: 'local'
		});

		expect(res.status).toBe(400);
		expect(res.body.message).toBe('All fields are required');
	});

	test('400 — manca provider_type_name', async () => {
		const res = await request(app)
			.post('/session/login')
			.send({
				provider_user_id: 'john@example.com',
				provider_data: { password: 'x' }
			});

		expect(res.status).toBe(400);
		expect(res.body.message).toBe('All fields are required');
	});

	test('400 — body completamente vuoto', async () => {
		const res = await request(app).post('/session/login').send({});

		expect(res.status).toBe(400);
		expect(res.body.message).toBe('All fields are required');
	});

	test('401 — credenziali non valide (getUserId restituisce null)', async () => {
		db.getUserId.mockResolvedValue(null);

		const res = await request(app).post('/session/login').send(validBody);

		expect(res.status).toBe(401);
		expect(res.body.message).toBe('Invalid credentials');
		expect(createSession).not.toHaveBeenCalled();
	});

	test('500 — createSession lancia eccezione', async () => {
		db.getUserId.mockResolvedValue(1);
		createSession.mockImplementation(() => {
			throw new Error('JWT_SECRET not set');
		});

		const res = await request(app).post('/session/login').send(validBody);

		expect(res.status).toBe(500);
		expect(res.body.message).toBe('JWT_SECRET not set.');
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /session/logout
// ═════════════════════════════════════════════════════════════════════════════

describe('POST /session/logout', () => {
	test('200 — pulisce il cookie di sessione', async () => {
		const res = await request(app)
			.post('/session/logout')
			.set('Cookie', sessionCookie);

		expect(res.status).toBe(200);
		expect(res.body.message).toBe('Logged out successfully');

		// Il cookie deve essere invalidato: Max-Age=0 oppure Expires nel passato
		const cookie = res.headers['set-cookie']?.[0] ?? '';
		const isCleared =
			cookie.includes('Max-Age=0') ||
			cookie.includes('Expires=Thu, 01 Jan 1970');
		expect(isCleared).toBe(true);
	});

	test('200 — funziona anche senza cookie (logout idempotente)', async () => {
		const res = await request(app).post('/session/logout');

		expect(res.status).toBe(200);
		expect(res.body.message).toBe('Logged out successfully');
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /session/validate
// ═════════════════════════════════════════════════════════════════════════════

describe('GET /session/validate', () => {
	test('200 valid:true — token valido e utente trovato', async () => {
		checkToken.mockImplementation((token, cb) => cb(null, { user_id: 1 }));
		db.getUser.mockResolvedValue(mockUser);

		const res = await request(app)
			.get('/session/validate')
			.set('Cookie', sessionCookie);

		expect(res.status).toBe(200);
		expect(res.body.valid).toBe(true);
		expect(res.body.user).toMatchObject({ id: 1, name: 'John Doe' });
	});

	test('200 valid:false — nessun cookie presente', async () => {
		const res = await request(app).get('/session/validate');

		expect(res.status).toBe(200);
		expect(res.body.valid).toBe(false);
		expect(checkToken).not.toHaveBeenCalled();
	});

	test('200 valid:false — token non valido (checkToken restituisce errore)', async () => {
		checkToken.mockImplementation((token, cb) =>
			cb(new Error('invalid signature'), null)
		);

		const res = await request(app)
			.get('/session/validate')
			.set('Cookie', sessionCookie);

		expect(res.status).toBe(200);
		expect(res.body.valid).toBe(false);
	});

	test('200 valid:false — token valido ma utente non trovato nel DB', async () => {
		checkToken.mockImplementation((token, cb) => cb(null, { user_id: 99 }));
		db.getUser.mockResolvedValue(null);

		const res = await request(app)
			.get('/session/validate')
			.set('Cookie', sessionCookie);

		expect(res.status).toBe(200);
		expect(res.body.valid).toBe(false);
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /session/refresh
// ═════════════════════════════════════════════════════════════════════════════

describe('POST /session/refresh', () => {
	test('200 — token valido: emette nuovo cookie e restituisce message', async () => {
		checkToken.mockImplementation((token, cb) => cb(null, { user_id: 1 }));
		createSession.mockReturnValue('new-mocked.jwt.token');

		const res = await request(app)
			.post('/session/refresh')
			.set('Cookie', sessionCookie);

		expect(res.status).toBe(200);
		expect(res.body.message).toBe('Session refreshed');
		expect(res.headers['set-cookie']).toBeDefined();
		expect(res.headers['set-cookie'][0]).toBe('new-mocked.jwt.token');
	});

	test('200 — nessun cookie: restituisce "No session found"', async () => {
		const res = await request(app).post('/session/refresh');

		expect(res.status).toBe(200);
		expect(res.body.message).toBe('No session found');
		expect(checkToken).not.toHaveBeenCalled();
	});

	test('200 — token scaduto o non valido: restituisce "Invalid or expired session"', async () => {
		checkToken.mockImplementation((token, cb) =>
			cb(new Error('jwt expired'), null)
		);

		const res = await request(app)
			.post('/session/refresh')
			.set('Cookie', sessionCookie);

		expect(res.status).toBe(200);
		expect(res.body.message).toBe('Invalid or expired session');
	});

	test('500 — createSession lancia eccezione durante il refresh', async () => {
		checkToken.mockImplementation((token, cb) => cb(null, { user_id: 1 }));
		createSession.mockImplementation(() => {
			throw new Error('JWT_SECRET not set');
		});

		const res = await request(app)
			.post('/session/refresh')
			.set('Cookie', sessionCookie);

		expect(res.status).toBe(500);
		expect(res.body.message).toBe('Internal server error');
	});

	test('500 — createSession restituisce null durante il refresh', async () => {
		checkToken.mockImplementation((token, cb) => cb(null, { user_id: 1 }));
		createSession.mockReturnValue(null);

		const res = await request(app)
			.post('/session/refresh')
			.set('Cookie', sessionCookie);

		expect(res.status).toBe(500);
		expect(res.body.message).toBe('Internal server error');
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /session/me
// ═════════════════════════════════════════════════════════════════════════════

describe('GET /session/me', () => {
	test("200 — restituisce il profilo dell'utente autenticato", async () => {
		checkToken.mockImplementation((token, cb) => cb(null, { user_id: 1 }));
		db.getUser.mockResolvedValue(mockUser);

		const res = await request(app)
			.get('/session/me')
			.set('Cookie', sessionCookie);

		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ id: 1, name: 'John Doe' });
	});

	test('401 — nessun cookie: middleware requireAuth blocca la richiesta', async () => {
		const res = await request(app).get('/session/me');

		expect(res.status).toBe(401);
		expect(res.body.message).toBe('No session found');
		expect(db.getUser).not.toHaveBeenCalled();
	});

	test('401 — token non valido: middleware requireAuth blocca la richiesta', async () => {
		checkToken.mockImplementation((token, cb) =>
			cb(new Error('invalid token'), null)
		);

		const res = await request(app)
			.get('/session/me')
			.set('Cookie', sessionCookie);

		expect(res.status).toBe(401);
		expect(res.body.message).toBe('Invalid or expired session');
		expect(db.getUser).not.toHaveBeenCalled();
	});

	test('404 — token valido ma utente non trovato nel DB', async () => {
		checkToken.mockImplementation((token, cb) => cb(null, { user_id: 99 }));
		db.getUser.mockResolvedValue(null);

		const res = await request(app)
			.get('/session/me')
			.set('Cookie', sessionCookie);

		expect(res.status).toBe(404);
		expect(res.body.message).toBe('User not found');
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /user/register
// ═════════════════════════════════════════════════════════════════════════════

describe('POST /user/register', () => {
	const validBody = {
		name: 'John Doe',
		email: 'john@example.com',
		password: 's3cr3tP@ssword'
	};

	beforeEach(() => {
		bcrypt.hash.mockResolvedValue('hashed-password');
		db.createUser.mockResolvedValue({ id: 1, name: 'John Doe' });
		db.createAuthProvider.mockResolvedValue({ id: 1, user_id: 1 });
		// Di default nessuna email duplicata
		db.getUserId.mockResolvedValue(null);
	});

	test('201 — registrazione avvenuta con successo', async () => {
		const res = await request(app).post('/user/register').send(validBody);

		expect(res.status).toBe(201);
		expect(res.body.message).toBe('User created successfully');
	});

	test('201 — la password viene hashata prima di essere salvata', async () => {
		await request(app).post('/user/register').send(validBody);

		expect(bcrypt.hash).toHaveBeenCalledWith('s3cr3tP@ssword', 12);
		expect(db.createAuthProvider).toHaveBeenCalledWith(
			1,
			'john@example.com',
			{ password: 'hashed-password' },
			'local'
		);
	});

	// ── Validazione campi obbligatori ──────────────────────────────────────

	test('400 — manca name', async () => {
		const res = await request(app)
			.post('/user/register')
			.send({ email: 'john@example.com', password: 's3cr3tP@ssword' });

		expect(res.status).toBe(400);
		expect(res.body.message).toBe('All fields are required');
	});

	test('400 — manca email', async () => {
		const res = await request(app)
			.post('/user/register')
			.send({ name: 'John', password: 's3cr3tP@ssword' });

		expect(res.status).toBe(400);
		expect(res.body.message).toBe('All fields are required');
	});

	test('400 — manca password', async () => {
		const res = await request(app)
			.post('/user/register')
			.send({ name: 'John', email: 'john@example.com' });

		expect(res.status).toBe(400);
		expect(res.body.message).toBe('All fields are required');
	});

	test('400 — body completamente vuoto', async () => {
		const res = await request(app).post('/user/register').send({});

		expect(res.status).toBe(400);
		expect(res.body.message).toBe('All fields are required');
	});

	// ── Validazione formato email ──────────────────────────────────────────

	test('400 — email senza @', async () => {
		const res = await request(app)
			.post('/user/register')
			.send({ ...validBody, email: 'notanemail' });

		expect(res.status).toBe(400);
		expect(res.body.message).toBe('Invalid email format');
	});

	test('400 — email senza dominio', async () => {
		const res = await request(app)
			.post('/user/register')
			.send({ ...validBody, email: 'john@' });

		expect(res.status).toBe(400);
		expect(res.body.message).toBe('Invalid email format');
	});

	test('400 — email con spazi', async () => {
		const res = await request(app)
			.post('/user/register')
			.send({ ...validBody, email: 'john @example.com' });

		expect(res.status).toBe(400);
		expect(res.body.message).toBe('Invalid email format');
	});

	// ── Validazione lunghezza password ────────────────────────────────────

	test('400 — password di 7 caratteri (sotto il minimo)', async () => {
		const res = await request(app)
			.post('/user/register')
			.send({ ...validBody, password: 'short1!' });

		expect(res.status).toBe(400);
		expect(res.body.message).toBe('Password must be at least 8 characters');
	});

	test('201 — password di esattamente 8 caratteri (al limite)', async () => {
		const res = await request(app)
			.post('/user/register')
			.send({ ...validBody, password: 'exactly8' });

		expect(res.status).toBe(201);
	});

	// ── Errori database ───────────────────────────────────────────────────

	test('500 — createUser fallisce', async () => {
		db.createUser.mockResolvedValue(null);

		const res = await request(app).post('/user/register').send(validBody);

		expect(res.status).toBe(500);
		expect(res.body.message).toBe('Could not create user');
		// Se createUser fallisce non si deve mai tentare createAuthProvider
		expect(db.createAuthProvider).not.toHaveBeenCalled();
	});

	test('500 — createAuthProvider fallisce', async () => {
		db.createAuthProvider.mockResolvedValue(null);

		const res = await request(app).post('/user/register').send(validBody);

		expect(res.status).toBe(500);
		expect(res.body.message).toBe('Could not create auth provider');
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// Middleware requireAuth — integrazione trasversale
// ═════════════════════════════════════════════════════════════════════════════

describe('Middleware requireAuth (integrazione su /session/me)', () => {
	test('popola req.userId con il valore decodificato dal token', async () => {
		checkToken.mockImplementation((token, cb) => cb(null, { user_id: 42 }));
		db.getUser.mockResolvedValue({ ...mockUser, id: 42 });

		const res = await request(app)
			.get('/session/me')
			.set('Cookie', sessionCookie);

		expect(db.getUser).toHaveBeenCalledWith(42);
		expect(res.status).toBe(200);
	});

	test('non chiama mai next() se il token è assente', async () => {
		const res = await request(app).get('/session/me');

		expect(res.status).toBe(401);
		expect(db.getUser).not.toHaveBeenCalled();
	});
});
