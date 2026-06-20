// index.js (o app.js)
require('dotenv').config(); // Carica le variabili d'ambiente dal file .env come prima operazione
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const mapsRoutes = require('./routes/maps');
const historyRoutes = require('./routes/history');
const exportRoutes = require('./routes/export'); // Importiamo la rotta di esportazione dati
const dashboardRoutes = require('./routes/dashboard');
const gamificationRoutes = require('./routes/gamification'); // [RF11] Rotte di gamification (voto, classifica, storico)
const {
	scheduleWeeklyLeaderboardReset
} = require('./jobs/weeklyLeaderboardReset'); // [RF11] Job di reset settimanale classifica

const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const app = express();

const allowedOrigins = process.env.CORS_ORIGINS
	? process.env.CORS_ORIGINS.split(',')
	: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8081'];

app.use(
	cors({
		origin: allowedOrigins,
		credentials: true
	})
);

// Middleware per far capire a Express i dati in formato JSON
app.use(express.json());
// Middleware per leggere i cookie HttpOnly
app.use(cookieParser());

app.use(express.static(path.join(__dirname, '../public'))); // Serve i file statici dalla cartella "public"

app.use(
	'/api-docs',
	swaggerUi.serve,
	swaggerUi.setup(YAML.load(path.join(__dirname, '../docs/api.yaml')))
); // Serve la documentazione Swagger all'endpoint /api-docs

// Colleghiamo tutte le rotte
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/maps', mapsRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/export', exportRoutes); // Importiamo la rotta di esportazione dati
app.use('/api/gamification', gamificationRoutes); // [RF11] Voto giornaliero, classifica, storico

const PORT = 3000;

if (require.main === module) {
	app.listen(PORT, () => {
		console.log(`Il server è in ascolto sulla porta ${PORT}`);
		console.log(
			`Documentazione Swagger disponibile su: http://localhost:${PORT}/api-docs`
		);
	});

	// [RF11] Il job di cron viene registrato solo quando il server gira
	// realmente (non durante i test, dove require.main !== module),
	// per evitare timer pendenti che farebbero fallire
	// --detectOpenHandles in Jest.
	scheduleWeeklyLeaderboardReset();
}

module.exports = app; // Esportiamo l'app per i test
