const db = require('./db');
const routes = require('express')();
const sessionRoutes = require('express')();
const userRoutes = require('express')();
const { createSession, checkToken } = require('./utils');

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: John Doe
 *         email:
 *           type: string
 *           example: john@example.com
 *     AuthToken:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     MessageResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Operation successful
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: An error occurred
 *   securitySchemes:
 *     cookieAuth:
 *       type: apiKey
 *       in: cookie
 *       name: session
 */

/**
 * @swagger
 * /session/login:
 *   post:
 *     summary: Log in a user via an auth provider
 *     tags: [Session]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider_user_id
 *               - provider_data
 *               - provider_type_name
 *             properties:
 *               provider_user_id:
 *                 type: string
 *                 example: "google-oauth2|123456789"
 *               provider_data:
 *                 type: object
 *                 description: Provider-specific auth payload (e.g. OAuth tokens, password hash)
 *                 example: { "password": "s3cr3t" }
 *               provider_type_name:
 *                 type: string
 *                 example: local
 *     responses:
 *       200:
 *         description: Login successful. Sets a session cookie and returns the token.
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: session=eyJ...; HttpOnly; SameSite=Lax
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthToken'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error — session could not be created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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

/**
 * @swagger
 * /session/logout:
 *   post:
 *     summary: Log out the current user
 *     tags: [Session]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logout successful. Clears the session cookie.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *             example:
 *               message: Logged out successfully
 */
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

/**
 * @swagger
 * /session/validate:
 *   get:
 *     summary: Validate the current session cookie
 *     tags: [Session]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: >
 *           Always returns 200. Check the `valid` field to determine
 *           whether the session is active.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     valid:
 *                       type: boolean
 *                       example: true
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                 - type: object
 *                   properties:
 *                     valid:
 *                       type: boolean
 *                       example: false
 */
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

/**
 * @swagger
 * /session/refresh:
 *   post:
 *     summary: Refresh the current session token
 *     tags: [Session]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: >
 *           Always returns 200. On success a new session cookie is set.
 *           Check the `message` field for details on failure cases.
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: session=eyJ...; HttpOnly; SameSite=Lax
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *             examples:
 *               refreshed:
 *                 value:
 *                   message: Session refreshed
 *               noSession:
 *                 value:
 *                   message: No session found
 *               invalidSession:
 *                 value:
 *                   message: Invalid or expired session
 */
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

/**
 * @swagger
 * /session/me:
 *   get:
 *     summary: Get the currently authenticated user
 *     tags: [Session]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Returns the authenticated user's profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Missing or invalid session cookie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               noSession:
 *                 value:
 *                   message: No session found
 *               invalidSession:
 *                 value:
 *                   message: Invalid or expired session
 *       404:
 *         description: Authenticated user ID not found in the database
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: User not found
 */
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

/**
 * @swagger
 * /user/register:
 *   post:
 *     summary: Register a new user with local email/password auth
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: s3cr3tP@ssword
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *             example:
 *               message: User created successfully
 *       400:
 *         description: One or more required fields are missing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: All fields are required
 *       500:
 *         description: Database error while creating the user or auth provider
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               userCreationFailed:
 *                 value:
 *                   message: Could not create user
 *               authProviderFailed:
 *                 value:
 *                   message: Could not create auth provider
 */
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

routes.use('/session', sessionRoutes).use('/user', userRoutes);

module.exports = routes;
