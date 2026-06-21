require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const mapsRoutes = require('./routes/maps');
const historyRoutes = require('./routes/history');
const exportRoutes = require('./routes/export');
const dashboardRoutes = require('./routes/dashboard');
const gamificationRoutes = require('./routes/gamification');
const {
	scheduleWeeklyLeaderboardReset
} = require('./jobs/weeklyLeaderboardReset');

const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const app = express();

const allowedOrigins = process.env.CORS_ORIGINS
	? process.env.CORS_ORIGINS.split(',')
	: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8081'];

app.use(
	cors({
		origin: (origin, callback) => {
			if (!origin || allowedOrigins.includes(origin)) {
				return callback(null, true);
			}
			return callback(new Error('Origin non consentita dal CORS'));
		},
		credentials: true
	})
);


app.use(express.json());

app.use(cookieParser());

app.use(express.static(path.join(__dirname, '../public')));

app.use(
	'/api-docs',
	swaggerUi.serve,
	swaggerUi.setup(YAML.load(path.join(__dirname, '../docs/api.yaml')))
);


app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/maps', mapsRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/internal', require('./routes/internal'));

const PORT = process.env.PORT || 3000;

if (require.main === module) {
	app.listen(PORT, () => {
		console.log(`Il server è in ascolto sulla porta ${PORT}`);
		console.log(
			`Documentazione Swagger disponibile su: http://localhost:${PORT}/api-docs`
		);
	});





	scheduleWeeklyLeaderboardReset();
}

module.exports = app;
