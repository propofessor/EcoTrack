const request = require('supertest');

jest.mock('../src/db', () => ({
	db: { auth: { getUser: jest.fn() } },
	supabaseAdmin: {
		from: jest.fn(),
		auth: {
			admin: {
				updateUserById: jest.fn(),
				deleteUser: jest.fn()
			}
		}
	}
}));

const app = require('../src/index');
const { db, supabaseAdmin } = require('../src/db');

const UTENTE = {
	id: 'utente-123',
	email: 'mario@example.com',
	user_metadata: { name: 'Mario Rossi', plate: 'AB123CD' }
};


function selectSingleChain(result) {
	const c = {
		select: jest.fn(() => c),
		eq: jest.fn(() => c),
		single: jest.fn(() => Promise.resolve(result))
	};
	return c;
}


function updateChain(result) {
	const c = {
		update: jest.fn(() => c),
		eq: jest.fn(() => Promise.resolve(result))
	};
	return c;
}

beforeEach(() => {
	jest.clearAllMocks();

	db.auth.getUser.mockResolvedValue({ data: { user: UTENTE }, error: null });
});


describe('Auth middleware (ramo catch)', () => {
	it('restituisce 500 se la verifica del token solleva un’eccezione', async () => {
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		db.auth.getUser.mockRejectedValue(new Error('Supabase down'));

		const res = await request(app)
			.get('/api/users/me')
			.set('Cookie', ['access_token=token']);

		expect(res.statusCode).toBe(500);
		expect(res.body.error).toBe('Errore interno di autenticazione');
		errSpy.mockRestore();
	});
});


describe('PUT /api/users/me (ramo catch)', () => {
	it('restituisce 500 se updateUserById solleva un’eccezione', async () => {
		supabaseAdmin.auth.admin.updateUserById.mockRejectedValue(
			new Error('crash')
		);

		const res = await request(app)
			.put('/api/users/me')
			.set('Cookie', ['access_token=token'])
			.send({ name: 'Nuovo Nome' });

		expect(res.statusCode).toBe(500);
		expect(res.body.error).toBe('Errore interno del server');
	});
});


describe('PUT /api/users/me/password', () => {
	it('restituisce 400 se manca newPassword', async () => {
		const res = await request(app)
			.put('/api/users/me/password')
			.set('Cookie', ['access_token=token'])
			.send({});
		expect(res.statusCode).toBe(400);
		expect(res.body.error).toBe('newPassword è obbligatoria');
	});

	it('restituisce 400 se la password è debole (RF6.4)', async () => {
		const res = await request(app)
			.put('/api/users/me/password')
			.set('Cookie', ['access_token=token'])
			.send({ newPassword: 'debole' });
		expect(res.statusCode).toBe(400);
		expect(res.body.error).toContain('password');
	});

	it('restituisce 400 se Supabase non riesce ad aggiornare', async () => {
		supabaseAdmin.auth.admin.updateUserById.mockResolvedValue({
			error: { message: 'KO' }
		});
		const res = await request(app)
			.put('/api/users/me/password')
			.set('Cookie', ['access_token=token'])
			.send({ newPassword: 'PasswordSicura123!' });
		expect(res.statusCode).toBe(400);
		expect(res.body.error).toBe('Impossibile aggiornare la password');
	});

	it('restituisce 200 quando la password viene aggiornata', async () => {
		supabaseAdmin.auth.admin.updateUserById.mockResolvedValue({ error: null });
		const res = await request(app)
			.put('/api/users/me/password')
			.set('Cookie', ['access_token=token'])
			.send({ newPassword: 'PasswordSicura123!' });
		expect(res.statusCode).toBe(200);
		expect(res.body.message).toBe('Password aggiornata con successo');
		expect(supabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith(
			'utente-123',
			{ password: 'PasswordSicura123!' }
		);
	});

	it('restituisce 500 in caso di eccezione', async () => {
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		supabaseAdmin.auth.admin.updateUserById.mockRejectedValue(
			new Error('crash')
		);
		const res = await request(app)
			.put('/api/users/me/password')
			.set('Cookie', ['access_token=token'])
			.send({ newPassword: 'PasswordSicura123!' });
		expect(res.statusCode).toBe(500);
		errSpy.mockRestore();
	});
});


describe('PUT /api/users/me/push-token', () => {
	it('restituisce 400 se manca expo_push_token', async () => {
		const res = await request(app)
			.put('/api/users/me/push-token')
			.set('Cookie', ['access_token=token'])
			.send({});
		expect(res.statusCode).toBe(400);
		expect(res.body.error).toBe('expo_push_token è obbligatorio');
	});

	it('salva il token unendolo alle preferenze esistenti (200)', async () => {
		supabaseAdmin.from
			.mockReturnValueOnce(
				selectSingleChain({ data: { preferences: { theme: 'dark' } } })
			)
			.mockReturnValueOnce(updateChain({ error: null }));

		const res = await request(app)
			.put('/api/users/me/push-token')
			.set('Cookie', ['access_token=token'])
			.send({ expo_push_token: 'ExponentPushToken[xyz]' });

		expect(res.statusCode).toBe(200);
		expect(res.body.message).toBe('Push token salvato');
	});

	it('restituisce 400 se Supabase non riesce a salvare', async () => {
		supabaseAdmin.from
			.mockReturnValueOnce(selectSingleChain({ data: { preferences: {} } }))
			.mockReturnValueOnce(updateChain({ error: { message: 'KO' } }));

		const res = await request(app)
			.put('/api/users/me/push-token')
			.set('Cookie', ['access_token=token'])
			.send({ expo_push_token: 'ExponentPushToken[xyz]' });

		expect(res.statusCode).toBe(400);
		expect(res.body.error).toBe('Impossibile salvare il push token');
	});

	it('restituisce 500 in caso di eccezione', async () => {
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		supabaseAdmin.from.mockImplementation(() => {
			throw new Error('crash');
		});

		const res = await request(app)
			.put('/api/users/me/push-token')
			.set('Cookie', ['access_token=token'])
			.send({ expo_push_token: 'ExponentPushToken[xyz]' });

		expect(res.statusCode).toBe(500);
		errSpy.mockRestore();
	});
});


describe('DELETE /api/users/me (ramo catch)', () => {
	it('restituisce 500 se deleteUser solleva un’eccezione', async () => {
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		supabaseAdmin.auth.admin.deleteUser.mockRejectedValue(new Error('crash'));

		const res = await request(app)
			.delete('/api/users/me')
			.set('Cookie', ['access_token=token']);

		expect(res.statusCode).toBe(500);
		expect(res.body.error).toBe('Errore interno del server');
		errSpy.mockRestore();
	});
});
