// src/jobs/weeklyLeaderboardReset.js
const cron = require('node-cron');
const { closeWeekAndAwardRewards } = require('../services/gamificationService');

// RF11.3: "Il calcolo settimanale viene aggiornato realtime e resettato
// ogni domenica." RF11.5: "ricompense devono essere assegnate
// automaticamente al termine di ogni settimana".
//
// Schedulazione: ogni domenica alle 23:55 (Europe/Rome), così la
// chiusura avviene a fine giornata di domenica, dopo che l'ultima
// attività della settimana ha avuto modo di essere registrata, e prima
// della mezzanotte che farebbe scattare il nuovo range settimanale.
//
// Espressione cron: minuto ora giorno-mese mese giorno-settimana
//   55  23  *  *  0   → ogni domenica (0) alle 23:55
const WEEKLY_RESET_CRON_EXPRESSION = '55 23 * * 0';

/**
 * Registra il job di chiusura settimanale. Va chiamata una sola volta
 * all'avvio del server (vedi src/index.js), seguendo lo stesso pattern
 * con cui le altre risorse vengono inizializzate al bootstrap.
 *
 * Isolata in questo modulo (invece che inline in index.js) per essere
 * facilmente disattivabile nei test e per non appesantire index.js con
 * logica di scheduling.
 */
function scheduleWeeklyLeaderboardReset() {
	cron.schedule(
		WEEKLY_RESET_CRON_EXPRESSION,
		async () => {
			console.log(
				'[RF11] Avvio chiusura settimanale classifica e assegnazione ricompense...'
			);
			try {
				const { data, error } = await closeWeekAndAwardRewards();
				if (error) {
					console.error(
						'[RF11] Errore durante la chiusura settimanale della classifica:',
						error.message
					);
					return;
				}
				console.log(
					`[RF11] Settimana ${data.weekStart} - ${data.weekEnd} chiusa con successo. Ricompense assegnate: ${data.rewardsAwarded}`
				);
			} catch (err) {
				console.error(
					'[RF11] Errore imprevisto durante la chiusura settimanale della classifica:',
					err
				);
			}
		},
		{ timezone: 'Europe/Rome' }
	);

	console.log(
		`[RF11] Job di reset settimanale classifica registrato (cron: "${WEEKLY_RESET_CRON_EXPRESSION}", Europe/Rome)`
	);
}

module.exports = {
	scheduleWeeklyLeaderboardReset,
	WEEKLY_RESET_CRON_EXPRESSION
};
