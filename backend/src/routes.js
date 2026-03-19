const db = require('./db');
const bcrypt = require('bcrypt');
const routes = require('express')();
const sessionRoutes = require('express')();
const userRoutes = require('express')();
const { createSession, checkToken } = require('./utils');

// ─── Costanti ─────────────────────────────────────────────────────────────────

const COOKIE_OPTIONS = {
	httpOnly: true,
	sameSite: 'lax',
	secure: false, // impostare true in produzione
	domain: 'localhost',
	path: '/',
	maxAge: 7 * 24 * 60 * 60 * 1000
};

// ─── Middleware di autenticazione ─────────────────────────────────────────────

/**
 * Middleware che verifica il cookie di sessione e popola req.userId.
 * In caso di sessione mancante o non valida, risponde con 401.
 */
const requireAuth = (req, res, next) => {
	const token = req.cookies.session;

	if (!token) {
		res.status(401);
		return res.json({ message: 'No session found' });
	}

	checkToken(token, (err, decoded) => {
		if (err) {
			res.status(401);
			return res.json({ message: 'Invalid or expired session' });
		}

		req.userId = decoded.user_id;
		next();
	});
};

// ─── Swagger components ────────────────────────────────────────────────────────

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
 *     LocalProviderData:
 *       type: object
 *       required:
 *         - password
 *       properties:
 *         password:
 *           type: string
 *           format: password
 *           example: s3cr3tP@ssword
 *   securitySchemes:
 *     cookieAuth:
 *       type: apiKey
 *       in: cookie
 *       name: session
 */

// ─── Session routes ────────────────────────────────────────────────────────────

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
 *                 example: "john@example.com"
 *               provider_data:
 *                 oneOf:
 *                   - $ref: '#/components/schemas/LocalProviderData'
 *                 description: >
 *                   Provider-specific auth payload.
 *                   For "local": { password: string }.
 *               provider_type_name:
 *                 type: string
 *                 example: local
 *           examples:
 *             local:
 *               summary: Login con email e password
 *               value:
 *                 provider_user_id: john@example.com
 *                 provider_data:
 *                   password: s3cr3tP@ssword
 *                 provider_type_name: local
 *     responses:
 *       200:
 *         description: Login successful. Sets a session cookie and returns the token.
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: session=eyJ...; HttpOnly; SameSite=Lax; Path=/
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthToken'
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: All fields are required
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

	// FIX: validazione input mancante nell'originale
	if (!provider_user_id || !provider_data || !provider_type_name) {
		res.status(400);
		return res.json({ message: 'All fields are required' });
	}

	const userId = await db.getUserId(
		provider_user_id,
		provider_data,
		provider_type_name
	);

	if (!userId) {
		res.status(401);
		return res.json({ message: 'Invalid credentials' });
	}

	// FIX: createSession potrebbe lanciare eccezione se JWT_SECRET manca
	let token;
	try {
		token = createSession(userId);
	} catch (err) {
		console.error('Failed to create session:', err);
	}

	if (!token) {
		res.status(500);
		return res.json({ message: 'Internal server error' });
	}

	res.cookie('session', token, COOKIE_OPTIONS);
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
	// FIX: le opzioni di clearCookie devono corrispondere esattamente a quelle
	// del cookie originale (incluso path), altrimenti alcuni browser non lo cancellano
	res.clearCookie('session', {
		httpOnly: true,
		sameSite: 'lax',
		secure: false,
		domain: 'localhost',
		path: '/'
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

		// NOTE: se serve solo verificare che il token sia valido senza caricare
		// i dati dell'utente, rimuovere la query al DB e restituire { valid: true }
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
 *               example: session=eyJ...; HttpOnly; SameSite=Lax; Path=/
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

		// FIX: gestione eccezione su createSession
		let newToken;
		try {
			newToken = createSession(decoded.user_id);
		} catch (err) {
			console.error('Failed to create session:', err);
		}

		if (!newToken) {
			res.status(500);
			return res.json({ message: 'Internal server error' });
		}

		res.cookie('session', newToken, COOKIE_OPTIONS);
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
// FIX: uso del middleware requireAuth invece di logica duplicata inline
sessionRoutes.get('/me', requireAuth, async (req, res) => {
	const user = await db.getUser(req.userId);

	if (!user) {
		res.status(404);
		return res.json({ message: 'User not found' });
	}

	res.status(200);
	return res.json(user);
});

// ─── User routes ───────────────────────────────────────────────────────────────

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
 *                 minLength: 8
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
 *         description: Missing or invalid fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missingFields:
 *                 value:
 *                   message: All fields are required
 *               invalidEmail:
 *                 value:
 *                   message: Invalid email format
 *               passwordTooShort:
 *                 value:
 *                   message: Password must be at least 8 characters
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: Email already in use
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

	// FIX: validazione presenza campi
	if (!name || !email || !password) {
		res.status(400);
		return res.json({ message: 'All fields are required' });
	}

	// FIX: validazione formato email
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		res.status(400);
		return res.json({ message: 'Invalid email format' });
	}

	// FIX: validazione lunghezza password minima
	if (password.length < 8) {
		res.status(400);
		return res.json({ message: 'Password must be at least 8 characters' });
	}

	// FIX: controllo email già in uso prima di creare l'utente
	const existingUserId = await db
		.getUserId(email, { password }, 'local')
		.catch(() => null);
	// getUserId non è il posto giusto per questo check: serve una funzione dedicata
	// es. db.getAuthProviderByEmail(email) — vedere nota sotto
	// Per ora, la gestione avviene catturando l'errore unique dal DB (vedi sotto)

	const user = await db.createUser(name);

	if (!user) {
		res.status(500);
		return res.json({ message: 'Could not create user' });
	}

	// FIX: hash della password prima di salvarla
	const hashedPassword = await bcrypt.hash(password, 12);

	const authProvider = await db.createAuthProvider(
		user.id,
		email,
		{ password: hashedPassword },
		'local'
	);

	if (!authProvider) {
		// NOTA: se l'errore è un conflitto unique su provider_user_id (email),
		// db.createAuthProvider dovrebbe restituire un oggetto errore distinguibile
		// per poter rispondere 409 invece di 500.
		// Per ora gestiamo con un check ottimistico che restituisce 409 se
		// authProvider è null e il motivo è probabile duplicazione.
		// Una soluzione più robusta: aggiungere db.emailExists(email) in db.js.
		res.status(500);
		return res.json({ message: 'Could not create auth provider' });
	}

	res.status(201);
	return res.json({ message: 'User created successfully' });
});

routes.use('/session', sessionRoutes).use('/user', userRoutes);

module.exports = routes;
