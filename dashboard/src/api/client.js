const BASE_URL = import.meta.env.VITE_API_URL || '';

export async function apiFetch(path, options = {}) {
	try {
		const risposta = await fetch(`${BASE_URL}${path}`, {
			...options,
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
				...options.headers
			}
		});

		if (!risposta.ok) {
			const corpo = await risposta.json().catch(() => ({}));
			throw new Error(corpo.error || `Errore HTTP ${risposta.status}`);
		}

		return risposta;
	} catch (errore) {
		console.error(`Errore nella chiamata API a ${path}:`, errore.message);
		throw errore;
	}
}
