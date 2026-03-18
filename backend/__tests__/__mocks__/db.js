/**
 * __tests__/__mocks__/db.js
 *
 * Mock manuale del modulo src/db.js.
 * Jest lo sostituisce automaticamente quando i test chiamano
 * jest.mock('../../src/db') oppure se la cartella si chiama __mocks__
 * e si trova accanto alla cartella src.
 *
 * Ogni funzione è un jest.fn() con un valore di ritorno di default
 * sensato. I singoli test possono sovrascriverlo con .mockResolvedValueOnce().
 */

const db = {
	getUserId: jest.fn().mockResolvedValue(null),
	getUser: jest.fn().mockResolvedValue(null),
	createUser: jest.fn().mockResolvedValue(null),
	createAuthProvider: jest.fn().mockResolvedValue(null),
	getProviderTypeId: jest.fn().mockResolvedValue(null)
};

module.exports = db;
