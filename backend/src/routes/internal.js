const express = require('express');
const router = express.Router();
const { closeWeekAndAwardRewards } = require('../services/gamificationService');

function verificaSecretInterno(req, res, next) {
	const secretRicevuto = req.headers['x-internal-secret'];
	if (!secretRicevuto || secretRicevuto !== process.env.INTERNAL_CRON_SECRET) {
		console.warn('Tentativo di accesso non autorizzato all\'endpoint interno');
		return res.status(401).json({ error: 'Non autorizzato' });
	}
	return next();
}

router.post('/weekly-reset', verificaSecretInterno, async (req, res) => {
	try {
		console.log('Avvio reset classifica settimanale (trigger esterno)...');
		const risultato = await closeWeekAndAwardRewards();
		console.log('Reset classifica settimanale completato con successo');
		return res.status(200).json({ message: 'Reset completato', dettagli: risultato });
	} catch (errore) {
		console.error('Errore durante il reset settimanale:', errore.message);
		return res.status(500).json({ error: 'Errore interno durante il reset' });
	}
});

module.exports = router;
