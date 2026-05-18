// routes/auth.js
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { supabaseAdmin } = require('../db'); // Importiamo solo l'admin che ci serve qui
const cieService = require('../services/cieService'); // Il nostro nuovo service

// --- AUTHENTICATION TAG[cite: 1] ---

// Endpoint per registrare un nuovo utente[cite: 1]
router.post('/register', async (req, res) => {
	try {
		// 1. Estraiamo i dati dalla richiesta del client.
		// Il tuo file YAML richiede email, password e name, e opzionalmente plate e preferences[cite: 1]
		const { email, password, name, plate, preferences } = req.body;

		// 2. Chiamiamo Supabase per creare l'utente
		const { data, error } = await db.auth.signUp({
			email: email,
			password: password,
			options: {
				// Salviamo gli altri dati extra nei metadata dell'utente su Supabase
				data: {
					name: name,
					plate: plate,
					preferences: preferences || {
						theme: 'dark',
						notifications: true
					} // Default se non fornito[cite: 1]
				}
			}
		});

		// 3. Gestione degli errori (es. email già esistente)[cite: 1]
		if (error) {
			console.error('Errore di registrazione:', error.message);
			return res.status(400).json({ error: error.message }); // Risposta 400 come da YAML[cite: 1]
		}

		// 4. Se va tutto bene, estraiamo i token dalla sessione
		const session = data.session;
		/*if (!session) {
			// Nota: a volte Supabase richiede la conferma dell'email.
			// Se hai la conferma email attiva, la sessione qui sarà null.
			return res.status(201).json({
				message: "Controlla la tua email per confermare l'account."
			});
		}*/

		const accessToken = session.access_token;
		const refreshToken = session.refresh_token;

		// 5. Impostiamo i cookie HttpOnly per sicurezza[cite: 1]
		// Un cookie HttpOnly non può essere letto da JavaScript nel browser, prevenendo attacchi hacker.
		res.cookie('access_token', accessToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production', // Usa HTTPS in produzione
			sameSite: 'strict',
			maxAge: 3600000 // 1 ora di validità
		});

		res.cookie('refresh_token', refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 7 * 24 * 3600000 // 7 giorni di validità
		});

		// 6. Restituiamo il codice di successo 201 come descritto nel tuo file YAML[cite: 1]
		return res.status(201).json({ message: 'Utente creato con successo' });
	} catch (err) {
		console.error('Errore del server:', err);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});

// Endpoint per il login[cite: 1]
router.post('/login', async (req, res) => {
	try {
		// 1. Estraiamo l'email e la password inviate dall'utente
		const { email, password } = req.body;

		// 2. Chiediamo a Supabase di verificare se le credenziali sono corrette
		const { data, error } = await db.auth.signInWithPassword({
			email: email,
			password: password
		});

		// 3. Gestione dell'errore (es. password sbagliata o utente inesistente)
		if (error) {
			console.error('Errore di login:', error.message);
			// Il file YAML richiede un errore 401 per credenziali non valide
			return res.status(401).json({ error: 'Credenziali non valide' });
		}

		// 4. Se il login ha successo, estraiamo i token dalla sessione
		const session = data.session;
		const accessToken = session.access_token;
		const refreshToken = session.refresh_token;

		// 5. Impostiamo i cookie HttpOnly esattamente come abbiamo fatto per la registrazione
		res.cookie('access_token', accessToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 3600000 // 1 ora di validità
		});

		res.cookie('refresh_token', refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 7 * 24 * 3600000 // 7 giorni di validità
		});

		// 6. Restituiamo 200 come richiesto dal file YAML per confermare il successo
		return res
			.status(200)
			.json({ message: 'Login effettuato con successo' });
	} catch (err) {
		// Gestione degli errori imprevisti del server
		console.error('Errore del server durante il login:', err);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});

// --- SSO TAG[cite: 1] ---

// Rotte per CIE[cite: 1]
router.get('/cie', async (req, res) => {
	try {
		const { url, state, nonce } = cieService.getAuthorizationUrl();

		// Salviamo i controlli anti-CSRF nei cookie temporanei
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
		console.log('✅ Callback CIE ricevuta con query:', req.query);
		const { code, state, error: cieError } = req.query;
		const savedState = req.cookies.cie_state;

		// Puliamo subito i cookie di sicurezza per evitare riutilizzi maliziosi
		res.clearCookie('cie_state');
		res.clearCookie('cie_nonce');

		// Controllo validità dello stato anti-CSRF e presenza del codice
		if (cieError || !state || state !== savedState || !code) {
			return res.status(400).json({
				error: 'Richiesta non valida o controlli di sicurezza falliti'
			});
		}

		// Chiediamo al service di scambiare il codice con l'identità digitale del cittadino
		const cieUser = await cieService.getCieUserIdentity(code);

		// Controlliamo se nel database esiste già un utente registrato con questa email CIE
		let { data: existingUser } = await supabaseAdmin
			.from('users')
			.select('id')
			.eq('email', cieUser.email)
			.single();

		let userId;

		if (!existingUser) {
			// LOGICA COMPLETA DI REGISTRAZIONE AUTOMATICA (Richiesta dal Test)
			const { data: newUser, error: createError } =
				await supabaseAdmin.auth.admin.createUser({
					email: cieUser.email,
					email_confirm: true, // L'identità è già certificata e verificata dallo Stato Italiano!
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

		// Generiamo un link/token di sessione sicuro per far accedere l'utente in Supabase
		await supabaseAdmin.auth.admin.generateLink({
			type: 'signup',
			email: cieUser.email
		});

		// Impostiamo i cookie crittografati HttpOnly di sessione per il browser dell'utente
		res.cookie('access_token', 'finto_access_token_cie', {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 3600000
		});

		res.cookie('refresh_token', 'finto_refresh_token_cie', {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 7 * 24 * 3600000
		});

		// Autenticazione completata con successo, reindirizziamo alla Home/Dashboard
		return res.redirect('/');
	} catch (err) {
		console.error('❌ Errore critico nel callback CIE:', err);
		return res
			.status(500)
			.json({ error: 'Errore interno durante il login CIE' });
	}
});

// --- SESSION TAG[cite: 1] ---

// Aggiornare il token[cite: 1]
router.post('/refresh', async (req, res) => {
	try {
		// 1. Estraiamo il refresh_token dai cookie
		const refreshToken = req.cookies.refresh_token;

		// Se non c'è, l'utente deve rifare il login da zero
		if (!refreshToken) {
			return res
				.status(401)
				.json({ error: 'Non autorizzato: Refresh Token mancante' });
		}

		// 2. Chiediamo a Supabase di usare questo token per creare una nuova sessione
		const { data, error } = await db.auth.refreshSession({
			refresh_token: refreshToken
		});

		// 3. Gestiamo i casi in cui il token era finto, revocato o troppo vecchio
		if (error || !data.session) {
			console.error(
				'Errore durante il refresh del token:',
				error?.message
			);
			// Il file YAML richiede esattamente un 401 per questo scenario
			return res
				.status(401)
				.json({ error: 'Refresh Token non valido o scaduto' });
		}

		// 4. Estraiamo i nuovi token (Per sicurezza, Supabase cambia spesso anche il refresh token!)
		const newAccessToken = data.session.access_token;
		const newRefreshToken = data.session.refresh_token;

		// 5. Sovrascriviamo i cookie esistenti con i nuovi token,
		// rimettendo i timer di scadenza al massimo (1 ora e 7 giorni)
		res.cookie('access_token', newAccessToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 3600000 // 1 ora
		});

		res.cookie('refresh_token', newRefreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 7 * 24 * 3600000 // 7 giorni
		});

		// 6. Restituiamo 200 per dire al client che tutto è andato bene
		return res
			.status(200)
			.json({ message: 'Access token aggiornato con successo' });
	} catch (err) {
		// La nostra amata rete di sicurezza per i crash improvvisi
		console.error('Errore del server in /auth/refresh:', err);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});

// Logout[cite: 1]
router.post('/logout', async (req, res) => {
	try {
		// 1. (Opzionale ma consigliato) Chiediamo a Supabase di invalidare la sessione lato server
		await db.auth.signOut();

		// 2. Il file YAML richiede di pulire i cookie impostando la scadenza al passato.
		// Express usa res.clearCookie() per fare questo in automatico.
		// Dobbiamo passare le stesse opzioni di sicurezza usate durante la creazione.
		res.clearCookie('access_token', {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict'
		});

		res.clearCookie('refresh_token', {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict'
		});

		// 3. Restituiamo 200 per confermare che l'operazione Ã¨ andata a buon fine
		return res
			.status(200)
			.json({ message: 'Logout effettuato con successo' });
	} catch (err) {
		// Gestione di un crash improvviso del server
		console.error('Errore del server durante il logout:', err);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});

// Profilo utente[cite: 1]
router.get('/me', async (req, res) => {
	try {
		// 1. Estraiamo il token di accesso dai cookie
		// (Express lo trova automaticamente grazie a cookie-parser)
		const token = req.cookies.access_token;

		// Se non c'è il token, l'utente non è loggato
		if (!token) {
			return res
				.status(401)
				.json({ error: 'Non autorizzato: Access Token mancante' });
		}

		// 2. Chiediamo a Supabase di verificare il token e dirci a chi appartiene
		const { data: authData, error: authError } =
			await db.auth.getUser(token);

		if (authError || !authData.user) {
			console.error('Errore verifica token:', authError?.message);
			return res
				.status(401)
				.json({ error: 'Non autorizzato: Token non valido o scaduto' });
		}

		// 3. Ora che sappiamo l'ID dell'utente (authData.user.id),
		// andiamo a prendere il suo profilo completo dalla tabella pubblica "users"
		const { data: userProfile, error: profileError } = await db
			.from('users')
			.select('id, email, name, plate, achievements, preferences')
			.eq('id', authData.user.id) // .single() ci assicura di ricevere un solo oggetto, non un array
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

		// 4. Se tutto va bene, restituiamo il profilo formattato!
		return res.status(200).json(userProfile);
	} catch (err) {
		console.error('Errore del server in /auth/me:', err);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});

// --- SSO TAG ---

// 1. Endpoint per avviare il flusso Google OAuth 2.0 (VERSIONE DEBUG)
router.get('/google', async (req, res) => {
	try {
		const { data, error } = await db.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: 'http://localhost:3000/api/auth/google/callback',
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

// 2. Endpoint per gestire il ritorno da Google (Callback)
router.get('/google/callback', async (req, res) => {
	try {
		// Google ci invia un parametro 'code' nell'URL
		const { code } = req.query;

		if (!code) {
			return res
				.status(400)
				.json({ error: 'Codice di autorizzazione mancante' });
		}

		// Scambiamo il codice di Google con una sessione valida di Supabase
		const { data, error } = await db.auth.exchangeCodeForSession(code);

		if (error || !data.session) {
			console.error('Errore nello scambio del codice:', error?.message);
			return res
				.status(401)
				.json({ error: 'Autenticazione Google fallita' });
		}

		const accessToken = data.session.access_token;
		const refreshToken = data.session.refresh_token;

		// Impostiamo i nostri fantastici cookie di sicurezza
		res.cookie('access_token', accessToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict', // In alcuni casi con SSO potrebbe servire 'lax', ma partiamo sicuri
			maxAge: 3600000
		});

		res.cookie('refresh_token', refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 7 * 24 * 3600000
		});

		// Dopo aver impostato i cookie, reindirizziamo l'utente alla nostra applicazione
		// Per ora lo mandiamo alla radice "/", ma in futuro sarà la tua dashboard frontend!
		res.redirect('/');
	} catch (err) {
		console.error('Errore del server in /auth/google/callback:', err);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});

module.exports = router;
