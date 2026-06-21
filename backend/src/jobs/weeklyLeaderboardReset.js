const cron = require('node-cron');
const { closeWeekAndAwardRewards } = require('../services/gamificationService');


const WEEKLY_RESET_CRON_EXPRESSION = '55 23 * * 0';


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
