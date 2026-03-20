/**
 * Unit test per src/utils.js
 *
 * Questi test non toccano il database né Supabase.
 * Verificano solo la logica JWT: creazione e verifica token.
 */

const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');

// Imposta il secret PRIMA di richiedere il modulo,
// così process.env.JWT_SECRET è già disponibile al momento del require.
beforeAll(() => {
	process.env.JWT_SECRET = 'test-secret-per-i-test-unitari';
});

afterAll(() => {
	delete process.env.JWT_SECRET;
});

const { createSession, checkToken } = require('../src/utils');

describe('createSession', () => {
	it('restituisce un token JWT valido dato un user_id', () => {
		const token = createSession(42);
		expect(typeof token).toBe('string');
		// Un JWT ha sempre tre parti separate da punto
		expect(token.split('.')).toHaveLength(3);
	});

	it('lancia un errore se JWT_SECRET non è impostato', () => {
		const originalSecret = process.env.JWT_SECRET;
		delete process.env.JWT_SECRET;

		expect(() => createSession(42)).toThrow('JWT_SECRET not set.');

		process.env.JWT_SECRET = originalSecret;
	});
});

describe('checkToken', () => {
	it('chiama il callback con il payload decodificato per un token valido', (done) => {
		const token = createSession(99);

		checkToken(token, (err, decoded) => {
			expect(err).toBeNull();
			expect(decoded).toMatchObject({ user_id: 99 });
			done();
		});
	});

	it('chiama il callback con un errore per un token con firma alterata', (done) => {
		// Alteriamo il payload mantenendo header e signature invariati
		const token = createSession(1);
		const [header, , signature] = token.split('.');
		const fakePayload = Buffer.from(
			JSON.stringify({ user_id: 9999 })
		).toString('base64url');
		const tamperedToken = `${header}.${fakePayload}.${signature}`;

		checkToken(tamperedToken, (err) => {
			expect(err).not.toBeNull();
			done();
		});
	});

	it('chiama il callback con un errore per un token scaduto', (done) => {
		const jwt = require('jsonwebtoken');
		// Creiamo un token già scaduto usando iat/exp nel passato
		const expiredToken = jwt.sign(
			{ user_id: 1 },
			process.env.JWT_SECRET,
			{ expiresIn: -1 } // scaduto immediatamente
		);

		checkToken(expiredToken, (err) => {
			expect(err).not.toBeNull();
			expect(err.name).toBe('TokenExpiredError');
			done();
		});
	});

	it('lancia errore se JWT_SECRET non è impostato', (done) => {
		const originalSecret = process.env.JWT_SECRET;
		delete process.env.JWT_SECRET;

		expect(() => checkToken('some-token', () => {})).toThrow(
			'JWT_SECRET not set.'
		);

		process.env.JWT_SECRET = originalSecret;
		done();
	});
});
