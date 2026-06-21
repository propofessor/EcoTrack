const crypto = require('crypto');

const CONFIG = {
	AUTH_URL:
		process.env.CIE_AUTH_URL ||
		'https://idserver.servizicie.interno.gov.it/idp/profile/oidc/authorize',
	TOKEN_URL:
		process.env.CIE_TOKEN_URL ||
		'https://idserver.servizicie.interno.gov.it/idp/profile/oidc/token',
	USERINFO_URL:
		process.env.CIE_USERINFO_URL ||
		'https://idserver.servizicie.interno.gov.it/idp/profile/oidc/userinfo',
	CLIENT_ID: process.env.CIE_CLIENT_ID,
	REDIRECT_URI: 'http://localhost:3000/api/auth/cie/callback'
};


function getAuthorizationUrl() {
	const state = crypto.randomBytes(16).toString('hex');
	const nonce = crypto.randomBytes(16).toString('hex');

	const params = new URLSearchParams({
		client_id: CONFIG.CLIENT_ID,
		redirect_uri: CONFIG.REDIRECT_URI,
		response_type: 'code',
		scope: 'openid profile email',
		state: state,
		nonce: nonce,
		acr_values: 'https://www.spid.gov.it/CIE_L2',
		prompt: 'login'
	});

	return {
		url: `${CONFIG.AUTH_URL}?${params.toString()}`,
		state,
		nonce
	};
}


async function getCieUserIdentity(code) {

	const tokenResponse = await fetch(CONFIG.TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: CONFIG.CLIENT_ID,
			client_secret: process.env.CIE_CLIENT_SECRET,
			grant_type: 'authorization_code',
			code: code,
			redirect_uri: CONFIG.REDIRECT_URI
		})
	});

	const tokenData = await tokenResponse.json();
	if (!tokenResponse.ok || tokenData.error) {
		throw new Error('Fallito lo scambio del token CIE');
	}


	const userinfoResponse = await fetch(CONFIG.USERINFO_URL, {
		headers: { Authorization: `Bearer ${tokenData.access_token}` }
	});

	const identityData = await userinfoResponse.json();
	if (!userinfoResponse.ok) {
		throw new Error('Impossibile recuperare i dati anagrafici CIE');
	}

	return {
		codiceFiscale: identityData.fiscal_number,
		email:
			identityData.email ||
			`${identityData.fiscal_number.toLowerCase()}@cie.internal`,
		nomeCompleto: `${identityData.given_name} ${identityData.family_name}`
	};
}

module.exports = {
	getAuthorizationUrl,
	getCieUserIdentity
};
