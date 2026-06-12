// backend/src/routes/dashboard.js
const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../db');
const checkApiKey = require('../middleware/apiKeyMiddleware');

router.use(checkApiKey);

// GET /api/dashboard/co2-stats
router.get('/co2-stats', async (req, res) => {
	try {
		const { date_start, date_end, offset = 0, limit = 100 } = req.query;

		let query = supabaseAdmin
			.from('history')
			.select('co2_kgs, points, timestamp_start, movement_types(label)')
			.order('timestamp_start', { ascending: false })
			.range(Number(offset), Number(offset) + Number(limit) - 1);

		if (date_start) query = query.gte('timestamp_start', date_start);
		if (date_end) query = query.lte('timestamp_start', date_end);

		const { data, error } = await query;
		if (error) {
			console.error('Errore Supabase co2-stats:', error);
			return res.status(500).json({ error: 'Errore query database' });
		}

		return res.json({ data, count: data.length });
	} catch (err) {
		console.error('Errore server co2-stats:', err);
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});

// GET /api/dashboard/co2-stats.csv
router.get('/co2-stats.csv', async (req, res) => {
	try {
		const { date_start, date_end } = req.query;

		let query = supabaseAdmin
			.from('history')
			.select('co2_kgs, points, timestamp_start')
			.order('timestamp_start', { ascending: false });

		if (date_start) query = query.gte('timestamp_start', date_start);
		if (date_end) query = query.lte('timestamp_start', date_end);

		const { data, error } = await query;
		if (error) return res.status(500).json({ error });

		const header = 'timestamp_start,co2_kgs,points';
		const rows = data.map(
			(r) => `${r.timestamp_start},${r.co2_kgs},${r.points}`
		);
		const csv = [header, ...rows].join('\n');

		res.setHeader('Content-Type', 'text/csv');
		res.setHeader(
			'Content-Disposition',
			'attachment; filename="co2-stats.csv"'
		);
		return res.send(csv);
	} catch (err) {
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});

// GET /api/dashboard/leaderboard
router.get('/leaderboard', async (req, res) => {
	try {
		const { limit = 20 } = req.query;

		const { data, error } = await supabaseAdmin
			.from('history')
			.select('user_id, points, timestamp_start')
			.order('points', { ascending: false })
			.limit(Number(limit));

		if (error) return res.status(500).json({ error });
		return res.json({ data });
	} catch (err) {
		return res.status(500).json({ error: 'Errore interno del server' });
	}
});

module.exports = router;
