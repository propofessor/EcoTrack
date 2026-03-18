const {
	describe,
	it,
	expect,
	beforeAll,
	beforeEach,
	afterAll
} = require('@jest/globals');
const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken'); // ← spostato qui, serve in molti describe

jest.mock('../src/db');
const db = require('../src/db');

let app;

beforeAll(() => {
	process.env.JWT_SECRET = 'test-secret-integration';

	app = express();
	app.use(express.json());
	app.use(cookieParser());

	const routes = require('../src/routes');
	app.use('/', routes);
});

afterAll(() => {
	delete process.env.JWT_SECRET;
	// jest.resetModules() rimosso — causava db.js non mockato nel test checkToken
});

beforeEach(() => {
	jest.clearAllMocks();
});

// ────────────────────────────────────────────────────────────────────────────
// utils.js righe 18-19 — checkToken senza JWT_SECRET
// ────────────────────────────────────────────────────────────────────────────
describe('checkToken senza JWT_SECRET', () => {
	it('restituisce null se JWT_SECRET non è impostato', () => {
		const originalSecret = process.env.JWT_SECRET;
		delete process.env.JWT_SECRET;

		const { checkToken } = require('../src/utils');
		const result = checkToken('qualsiasi-token', () => {});
		expect(result).toBeNull();

		process.env.JWT_SECRET = originalSecret;
	});
});

// ────────────────────────────────────────────────────────────────────────────
// POST /session/login
// ────────────────────────────────────────────────────────────────────────────
describe('POST /session/login', () => {
	it('risponde 200 e imposta il cookie di sessione con credenziali valide', async () => {
		db.getUserId.mockResolvedValueOnce(123);

		const res = await request(app)
			.post('/session/login')
			.send({
				provider_user_id: 'user@example.com',
				provider_data: { password: 'secret' },
				provider_type_name: 'local'
			});

		expect(res.status).toBe(200);
		expect(res.body).toHaveProperty('token');
		expect(res.headers['set-cookie']).toBeDefined();
		expect(res.headers['set-cookie'][0]).toMatch(/session=/);
	});

	it('risponde 401 con credenziali errate', async () => {
		db.getUserId.mockResolvedValueOnce(null);

		const res = await request(app)
			.post('/session/login')
			.send({
				provider_user_id: 'wrong@example.com',
				provider_data: { password: 'wrong' },
				provider_type_name: 'local'
			});

		expect(res.status).toBe(401);
		expect(res.body.message).toBe('Invalid credentials');
	});

	it('risponde 500 se createSession non riesce a generare il token', async () => {
		db.getUserId.mockResolvedValueOnce(123);

		const originalSecret = process.env.JWT_SECRET;
		delete process.env.JWT_SECRET;

		const res = await request(app)
			.post('/session/login')
			.send({
				provider_user_id: 'user@example.com',
				provider_data: { password: 'secret' },
				provider_type_name: 'local'
			});

		expect(res.status).toBe(500);
		expect(res.body.message).toBe('Internal server error');

		process.env.JWT_SECRET = originalSecret;
	});
});

// ────────────────────────────────────────────────────────────────────────────
// POST /session/logout
// ────────────────────────────────────────────────────────────────────────────
describe('POST /session/logout', () => {
	it('risponde 200 e cancella il cookie di sessione', async () => {
		const res = await request(app).post('/session/logout');

		expect(res.status).toBe(200);
		expect(res.body.message).toBe('Logged out successfully');
		const cookie = res.headers['set-cookie']?.[0] ?? '';
		const isCleared =
			cookie.includes('Max-Age=0') ||
			cookie.includes('Expires=Thu, 01 Jan 1970');
		expect(isCleared).toBe(true);
	});
});

// ────────────────────────────────────────────────────────────────────────────
// GET /session/validate
// ────────────────────────────────────────────────────────────────────────────
describe('GET /session/validate', () => {
	it('risponde { valid: false } senza cookie', async () => {
		const res = await request(app).get('/session/validate');
		expect(res.status).toBe(200);
		expect(res.body.valid).toBe(false);
	});

	it('risponde { valid: true, user } con un token valido', async () => {
		const token = jwt.sign({ user_id: 7 }, process.env.JWT_SECRET, {
			expiresIn: '1h'
		});

		db.getUser.mockResolvedValueOnce({
			id: 7,
			name: 'Alice',
			email: 'alice@example.com'
		});

		const res = await request(app)
			.get('/session/validate')
			.set('Cookie', `session=${token}`);

		expect(res.status).toBe(200);
		expect(res.body.valid).toBe(true);
		expect(res.body.user).toMatchObject({ id: 7, name: 'Alice' });
	});
});

// ────────────────────────────────────────────────────────────────────────────
// POST /session/refresh
// ────────────────────────────────────────────────────────────────────────────
describe('POST /session/refresh', () => {
	it("risponde 200 con 'No session found' se non c'è il cookie", async () => {
		const res = await request(app).post('/session/refresh');

		expect(res.status).toBe(200);
		expect(res.body.message).toBe('No session found');
	});

	it("risponde 200 con 'Invalid or expired session' per un token malformato", async () => {
		const res = await request(app)
			.post('/session/refresh')
			.set('Cookie', 'session=questo.non.e.un.jwt.valido');

		expect(res.status).toBe(200);
		expect(res.body.message).toBe('Invalid or expired session');
	});

	it("risponde 200 con 'Invalid or expired session' per un token scaduto", async () => {
		const expiredToken = jwt.sign({ user_id: 1 }, process.env.JWT_SECRET, {
			expiresIn: -1
		});

		const res = await request(app)
			.post('/session/refresh')
			.set('Cookie', `session=${expiredToken}`);

		expect(res.status).toBe(200);
		expect(res.body.message).toBe('Invalid or expired session');
	});

	it("risponde 200 con 'Session refreshed' e imposta un nuovo cookie per token valido", async () => {
		const token = jwt.sign({ user_id: 42 }, process.env.JWT_SECRET, {
			expiresIn: '1h'
		});

		const res = await request(app)
			.post('/session/refresh')
			.set('Cookie', `session=${token}`);

		expect(res.status).toBe(200);
		expect(res.body.message).toBe('Session refreshed');
		expect(res.headers['set-cookie']).toBeDefined();
		expect(res.headers['set-cookie'][0]).toMatch(/session=/);
	});
});

// ────────────────────────────────────────────────────────────────────────────
// GET /session/me  ← un solo describe, sostituisce i due del file originale
// ────────────────────────────────────────────────────────────────────────────
describe('GET /session/me', () => {
	it("risponde 401 con 'No session found' senza cookie", async () => {
		const res = await request(app).get('/session/me');

		expect(res.status).toBe(401);
		expect(res.body.message).toBe('No session found');
	});

	it("risponde 401 con 'Invalid or expired session' per token malformato", async () => {
		const res = await request(app)
			.get('/session/me')
			.set('Cookie', 'session=token.non.valido');

		expect(res.status).toBe(401);
		expect(res.body.message).toBe('Invalid or expired session');
	});

	it("risponde 401 con 'Invalid or expired session' per token scaduto", async () => {
		const expiredToken = jwt.sign({ user_id: 1 }, process.env.JWT_SECRET, {
			expiresIn: -1
		});

		const res = await request(app)
			.get('/session/me')
			.set('Cookie', `session=${expiredToken}`);

		expect(res.status).toBe(401);
		expect(res.body.message).toBe('Invalid or expired session');
	});

	it("risponde 404 con 'User not found' se il token è valido ma lo user non esiste nel DB", async () => {
		const token = jwt.sign({ user_id: 999 }, process.env.JWT_SECRET, {
			expiresIn: '1h'
		});

		db.getUser.mockResolvedValueOnce(null);

		const res = await request(app)
			.get('/session/me')
			.set('Cookie', `session=${token}`);

		expect(res.status).toBe(404);
		expect(res.body.message).toBe('User not found');
	});

	it("risponde 200 con i dati dell'utente per sessione valida", async () => {
		const token = jwt.sign({ user_id: 5 }, process.env.JWT_SECRET, {
			expiresIn: '1h'
		});

		db.getUser.mockResolvedValueOnce({
			id: 5,
			name: 'Eve',
			email: 'eve@example.com'
		});

		const res = await request(app)
			.get('/session/me')
			.set('Cookie', `session=${token}`);

		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({
			id: 5,
			name: 'Eve',
			email: 'eve@example.com'
		});
	});
});

// ────────────────────────────────────────────────────────────────────────────
// POST /user/register
// ────────────────────────────────────────────────────────────────────────────
describe('POST /user/register', () => {
	it('risponde 201 con tutti i campi validi', async () => {
		db.createUser.mockResolvedValueOnce({ id: 1, name: 'Bob' });
		db.createAuthProvider.mockResolvedValueOnce({ id: 10 });

		const res = await request(app).post('/user/register').send({
			name: 'Bob',
			email: 'bob@example.com',
			password: 'pass123'
		});

		expect(res.status).toBe(201);
		expect(res.body.message).toBe('User created successfully');
	});

	it('risponde 400 se manca un campo obbligatorio', async () => {
		const res = await request(app)
			.post('/user/register')
			.send({ name: 'Bob', email: 'bob@example.com' });

		expect(res.status).toBe(400);
		expect(res.body.message).toBe('All fields are required');
	});

	it('risponde 500 se la creazione dello user fallisce', async () => {
		db.createUser.mockResolvedValueOnce(null);

		const res = await request(app).post('/user/register').send({
			name: 'Bob',
			email: 'bob@example.com',
			password: 'pass123'
		});

		expect(res.status).toBe(500);
		expect(res.body.message).toBe('Could not create user');
	});

	it("risponde 500 se la creazione dell'auth provider fallisce", async () => {
		db.createUser.mockResolvedValueOnce({ id: 2, name: 'Carol' });
		db.createAuthProvider.mockResolvedValueOnce(null);

		const res = await request(app).post('/user/register').send({
			name: 'Carol',
			email: 'carol@example.com',
			password: 'pass123'
		});

		expect(res.status).toBe(500);
		expect(res.body.message).toBe('Could not create auth provider');
	});

	it('chiama createUser e createAuthProvider con i parametri corretti', async () => {
		db.createUser.mockResolvedValueOnce({ id: 11, name: 'Grace' });
		db.createAuthProvider.mockResolvedValueOnce({ id: 20 });

		await request(app).post('/user/register').send({
			name: 'Grace',
			email: 'grace@example.com',
			password: 'pass123'
		});

		expect(db.createUser).toHaveBeenCalledWith('Grace');
		expect(db.createAuthProvider).toHaveBeenCalledWith(
			11,
			'grace@example.com',
			{ password: 'pass123' },
			'local'
		);
	});
});
