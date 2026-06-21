const { EventEmitter } = require('events');

jest.mock('https');
jest.mock('../src/db', () => ({
	supabaseAdmin: { from: jest.fn() }
}));

const https = require('https');
const { supabaseAdmin } = require('../src/db');
const { notifyUser, notifyMany } = require('../src/services/notificationService');


function mockHttpsSuccess(responseBody) {
	const write = jest.fn();
	const end = jest.fn();
	https.request.mockImplementation((url, options, cb) => {
		const resStream = new EventEmitter();
		cb(resStream);
		resStream.emit('data', JSON.stringify(responseBody));
		resStream.emit('end');
		return { on: jest.fn(), write, end };
	});
	return { write, end };
}


function mockHttpsError(message) {
	https.request.mockImplementation(() => {
		const req = new EventEmitter();
		req.write = jest.fn();
		req.end = jest.fn();
		process.nextTick(() => req.emit('error', new Error(message)));
		return req;
	});
}


function singleChain(result) {
	const chain = {
		select: jest.fn(() => chain),
		eq: jest.fn(() => chain),
		single: jest.fn(() => Promise.resolve(result))
	};
	return chain;
}


function inChain(result) {
	const chain = {
		select: jest.fn(() => chain),
		in: jest.fn(() => Promise.resolve(result))
	};
	return chain;
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe('notifyUser (RF11.2 - notifica voto giornaliero)', () => {
	it('invia una push se l’utente ha un token Expo memorizzato', async () => {
		supabaseAdmin.from.mockReturnValue(
			singleChain({
				data: { preferences: { expo_push_token: 'ExponentPushToken[abc]' } }
			})
		);
		const { write } = mockHttpsSuccess({ data: [{ status: 'ok' }] });

		await notifyUser('user-1', 'Titolo', 'Corpo', { foo: 'bar' });

		expect(https.request).toHaveBeenCalledTimes(1);
		const payload = JSON.parse(write.mock.calls[0][0])[0];
		expect(payload.to).toBe('ExponentPushToken[abc]');
		expect(payload.title).toBe('Titolo');
		expect(payload.body).toBe('Corpo');
		expect(payload.data).toEqual({ foo: 'bar' });
	});

	it('non invia nulla se l’utente non ha un token', async () => {
		supabaseAdmin.from.mockReturnValue(
			singleChain({ data: { preferences: {} } })
		);

		await notifyUser('user-1', 'Titolo', 'Corpo');

		expect(https.request).not.toHaveBeenCalled();
	});

	it('non invia nulla se l’utente non esiste', async () => {
		supabaseAdmin.from.mockReturnValue(singleChain({ data: null }));

		await notifyUser('user-inesistente', 'Titolo', 'Corpo');

		expect(https.request).not.toHaveBeenCalled();
	});

	it('gestisce con grazia un errore di rete (risolve senza lanciare)', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
		supabaseAdmin.from.mockReturnValue(
			singleChain({
				data: { preferences: { expo_push_token: 'ExponentPushToken[abc]' } }
			})
		);
		mockHttpsError('connessione rifiutata');

		await expect(
			notifyUser('user-1', 'Titolo', 'Corpo')
		).resolves.toBeUndefined();
		expect(warnSpy).toHaveBeenCalled();
		warnSpy.mockRestore();
	});
});

describe('notifyMany (RF11.7 - notifiche settimanali classifica)', () => {
	it('invia un batch solo agli utenti con token, usando messageFactory', async () => {
		supabaseAdmin.from.mockReturnValue(
			inChain({
				data: [
					{ id: 'u1', preferences: { expo_push_token: 'ExponentPushToken[1]' } },
					{ id: 'u2', preferences: {} },
					{ id: 'u3', preferences: { expo_push_token: 'ExponentPushToken[3]' } }
				]
			})
		);
		const { write } = mockHttpsSuccess({ data: [] });

		await notifyMany(['u1', 'u2', 'u3'], (id) => ({
			title: `Ciao ${id}`,
			body: 'Risultati settimanali'
		}));

		expect(https.request).toHaveBeenCalledTimes(1);
		const messages = JSON.parse(write.mock.calls[0][0]);
		expect(messages).toHaveLength(2);
		expect(messages.map((m) => m.to)).toEqual([
			'ExponentPushToken[1]',
			'ExponentPushToken[3]'
		]);
		expect(messages[0].title).toBe('Ciao u1');
	});

	it('non fa nulla con una lista di userIds vuota', async () => {
		await notifyMany([], () => ({ title: 't', body: 'b' }));
		expect(supabaseAdmin.from).not.toHaveBeenCalled();
		expect(https.request).not.toHaveBeenCalled();
	});

	it('non invia nulla se nessun utente ha un token', async () => {
		supabaseAdmin.from.mockReturnValue(
			inChain({ data: [{ id: 'u1', preferences: {} }] })
		);

		await notifyMany(['u1'], () => ({ title: 't', body: 'b' }));

		expect(https.request).not.toHaveBeenCalled();
	});

	it('gestisce con grazia un errore di rete nel batch', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
		supabaseAdmin.from.mockReturnValue(
			inChain({
				data: [
					{ id: 'u1', preferences: { expo_push_token: 'ExponentPushToken[1]' } }
				]
			})
		);
		mockHttpsError('timeout');

		await expect(
			notifyMany(['u1'], () => ({ title: 't', body: 'b' }))
		).resolves.toBeNull();
		expect(warnSpy).toHaveBeenCalled();
		warnSpy.mockRestore();
	});
});
