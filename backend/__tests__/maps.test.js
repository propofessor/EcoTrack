// __tests__/maps.test.js
const request = require('supertest');
const app = require('../src/index'); // Assicurati che il percorso sia corretto
const { db } = require('../src/db'); // Destrutturato coerentemente

// Creiamo un oggetto catena condiviso per simulare Supabase
const mockChain = {
	select: jest.fn().mockReturnThis(),
	eq: jest.fn().mockReturnThis(),
	single: jest.fn() // Sarà l'ultimo metodo della catena aggiunto per movement_types
};

// 1. ISOLIAMO E MOCKIAMO IL MODULO DEL DATABASE
jest.mock('../src/db', () => ({
	db: {
		auth: {
			getUser: jest.fn()
		},
		from: jest.fn(() => mockChain)
	}
}));

// Mockiamo anche il service del calcolo per testare solo lo strato della rotta (Controller)
jest.mock('../src/services/co2Service', () => ({
	calculateEmissions: jest.fn()
}));

const { calculateEmissions } = require('../services/co2Service');

describe('Test delle API di Mappe & Calcolo CO2 (/api/maps - RF9)', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// Reimpostiamo i ritorni automatici a catena
		mockChain.select.mockReturnThis();
		mockChain.eq.mockReturnThis();
	});

	const inputDistanzeValide = {
		distances: {
			walking: 2.0,
			bicycling: 5.0,
			transit: 12.5,
			driving: 20.0
		}
	};

	it("Dovrebbe calcolare le emissioni e restituire l'ID del mezzo corretto (200)", async () => {
		// 1. Simula l'utente loggato nel middleware
		db.auth.getUser.mockResolvedValue({
			data: {
				user: {
					id: 'utente-test-id',
					user_metadata: { plate: 'AB123CD' }
				}
			},
			error: null
		});

		// 2. Simula il calcolo restituito dal CO2 Service
		calculateEmissions.mockResolvedValue({
			emissions: {
				walking: 0,
				bicycling: 0,
				transit: 1100,
				driving: 3200
			}
		});

		// 3. Simula la query di Supabase che trova l'UUID reale per il mezzo 'driving'
		const fintoUuidMezzo = '11111111-2222-3333-4444-555555555555';
		mockChain.single.mockResolvedValue({
			data: { id: fintoUuidMezzo },
			error: null
		});

		const risposta = await request(app)
			.post('/api/maps/calculate-co2')
			.set('Cookie', ['access_token=token_valido'])
			.send(inputDistanzeValide);

		// Verifiche sui dati ricevuti
		expect(risposta.statusCode).toBe(200);
		expect(risposta.body.message).toBe(
			'Calcolo delle emissioni completato con successo'
		);
		expect(risposta.body.emissions.driving).toBe(3200);

		// [VERIFICA OPZIONE B]: Controlliamo che passi l'ID dinamico al Frontend
		expect(risposta.body.driving_movement_type_id).toBe(fintoUuidMezzo);

		// Verifica che la query sul DB sia stata effettuata cercando la label corretta
		expect(db.from).toHaveBeenCalledWith('movement_types');
		expect(mockChain.eq).toHaveBeenCalledWith('label', 'driving');
	});

	it("Dovrebbe restituire 400 se l'oggetto delle distanze è mancante nel payload", async () => {
		db.auth.getUser.mockResolvedValue({
			data: { user: { id: 'utente-test' } },
			error: null
		});

		const risposta = await request(app)
			.post('/api/maps/calculate-co2')
			.set('Cookie', ['access_token=token_valido'])
			.send({}); // Payload vuoto

		expect(risposta.statusCode).toBe(400);
		expect(risposta.body.error).toBe('Fornisci le distanze per il calcolo');
	});

	it("Dovrebbe restituire 401 se l'utente non fornisce un cookie di sessione valido", async () => {
		const risposta = await request(app)
			.post('/api/maps/calculate-co2')
			.send(inputDistanzeValide); // Nessun header Cookie impostato

		expect(risposta.statusCode).toBe(401);
		expect(risposta.body.error).toContain('Accesso negato');
	});
});
