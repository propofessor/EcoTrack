const db = require('./db');
const routes = require('express')();
const sessionRoutes = require('express')();
const userRoutes = require('express')();
const { createSession, checkToken } = require('./utils');

sessionRoutes.post('/login', async (req, res) => {
	const { provider_user_id, provider_data, provider_type_name } = req.body;

	const userId = await db.getUserId(
		provider_user_id,
		provider_data,
		provider_type_name
	);

	if (!userId) {
		res.status(401);
		return res.json({ message: 'Invalid credentials' });
	}

	const token = createSession(userId);

	if (!token) {
		res.status(500);
		return res.json({ message: 'Internal server error' });
	}

	res.cookie('session', token, {
		//change in production
		httpOnly: true,
		sameSite: 'lax',
		secure: false,
		domain: 'localhost',
		maxAge: 7 * 24 * 60 * 60 * 1000
	});

	res.status(200);
	return res.json({ token });
});

sessionRoutes.post('/logout', (req, res) => {
	res.clearCookie('session', {
		httpOnly: true,
		sameSite: 'lax',
		secure: false,
		domain: 'localhost'
	});

	res.status(200);
	return res.json({ message: 'Logged out successfully' });
});

sessionRoutes.get('/validate', async (req, res) => {
	const token = req.cookies.session;

	if (!token) {
		res.status(200);
		return res.json({ valid: false });
	}

	checkToken(token, async (err, decoded) => {
		if (err) {
			res.status(200);
			return res.json({ valid: false });
		}

		const user = await db.getUser(decoded.user_id);

		if (!user) {
			res.status(200);
			return res.json({ valid: false });
		}

		res.status(200);
		return res.json({ valid: true, user });
	});
});

sessionRoutes.post('/refresh', (req, res) => {
	const token = req.cookies.session;

	if (!token) {
		res.status(200);
		return res.json({ message: 'No session found' });
	}

	checkToken(token, (err, decoded) => {
		if (err) {
			res.status(200);
			return res.json({ message: 'Invalid or expired session' });
		}

		const newToken = createSession(decoded.user_id);

		res.cookie('session', newToken, {
			httpOnly: true,
			sameSite: 'lax',
			secure: false,
			domain: 'localhost',
			maxAge: 7 * 24 * 60 * 60 * 1000
		});

		res.status(200);
		return res.json({ message: 'Session refreshed' });
	});
});

sessionRoutes.get('/me', async (req, res) => {
	const token = req.cookies.session;
	console.log('cookies:', req.cookies);

	if (!token) {
		res.status(401);
		return res.json({ message: 'No session found' });
	}

	checkToken(token, async (err, decoded) => {
		if (err) {
			res.status(401);
			return res.json({ message: 'Invalid or expired session' });
		}

		const user = await db.getUser(decoded.user_id);

		if (!user) {
			res.status(404);
			return res.json({ message: 'User not found' });
		}

		res.status(200);
		return res.json(user);
	});
});

userRoutes.post('/register', async (req, res) => {
	const { name, email, password } = req.body;

	if (!name || !email || !password) {
		res.status(400);
		return res.json({ message: 'All fields are required' });
	}

	const user = await db.createUser(name);

	if (!user) {
		res.status(500);
		return res.json({ message: 'Could not create user' });
	}

	const authProvider = await db.createAuthProvider(
		user.id,
		email,
		{ password },
		'local'
	);

	if (!authProvider) {
		res.status(500);
		return res.json({ message: 'Could not create auth provider' });
	}

	res.status(201);
	return res.json({ message: 'User created successfully' });
});

/**
 * @openapi
 * /:
 *  get:
 *    description: Welcome to swagger-jsdoc!
 *    responses:
 *      200:
 *        description: Returns a mysterious string.
 */
routes.use('/session', sessionRoutes).use('/user', userRoutes);

module.exports = routes;
