#!/usr/bin/env node

/**
 * generate-swagger.js
 *
 * Genera un file openapi.yaml nella cartella /backend/docs/
 * a partire dai commenti JSDoc presenti nei file sorgente in /backend/src/
 *
 * Utilizzo:
 *   - Da /backend/docs/:   node generate-swagger.js
 *   - Da /backend/:        node docs/generate-swagger.js
 *   - Da qualsiasi path:   node /percorso/assoluto/generate-swagger.js
 */

const path = require('path');
const fs = require('fs');

// ─── Risoluzione dei percorsi ────────────────────────────────────────────────
//
// __dirname punta alla cartella dove si trova questo script (/backend/docs).
// Risaliamo di un livello per trovare /backend, poi entriamo in /src.
//
const BACKEND_ROOT = path.resolve(__dirname, '..');
const SRC_GLOB = path.join(BACKEND_ROOT, 'src', '*.js');
const OUTPUT_DIR = __dirname; // /backend/docs
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'openapi.yaml');

// ─── Caricamento dipendenze ───────────────────────────────────────────────────
//
// swagger-jsdoc e js-yaml vengono risolti a partire da /backend/node_modules,
// indipendentemente da dove si lancia lo script.
//
let swaggerJsDoc, jsYaml;

try {
	swaggerJsDoc = require(
		path.join(BACKEND_ROOT, 'node_modules', 'swagger-jsdoc')
	);
} catch {
	console.error(
		'[ERRORE] swagger-jsdoc non trovato.\n' +
			`  Assicurati di aver eseguito "pnpm install" in: ${BACKEND_ROOT}`
	);
	process.exit(1);
}

try {
	// js-yaml è una dipendenza transitiva di swagger-jsdoc, sempre disponibile
	jsYaml = require(path.join(BACKEND_ROOT, 'node_modules', 'js-yaml'));
} catch {
	console.error(
		'[ERRORE] js-yaml non trovato.\n' +
			'  Installa il pacchetto: pnpm add -D js-yaml'
	);
	process.exit(1);
}

// ─── Configurazione Swagger ───────────────────────────────────────────────────
const swaggerOptions = {
	failOnErrors: true,
	definition: {
		openapi: '3.0.0',
		info: {
			title: 'Ecotrack API',
			version: '1.0.0',
			description:
				'Documentazione REST API per Ecotrack. ' +
				'Generata automaticamente da swagger-jsdoc.',
			contact: {
				name: 'Team Ecotrack'
			}
		},
		servers: [
			{
				url: 'http://localhost:3000',
				description: 'Server di sviluppo locale'
			}
		]
	},
	// Glob relativo a process.cwd() oppure assoluto — usiamo assoluto per
	// garantire il funzionamento indipendentemente dalla cwd al momento
	// dell'esecuzione.
	apis: [SRC_GLOB]
};

// ─── Generazione ─────────────────────────────────────────────────────────────
console.log('📄 Generazione documentazione Swagger...');
console.log(`   Sorgenti: ${SRC_GLOB}`);
console.log(`   Output:   ${OUTPUT_FILE}\n`);

let swaggerSpec;
try {
	swaggerSpec = swaggerJsDoc(swaggerOptions);
} catch (err) {
	console.error('[ERRORE] Impossibile generare la spec Swagger:');
	console.error(' ', err.message);
	process.exit(1);
}

// ─── Scrittura del file YAML ──────────────────────────────────────────────────
const yamlContent = jsYaml.dump(swaggerSpec, {
	indent: 2,
	lineWidth: 120,
	noRefs: true // evita alias YAML (&ref / *ref), più leggibile
});

// Crea la cartella di output se non esiste ancora
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

fs.writeFileSync(OUTPUT_FILE, yamlContent, 'utf8');

// ─── Riepilogo ────────────────────────────────────────────────────────────────
const paths = Object.keys(swaggerSpec.paths ?? {});
const schemas = Object.keys(swaggerSpec.components?.schemas ?? {});

console.log('✅ openapi.yaml generato con successo!\n');
console.log(`   Endpoint documentati (${paths.length}):`);
paths.forEach((p) => console.log(`     • ${p}`));

if (schemas.length > 0) {
	console.log(`\n   Schema components (${schemas.length}):`);
	schemas.forEach((s) => console.log(`     • ${s}`));
}

console.log(`\n   File scritto in: ${OUTPUT_FILE}`);
