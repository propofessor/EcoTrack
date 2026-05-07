// index.js (o app.js)
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const authRoutes = require('./routes/auth'); // Importiamo il file appena creato

const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const app = express();

// Middleware per far capire a Express i dati in formato JSON
app.use(express.json());
// Middleware per leggere i cookie HttpOnly[cite: 1]
app.use(cookieParser());

app.use(express.static(path.join(__dirname, '../public'))); // Serve i file statici dalla cartella "public"

app.use(
	'/api-docs',
	swaggerUi.serve,
	swaggerUi.setup(YAML.load(path.join(__dirname, '../docs/api.yaml')))
); // Serve la documentazione Swagger all'endpoint /api-docs

// Colleghiamo tutte le rotte auth sotto il prefisso '/api/auth'
// (Poiché il tuo server OpenAPI ha l'URL base "/api"[cite: 1]
// e le rotte iniziano per "/auth/..."[cite: 1])
app.use('/api/auth', authRoutes);

const PORT = 3000;

if (require.main === module) {
	app.listen(PORT, () => {
		console.log(`Il server è in ascolto sulla porta ${PORT}`);
		console.log(
			`Documentazione Swagger disponibile su: http://localhost:${PORT}/api-docs`
		);
	});
}

module.exports = app; // Esportiamo l'app per i test
