jest.mock('../src/db', () => ({
	supabaseAdmin: { from: jest.fn() }
}));

describe('checkApiKey middleware', () => {
	let checkApiKey;
	let supabaseAdmin;
	let res;
	let next;

	function makeRes() {
		return {
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis()
		};
	}

	function makeReq(apiKey) {
		return {
			header: jest.fn((name) => (name === 'x-api-key' ? apiKey : undefined))
		};
	}



	function makeChain(singleResult) {
		const chain = {};
		chain.select = jest.fn(() => chain);
		chain.eq = jest.fn(() => chain);
		chain.single = jest.fn(() => Promise.resolve(singleResult));
		chain.update = jest.fn(() => chain);
		chain.then = jest.fn((onFulfilled) => {
			if (onFulfilled) onFulfilled();
			return { catch: jest.fn() };
		});
		return chain;
	}

	beforeEach(() => {
		jest.resetModules();
		checkApiKey = require('../src/middleware/apiKeyMiddleware');
		supabaseAdmin = require('../src/db').supabaseAdmin;
		supabaseAdmin.from.mockReset();
		res = makeRes();
		next = jest.fn();
	});

	it('restituisce 401 se manca la API Key', async () => {
		await checkApiKey(makeReq(undefined), res, next);
		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ error: 'API Key mancante.' });
		expect(next).not.toHaveBeenCalled();
	});

	it('chiama next() e popola la cache per una key valida e attiva', async () => {
		supabaseAdmin.from.mockReturnValue(
			makeChain({ data: { id: 'key-1', is_active: true }, error: null })
		);

		await checkApiKey(makeReq('valida'), res, next);

		expect(next).toHaveBeenCalledTimes(1);
		expect(res.status).not.toHaveBeenCalled();

		expect(supabaseAdmin.from).toHaveBeenCalledWith('api_keys');
	});

	it('restituisce 403 se la key non esiste o è disabilitata', async () => {
		supabaseAdmin.from.mockReturnValue(
			makeChain({ data: null, error: { message: 'not found' } })
		);

		await checkApiKey(makeReq('inesistente'), res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({
			error: 'API Key non valida o disabilitata.'
		});
		expect(next).not.toHaveBeenCalled();
	});

	it('serve dalla cache una key valida senza ricontattare il DB', async () => {
		supabaseAdmin.from.mockReturnValue(
			makeChain({ data: { id: 'key-1', is_active: true }, error: null })
		);

		await checkApiKey(makeReq('stessa-key'), res, next);
		const dbCallsAfterFirst = supabaseAdmin.from.mock.calls.length;


		const res2 = makeRes();
		const next2 = jest.fn();
		await checkApiKey(makeReq('stessa-key'), res2, next2);

		expect(next2).toHaveBeenCalledTimes(1);
		expect(supabaseAdmin.from.mock.calls.length).toBe(dbCallsAfterFirst);
	});

	it('serve dalla cache una key invalida (403) senza ricontattare il DB', async () => {
		supabaseAdmin.from.mockReturnValue(
			makeChain({ data: null, error: { message: 'nope' } })
		);

		await checkApiKey(makeReq('key-cattiva'), res, next);
		const dbCallsAfterFirst = supabaseAdmin.from.mock.calls.length;

		const res2 = makeRes();
		const next2 = jest.fn();
		await checkApiKey(makeReq('key-cattiva'), res2, next2);

		expect(res2.status).toHaveBeenCalledWith(403);
		expect(res2.json).toHaveBeenCalledWith({ error: 'API Key non valida.' });
		expect(next2).not.toHaveBeenCalled();
		expect(supabaseAdmin.from.mock.calls.length).toBe(dbCallsAfterFirst);
	});

	it('restituisce 500 se la query al DB solleva un errore', async () => {
		const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		const chain = {
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			single: jest.fn(() => Promise.reject(new Error('boom')))
		};
		supabaseAdmin.from.mockReturnValue(chain);

		await checkApiKey(makeReq('esplode'), res, next);

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith({
			error: 'Errore interno del server.'
		});
		expect(next).not.toHaveBeenCalled();
		errorSpy.mockRestore();
	});
});
