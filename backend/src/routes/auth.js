const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { supabaseAdmin } = require('../db');
const cieService = require('../services/cieService');


const { PASSWORD_REGEX, PASSWORD_ERROR_MESSAGE } = require('../utils/validation');




router.post('/register', async (req, res) => {
	try {

		const { email, password, name, plate, preferences } = req.body;


		if (!email || !password || !name) {
			return res.status(400).json({
				error: 'Email, password e nome sono obbligatori'
			});
		}


		if (!PASSWORD_REGEX.test(password)) {
			return res.status(400).json({
				error: PASSWORD_ERROR_MESSAGE
			});
		}


		const { data, error } = await db.auth.signUp({
			email: email,
			password: password,
			options: {

				data: {
					name: name,
					plate: plate,
					preferences: preferences || {
						theme: 'dark',
						notifications: true
					}
				}
			}
		});


		if (error) {
			console.error('Errore di registrazione:', error.message);
			return res.status(400).json({ error: error.message });
		}


		const session = data.session;



		if (!session) {
			return res.status(201).json({
				message: "Controlla la tua email per confermare l'account.",
				email_verification_required: true
			});
		}

		const accessToken = session.access_token;
		const refreshToken = session.refresh_token;


		res.cookie('access_token', accessToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
			maxAge: 3600000
		});

		res.cookie('refresh_token', refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
			maxAge: 7 * 24 * 3600000
		});


		return res.status(201).json({ message: 'Utente creato con successo' });
	} catch (err) {
		console.error('Errore del server:', err);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});


router.post('/login', async (req, res) => {
	try {

		const { email, password } = req.body;


		const { data, error } = await db.auth.signInWithPassword({
			email: email,
			password: password
		});


		if (error) {
			console.error('Errore di login:', error.message);

			return res.status(401).json({ error: 'Credenziali non valide' });
		}


		const session = data.session;
		const accessToken = session.access_token;
		const refreshToken = session.refresh_token;


		res.cookie('access_token', accessToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
			maxAge: 3600000
		});

		res.cookie('refresh_token', refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
			maxAge: 7 * 24 * 3600000
		});


		return res
			.status(200)
			.json({ message: 'Login effettuato con successo' });
	} catch (err) {

		console.error('Errore del server durante il login:', err);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});




router.get('/cie', async (req, res) => {
	try {
		const { url, state, nonce } = cieService.getAuthorizationUrl();


		res.cookie('cie_state', state, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 300000
		});
		res.cookie('cie_nonce', nonce, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 300000
		});

		return res.redirect(url);
	} catch (err) {
		console.error("❌ Errore nell'avvio del flusso CIE:", err);
		return res
			.status(500)
			.json({ error: "Errore nell'avvio del flusso CIE" });
	}
});
router.get('/cie/callback', async (req, res) => {
	try {
		const { code, state, error: cieError } = req.query;
		const savedState = req.cookies.cie_state;


		res.clearCookie('cie_state');
		res.clearCookie('cie_nonce');


		if (cieError || !state || state !== savedState || !code) {
			return res.status(400).json({
				error: 'Richiesta non valida o controlli di sicurezza falliti'
			});
		}


		const cieUser = await cieService.getCieUserIdentity(code);


		let { data: existingUser } = await supabaseAdmin
			.from('users')
			.select('id')
			.eq('email', cieUser.email)
			.single();

		let userId;

		if (!existingUser) {

			const { data: newUser, error: createError } =
				await supabaseAdmin.auth.admin.createUser({
					email: cieUser.email,
					email_confirm: true,
					user_metadata: {
						name: cieUser.nomeCompleto,
						fiscal_number: cieUser.codiceFiscale,
						provider: 'cie'
					}
				});

			if (createError) {
				console.error(
					'❌ Errore creazione utente CIE in Supabase:',
					createError.message
				);
				return res.status(500).json({
					error: "Errore durante la registrazione dell'utente CIE"
				});
			}
			userId = newUser.user.id;
		} else {
			userId = existingUser.id;
		}


		const { data: linkData, error: linkError } =
			await supabaseAdmin.auth.admin.generateLink({
				type: 'magiclink',
				email: cieUser.email
			});

		if (linkError || !linkData?.properties?.hashed_token) {
			console.error(
				'Errore nella generazione del link CIE:',
				linkError?.message
			);
			return res
				.status(500)
				.json({ error: 'Impossibile generare la sessione CIE' });
		}


		const { data: sessionData, error: sessionError } =
			await db.auth.verifyOtp({
				token_hash: linkData.properties.hashed_token,
				type: 'magiclink'
			});

		if (sessionError || !sessionData?.session) {
			console.error(
				'Errore nella verifica OTP CIE:',
				sessionError?.message
			);
			return res
				.status(500)
				.json({ error: 'Impossibile avviare la sessione CIE' });
		}

		res.cookie('access_token', sessionData.session.access_token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
			maxAge: 3600000
		});

		res.cookie('refresh_token', sessionData.session.refresh_token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
			maxAge: 7 * 24 * 3600000
		});

		return res.redirect(process.env.FRONTEND_URL || '/');
	} catch (err) {
		console.error('❌ Errore critico nel callback CIE:', err);
		return res
			.status(500)
			.json({ error: 'Errore interno durante il login CIE' });
	}
});




router.post('/refresh', async (req, res) => {
	try {

		const refreshToken = req.cookies.refresh_token;


		if (!refreshToken) {
			return res
				.status(401)
				.json({ error: 'Non autorizzato: Refresh Token mancante' });
		}


		const { data, error } = await db.auth.refreshSession({
			refresh_token: refreshToken
		});


		if (error || !data.session) {
			console.error(
				'Errore durante il refresh del token:',
				error?.message
			);

			return res
				.status(401)
				.json({ error: 'Refresh Token non valido o scaduto' });
		}


		const newAccessToken = data.session.access_token;
		const newRefreshToken = data.session.refresh_token;



		res.cookie('access_token', newAccessToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
			maxAge: 3600000
		});

		res.cookie('refresh_token', newRefreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
			maxAge: 7 * 24 * 3600000
		});


		return res
			.status(200)
			.json({ message: 'Access token aggiornato con successo' });
	} catch (err) {

		console.error('Errore del server in /auth/refresh:', err);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});


router.post('/logout', async (req, res) => {
	try {

		await db.auth.signOut();




		res.clearCookie('access_token', {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
		});

		res.clearCookie('refresh_token', {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
		});


		return res
			.status(200)
			.json({ message: 'Logout effettuato con successo' });
	} catch (err) {

		console.error('Errore del server durante il logout:', err);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});


router.get('/me', async (req, res) => {
	try {


		const token = req.cookies.access_token;


		if (!token) {
			return res
				.status(401)
				.json({ error: 'Non autorizzato: Access Token mancante' });
		}


		const { data: authData, error: authError } =
			await db.auth.getUser(token);

		if (authError || !authData.user) {
			console.error('Errore verifica token:', authError?.message);
			return res
				.status(401)
				.json({ error: 'Non autorizzato: Token non valido o scaduto' });
		}



		const { data: userProfile, error: profileError } = await db
			.from('users')
			.select('id, email, name, plate, achievements, preferences')
			.eq('id', authData.user.id)
			.single();

		if (profileError) {
			console.error(
				'Errore nel recupero del profilo dal database:',
				profileError.message
			);
			return res
				.status(500)
				.json({ error: 'Errore nel recupero dei dati utente' });
		}


		return res.status(200).json(userProfile);
	} catch (err) {
		console.error('Errore del server in /auth/me:', err);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});




router.post('/resend-verification', async (req, res) => {
	try {
		const { email } = req.body;
		if (!email) {
			return res.status(400).json({ error: 'Email obbligatoria' });
		}

		const { error } = await supabaseAdmin.auth.admin.generateLink({
			type: 'signup',
			email
		});


		if (error) {
			console.warn('resend-verification warning:', error.message);
		}

		return res.status(200).json({
			message: "Email di verifica inviata. Controlla la tua casella di posta."
		});
	} catch (err) {
		console.error('Errore in /auth/resend-verification:', err);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});




router.post('/forgot-password', async (req, res) => {
	try {
		const { email } = req.body;
		if (!email) {
			return res.status(400).json({ error: 'Email obbligatoria' });
		}



		const { error } = await supabaseAdmin.auth.admin.generateLink({
			type: 'recovery',
			email
		});


		if (error) {
			console.warn('generateLink recovery warning:', error.message);
		}

		return res.status(200).json({
			message:
				'Se esiste un account con questa email, riceverai un link di ripristino.'
		});
	} catch (err) {
		console.error('Errore in /auth/forgot-password:', err);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});


router.post('/reset-password', async (req, res) => {
	try {
		const { token_hash, newPassword } = req.body;
		if (!token_hash || !newPassword) {
			return res
				.status(400)
				.json({ error: 'token_hash e newPassword sono obbligatori' });
		}

		if (!PASSWORD_REGEX.test(newPassword)) {
			return res.status(400).json({
				error: PASSWORD_ERROR_MESSAGE
			});
		}


		const { data: sessionData, error: otpError } = await db.auth.verifyOtp({
			token_hash,
			type: 'recovery'
		});

		if (otpError || !sessionData?.session) {
			return res
				.status(400)
				.json({ error: 'Token non valido o scaduto. Richiedi un nuovo link.' });
		}


		const { error: updateError } =
			await supabaseAdmin.auth.admin.updateUserById(
				sessionData.session.user.id,
				{ password: newPassword }
			);

		if (updateError) {
			console.error('Errore aggiornamento password:', updateError.message);
			return res
				.status(500)
				.json({ error: "Impossibile aggiornare la password" });
		}

		return res
			.status(200)
			.json({ message: 'Password aggiornata con successo. Puoi ora accedere.' });
	} catch (err) {
		console.error('Errore in /auth/reset-password:', err);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});




router.get('/cie/mobile-url', (req, res) => {
	try {
		const { url, state, nonce } = cieService.getAuthorizationUrl();
		return res.status(200).json({ url, state, nonce });
	} catch (err) {
		console.error('Errore /cie/mobile-url:', err);
		return res.status(500).json({ error: 'Impossibile avviare il flusso CIE' });
	}
});

router.get('/cie/mobile-callback', async (req, res) => {
	try {
		const { code, state } = req.query;
		if (!code || !state) {
			return res.status(400).json({ error: 'Parametri mancanti' });
		}

		const cieUser = await cieService.getCieUserIdentity(code);

		let { data: existingUser } = await supabaseAdmin
			.from('users')
			.select('id')
			.eq('email', cieUser.email)
			.single();

		if (!existingUser) {
			const { error: createError } = await supabaseAdmin.auth.admin.createUser({
				email: cieUser.email,
				email_confirm: true,
				user_metadata: {
					name: cieUser.nomeCompleto,
					fiscal_number: cieUser.codiceFiscale,
					provider: 'cie'
				}
			});
			if (createError) {
				return res.status(500).json({ error: 'Errore registrazione CIE' });
			}
		}

		const { data: linkData, error: linkError } =
			await supabaseAdmin.auth.admin.generateLink({
				type: 'magiclink',
				email: cieUser.email
			});

		if (linkError || !linkData?.properties?.hashed_token) {
			return res.status(500).json({ error: 'Impossibile generare la sessione CIE' });
		}

		const { data: sessionData, error: sessionError } = await db.auth.verifyOtp({
			token_hash: linkData.properties.hashed_token,
			type: 'magiclink'
		});

		if (sessionError || !sessionData?.session) {
			return res.status(500).json({ error: 'Impossibile avviare la sessione CIE' });
		}

		res.cookie('access_token', sessionData.session.access_token, {
			httpOnly: true, secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', maxAge: 3600000
		});
		res.cookie('refresh_token', sessionData.session.refresh_token, {
			httpOnly: true, secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', maxAge: 7 * 24 * 3600000
		});

		return res.status(200).json({
			message: 'Login CIE effettuato',
			access_token: sessionData.session.access_token,
			refresh_token: sessionData.session.refresh_token
		});
	} catch (err) {
		console.error('Errore /cie/mobile-callback:', err);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});


router.get('/google', async (req, res) => {
	try {
		const { data, error } = await db.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
				queryParams: {
					access_type: 'offline',
					prompt: 'consent'
				}
			}
		});

		if (error) {
			console.error('❌ Errore Supabase:', error.message);
			return res
				.status(500)
				.json({ error: 'Impossibile avviare il login con Google' });
		}

		res.redirect(data.url);
	} catch (err) {
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});


router.post('/google/token', async (req, res) => {
	try {
		const { id_token } = req.body;
		if (!id_token) {
			return res.status(400).json({ error: 'id_token obbligatorio' });
		}

		const { data, error } = await db.auth.signInWithIdToken({
			provider: 'google',
			token: id_token
		});

		if (error || !data.session) {
			console.error('Errore signInWithIdToken:', error?.message);
			return res.status(401).json({ error: 'Autenticazione Google fallita' });
		}


		res.cookie('access_token', data.session.access_token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
			maxAge: 3600000
		});
		res.cookie('refresh_token', data.session.refresh_token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
			maxAge: 7 * 24 * 3600000
		});

		return res.status(200).json({
			message: 'Login con Google effettuato',
			access_token: data.session.access_token,
			refresh_token: data.session.refresh_token
		});
	} catch (err) {
		console.error('Errore in /auth/google/token:', err);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});


router.get('/google/callback', async (req, res) => {
	try {

		const { code } = req.query;

		if (!code) {
			return res
				.status(400)
				.json({ error: 'Codice di autorizzazione mancante' });
		}


		const { data, error } = await db.auth.exchangeCodeForSession(code);

		if (error || !data.session) {
			console.error('Errore nello scambio del codice:', error?.message);
			return res
				.status(401)
				.json({ error: 'Autenticazione Google fallita' });
		}

		const accessToken = data.session.access_token;
		const refreshToken = data.session.refresh_token;


		res.cookie('access_token', accessToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
			maxAge: 3600000
		});

		res.cookie('refresh_token', refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
			maxAge: 7 * 24 * 3600000
		});



		res.redirect('/');
	} catch (err) {
		console.error('Errore del server in /auth/google/callback:', err);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});


router.get('/google/mobile-url', async (req, res) => {
	try {
		const { data, error } = await db.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: 'http://localhost:3000/api/auth/google/mobile-callback',
				queryParams: { access_type: 'offline', prompt: 'consent' },
			},
		});

		if (error || !data?.url) {
			console.error('Errore signInWithOAuth mobile:', error?.message);
			return res.status(500).json({ error: 'Impossibile avviare il login con Google' });
		}

		return res.status(200).json({ url: data.url });
	} catch (err) {
		console.error('Errore /google/mobile-url:', err);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});


router.get('/google/mobile-callback', async (req, res) => {
	try {
		const { code } = req.query;

		if (!code) {
			return res.redirect('ecotrack://auth/google?error=missing_code');
		}

		const { data, error } = await db.auth.exchangeCodeForSession(code);

		if (error || !data?.session) {
			console.error('Errore exchangeCodeForSession Google mobile:', error?.message);
			return res.redirect('ecotrack://auth/google?error=auth_failed');
		}

		const params = new URLSearchParams({
			access_token: data.session.access_token,
			refresh_token: data.session.refresh_token,
		});
		return res.redirect(`ecotrack://auth/google?${params.toString()}`);
	} catch (err) {
		console.error('Errore /google/mobile-callback:', err);
		return res.redirect('ecotrack://auth/google?error=server_error');
	}
});

const WEB_APP_URL = process.env.WEB_APP_URL || 'http://localhost:8081';


router.get('/google/web-url', async (req, res) => {
	try {
		const { data, error } = await db.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/auth/google/web-callback`,
				queryParams: { access_type: 'offline', prompt: 'consent' },
			},
		});
		if (error || !data?.url) {
			console.error('Errore signInWithOAuth web:', error?.message);
			return res.status(500).json({ error: 'Impossibile avviare il login con Google' });
		}
		return res.status(200).json({ url: data.url });
	} catch (err) {
		console.error('Errore /google/web-url:', err);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});


router.get('/google/web-callback', async (req, res) => {
	try {
		const { code } = req.query;
		if (!code) {
			return res.redirect(`${WEB_APP_URL}/?error=missing_code`);
		}
		const { data, error } = await db.auth.exchangeCodeForSession(code);
		if (error || !data?.session) {
			console.error('Errore Google web-callback:', error?.message);
			return res.redirect(`${WEB_APP_URL}/?error=auth_failed`);
		}
		const { access_token, refresh_token } = data.session;
		const cookieOpts = {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
		};
		res.cookie('access_token', access_token, { ...cookieOpts, maxAge: 3600000 });
		res.cookie('refresh_token', refresh_token, { ...cookieOpts, maxAge: 7 * 24 * 3600000 });
		return res.redirect(WEB_APP_URL);
	} catch (err) {
		console.error('Errore /google/web-callback:', err);
		return res.redirect(`${WEB_APP_URL}/?error=server_error`);
	}
});

module.exports = router;
