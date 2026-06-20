// __tests__/weeklyLeaderboardReset.test.js
// Unit test del job di reset settimanale della classifica (RF11.5).
// Mockiamo node-cron e il gamificationService per isolare la logica del job.

jest.mock('node-cron', () => ({ schedule: jest.fn() }));
jest.mock('../src/services/gamificationService', () => ({
	closeWeekAndAwardRewards: jest.fn()
}));

const cron = require('node-cron');
const {
	closeWeekAndAwardRewards
} = require('../src/services/gamificationService');
const {
	scheduleWeeklyLeaderboardReset,
	WEEKLY_RESET_CRON_EXPRESSION
} = require('../src/jobs/weeklyLeaderboardReset');

describe('weeklyLeaderboardReset job', () => {
	let logSpy;
	let errorSpy;

	beforeEach(() => {
		jest.clearAllMocks();
		logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
		errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		logSpy.mockRestore();
		errorSpy.mockRestore();
	});

	it('usa l’espressione cron "55 23 * * 0" (domenica 23:55)', () => {
		expect(WEEKLY_RESET_CRON_EXPRESSION).toBe('55 23 * * 0');
	});

	it('registra il job su node-cron con timezone Europe/Rome', () => {
		scheduleWeeklyLeaderboardReset();

		expect(cron.schedule).toHaveBeenCalledTimes(1);
		const [expr, callback, options] = cron.schedule.mock.calls[0];
		expect(expr).toBe(WEEKLY_RESET_CRON_EXPRESSION);
		expect(typeof callback).toBe('function');
		expect(options).toEqual({ timezone: 'Europe/Rome' });
	});

	it('chiude la settimana con successo quando il service risponde senza errori', async () => {
		closeWeekAndAwardRewards.mockResolvedValue({
			data: { weekStart: '2026-06-15', weekEnd: '2026-06-21', rewardsAwarded: 3 },
			error: null
		});

		scheduleWeeklyLeaderboardReset();
		const callback = cron.schedule.mock.calls[0][1];
		await callback();

		expect(closeWeekAndAwardRewards).toHaveBeenCalledTimes(1);
		expect(errorSpy).not.toHaveBeenCalled();
		expect(
			logSpy.mock.calls.some((c) => String(c[0]).includes('chiusa con successo'))
		).toBe(true);
	});

	it('logga un errore se il service restituisce un errore controllato', async () => {
		closeWeekAndAwardRewards.mockResolvedValue({
			data: null,
			error: { message: 'DB non raggiungibile' }
		});

		scheduleWeeklyLeaderboardReset();
		const callback = cron.schedule.mock.calls[0][1];
		await callback();

		expect(errorSpy).toHaveBeenCalled();
	});

	it('cattura le eccezioni impreviste del service', async () => {
		closeWeekAndAwardRewards.mockRejectedValue(new Error('crash'));

		scheduleWeeklyLeaderboardReset();
		const callback = cron.schedule.mock.calls[0][1];
		await callback();

		expect(errorSpy).toHaveBeenCalled();
	});
});
