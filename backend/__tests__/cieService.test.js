// __tests__/cieService.test.js
// Unit test del servizio di autenticazione CIE (OIDC).
// Impostiamo le env PRIMA del require perché CONFIG è valutato al load.

process.env.CIE_CLIENT_ID = 'test-client-id';
process.env.CIE_CLIENT_SECRET = 'test-secret';

const {
	getAuthorizationUrl,
	getCieUserIdentity
} = require('../src/services/cieService');

describe('getAuthorizationUrl (generazione URL di autorizzazione)', () => {
	it('costruisce un URL con tutti i parametri OIDC richiesti', () => {
		const { url, state, nonce } = getAuthorizationUrl();
		const parsed = new URL(url);

		expect(parsed.searchParams.get('client_id')).toBe('test-client-id');
		expect(parsed.searchParams.get('response_type')).toBe('code');
		expect(parsed.searchParams.get('scope')).toBe('openid profile email');
		expect(parsed.searchParams.get('acr_values')).toBe(
			'https://www.spid.gov.it/CIE_L2'
		);
		expect(parsed.searchParams.get('state')).toBe(state);
		expect(parsed.searchParams.get('nonce')).toBe(nonce);
	});

	it('genera state e nonce esadecimali da 32 caratteri (16 byte)', () => {
		const { state, nonce } = getAuthorizationUrl();
		expect(state).toMatch(/^[0-9a-f]{32}$/);
		expect(nonce).toMatch(/^[0-9a-f]{32}$/);
	});

	it('genera valori diversi a ogni chiamata (anti-replay)', () => {
		const a = getAuthorizationUrl();
		const b = getAuthorizationUrl();
		expect(a.state).not.toBe(b.state);
		expect(a.nonce).not.toBe(b.nonce);
	});
});

describe('getCieUserIdentity (scambio code → identità certificata)', () => {
	beforeEach(() => {
		global.fetch = jest.fn();
	});
	afterEach(() => {
		delete global.fetch;
	});

	function mockJsonResponse(body, ok = true) {
		return { ok, json: () => Promise.resolve(body) };
	}

	it('restituisce identità completa quando token e userinfo vanno a buon fine', async () => {
		global.fetch
			.mockResolvedValueOnce(mockJsonResponse({ access_token: 'tok-123' }))
			.mockResolvedValueOnce(
				mockJsonResponse({
					fiscal_number: 'RSSMRA80A01H501U',
					given_name: 'Mario',
					family_name: 'Rossi',
					email: 'mario@example.com'
				})
			);

		const identity = await getCieUserIdentity('auth-code');

		expect(identity).toEqual({
			codiceFiscale: 'RSSMRA80A01H501U',
			email: 'mario@example.com',
			nomeCompleto: 'Mario Rossi'
		});
		expect(global.fetch).toHaveBeenCalledTimes(2);
	});

	it('usa una email di fallback @cie.internal se userinfo non la fornisce', async () => {
		global.fetch
			.mockResolvedValueOnce(mockJsonResponse({ access_token: 'tok-123' }))
			.mockResolvedValueOnce(
				mockJsonResponse({
					fiscal_number: 'RSSMRA80A01H501U',
					given_name: 'Mario',
					family_name: 'Rossi'
				})
			);

		const identity = await getCieUserIdentity('auth-code');

		expect(identity.email).toBe('rssmra80a01h501u@cie.internal');
	});

	it('lancia un errore se lo scambio del token fallisce (HTTP non ok)', async () => {
		global.fetch.mockResolvedValueOnce(
			mockJsonResponse({ error: 'invalid_grant' }, false)
		);

		await expect(getCieUserIdentity('bad-code')).rejects.toThrow(
			'Fallito lo scambio del token CIE'
		);
		expect(global.fetch).toHaveBeenCalledTimes(1);
	});

	it('lancia un errore se la risposta token contiene un campo error', async () => {
		global.fetch.mockResolvedValueOnce(
			mockJsonResponse({ error: 'invalid_request' }, true)
		);

		await expect(getCieUserIdentity('bad-code')).rejects.toThrow(
			'Fallito lo scambio del token CIE'
		);
	});

	it('lancia un errore se il recupero userinfo fallisce', async () => {
		global.fetch
			.mockResolvedValueOnce(mockJsonResponse({ access_token: 'tok-123' }))
			.mockResolvedValueOnce(mockJsonResponse({}, false));

		await expect(getCieUserIdentity('auth-code')).rejects.toThrow(
			'Impossibile recuperare i dati anagrafici CIE'
		);
	});
});
