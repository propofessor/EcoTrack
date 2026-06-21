require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { computeDailyScore, calculateGrade } = require('./src/services/scoreEngine');
const { canonicalMovementLabel } = require('./src/utils/movementLabels');
const { getIsoWeekRange } = require('./src/services/gamificationService');

const admin = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TARGET_EMAIL = 'video@ecotrack.test';
const TARGET_PASSWORD = 'EcoTrack2026!';
const TARGET_NAME = 'Demo User';
const SEED_START = '2026-01-01';
const TODAY = '2026-06-21';
const COMPETITOR_PASSWORD = 'EcoTrack2026!';

const COMPETITORS = [
	{ email: 'marco.verdi@ecotrack.demo', name: 'Marco Verdi' },
	{ email: 'sara.bianchi@ecotrack.demo', name: 'Sara Bianchi' },
	{ email: 'luca.tonini@ecotrack.demo', name: 'Luca Tonini' },
	{ email: 'elena.rossi@ecotrack.demo', name: 'Elena Rossi' },
	{ email: 'giulia.moretti@ecotrack.demo', name: 'Giulia Moretti' },
	{ email: 'paolo.ferrari@ecotrack.demo', name: 'Paolo Ferrari' },
	{ email: 'chiara.deluca@ecotrack.demo', name: 'Chiara De Luca' },
	{ email: 'davide.serra@ecotrack.demo', name: 'Davide Serra' }
];

const REWARD_LABELS = {
	1: 'Medaglia Oro Settimanale 🥇',
	2: 'Medaglia Argento Settimanale 🥈',
	3: 'Medaglia Bronzo Settimanale 🥉'
};


function makePRNG(seed) {
	let s = seed >>> 0;
	return () => {
		s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
		return s / 4294967295;
	};
}

function addDays(isoDate, n) {
	const d = new Date(isoDate + 'T00:00:00.000Z');
	d.setUTCDate(d.getUTCDate() + n);
	return d.toISOString().slice(0, 10);
}

function round1(n) {
	return Math.round(n * 10) / 10;
}


const { EMISSION_FACTORS } = require('./src/services/co2Service');
const MODES = [
	{ label: 'Piedi',      factor: 0,                          ptsMin: 120, ptsMax: 200, distMin: 0.5, distMax: 3.0,  speed: 5 },
	{ label: 'Bicicletta', factor: 0,                          ptsMin: 100, ptsMax: 180, distMin: 1.0, distMax: 8.0,  speed: 15 },
	{ label: 'Bus',        factor: EMISSION_FACTORS.bus,        ptsMin: 30,  ptsMax: 70,  distMin: 1.5, distMax: 12.0 },
	{ label: 'Macchina',   factor: EMISSION_FACTORS.car_average, ptsMin: 10,  ptsMax: 30,  distMin: 2.0, distMax: 15.0 }
];


const TARGET_WEIGHTS = [0.22, 0.34, 0.26, 0.18];

function pickMode(rand, weights) {
	const r = rand();
	let cum = 0;
	for (let i = 0; i < MODES.length; i++) {
		cum += weights[i];
		if (r < cum) return MODES[i];
	}
	return MODES[MODES.length - 1];
}


function genHistory(userId, start, end, labelToId, rand, weights) {
	const rows = [];
	const totalDays =
		Math.floor(
			(new Date(end + 'T00:00:00Z') - new Date(start + 'T00:00:00Z')) /
				86400000
		) + 1;

	for (let d = 0; d < totalDays; d++) {
		const date = addDays(start, d);
		const trips = 2 + Math.floor(rand() * 3);
		for (let t = 0; t < trips; t++) {
			const mode = pickMode(rand, weights);
			const distKm = mode.distMin + rand() * (mode.distMax - mode.distMin);



			const durationMin =
				mode.speed != null
					? Math.max(5, Math.round((distKm / mode.speed) * 60))
					: 10 + Math.floor(rand() * 45);

			const startH = 7 + Math.floor(rand() * 13);
			const startM = Math.floor(rand() * 60);
			const ts = new Date(`${date}T00:00:00.000Z`);
			ts.setUTCHours(startH, startM, 0, 0);
			const te = new Date(ts.getTime() + durationMin * 60000);


			const co2 = parseFloat(((distKm * mode.factor) / 1000).toFixed(3));
			const pts = Math.round(mode.ptsMin + rand() * (mode.ptsMax - mode.ptsMin));

			rows.push({
				user_id: userId,
				timestamp_start: ts.toISOString(),
				timestamp_end: te.toISOString(),
				movement_type_id: labelToId[mode.label],
				co2_kgs: co2,
				points: pts
			});
		}
	}
	return rows;
}


const ZERO_EMISSION_SPEEDS_KMH = { Piedi: 5, Bicicletta: 15, Bus: 20 };
const EMITTING_FACTOR_BY_LABEL = {
	Macchina: EMISSION_FACTORS.car_average,
	Bus: EMISSION_FACTORS.bus
};

function deriveDayScore(rowsOfDay, idToLabel) {
	const movements = rowsOfDay.map((r) => {
		const co2Grams = (parseFloat(r.co2_kgs) || 0) * 1000;
		const label = canonicalMovementLabel(idToLabel[r.movement_type_id]) || 'unknown';
		let km;
		if (co2Grams > 0) {
			km = co2Grams / (EMITTING_FACTOR_BY_LABEL[label] ?? 110);
		} else {
			const h =
				(new Date(r.timestamp_end) - new Date(r.timestamp_start)) / 3_600_000;
			km = Math.max(0.1, h * (ZERO_EMISSION_SPEEDS_KMH[label] ?? 8));
		}
		return { movementLabel: label, distanceKm: km, co2Grams };
	});
	return computeDailyScore(movements);
}

function groupByDate(rows) {
	const map = new Map();
	for (const r of rows) {
		const date = r.timestamp_start.slice(0, 10);
		if (!map.has(date)) map.set(date, []);
		map.get(date).push(r);
	}
	return map;
}

async function insertChunked(table, rows, opts) {
	for (let i = 0; i < rows.length; i += 500) {
		const chunk = rows.slice(i, i + 500);
		const q = opts?.onConflict
			? admin.from(table).upsert(chunk, { onConflict: opts.onConflict })
			: admin.from(table).insert(chunk);
		const { error } = await q;
		if (error) throw new Error(`${table} insert: ${error.message}`);
	}
}

async function getAuthUserIdByEmail(email) {

	const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
	return data?.users?.find((u) => u.email === email)?.id || null;
}

async function ensureCompetitor(c) {
	const created = await admin.auth.admin.createUser({
		email: c.email,
		password: COMPETITOR_PASSWORD,
		email_confirm: true,
		user_metadata: { name: c.name }
	});
	let id = created.data?.user?.id;
	if (created.error) {
		id = await getAuthUserIdByEmail(c.email);
		if (!id) throw new Error(`cannot create/find ${c.email}: ${created.error.message}`);
	}
	const { error } = await admin.from('users').upsert({
		id,
		email: c.email,
		name: c.name,
		preferences: { theme: 'dark', notifications: true, leaderboard_visibility: 'nickname' }
	});
	if (error) throw new Error(`users upsert ${c.email}: ${error.message}`);
	return id;
}

async function wipeUserData(userId) {
	await admin.from('rewards').delete().eq('user_id', userId);
	await admin.from('weekly_leaderboard_history').delete().eq('user_id', userId);
	await admin.from('daily_scores').delete().eq('user_id', userId);
	await admin.from('history').delete().eq('user_id', userId);
}

async function main() {
	console.log('▶ EcoTrack demo seeder\n');


	const { data: mts, error: mtErr } = await admin.from('movement_types').select('*');
	if (mtErr) throw new Error(`movement_types: ${mtErr.message}`);
	const labelToId = {};
	const idToLabel = {};
	for (const m of mts) {
		labelToId[m.label] = m.id;
		idToLabel[m.id] = m.label;
	}
	console.log('movement_types:', Object.keys(labelToId).join(', '));


	let target;
	{
		const { data: existing } = await admin.from('users').select('id, email').eq('email', TARGET_EMAIL).single();
		if (existing) {
			target = existing;
		} else {
			const created = await admin.auth.admin.createUser({
				email: TARGET_EMAIL,
				password: TARGET_PASSWORD,
				email_confirm: true,
				user_metadata: { name: TARGET_NAME }
			});
			if (created.error) throw new Error(`cannot create target ${TARGET_EMAIL}: ${created.error.message}`);
			const uid = created.data.user.id;
			const { error: uErr } = await admin.from('users').upsert({
				id: uid,
				email: TARGET_EMAIL,
				name: TARGET_NAME,
				preferences: { theme: 'dark', notifications: true, leaderboard_visibility: 'nickname' }
			});
			if (uErr) throw new Error(`users upsert ${TARGET_EMAIL}: ${uErr.message}`);
			target = { id: uid, email: TARGET_EMAIL };
			console.log('  created auth + profile for', TARGET_EMAIL);
		}
	}
	console.log('target:', target.email, target.id);

	const { weekStart, weekEnd } = getIsoWeekRange(new Date(TODAY + 'T12:00:00Z'));
	console.log('current ISO week:', weekStart, '→', weekEnd, '\n');


	console.log('Seeding target…');
	await wipeUserData(target.id);

	const rand = makePRNG(2026);
	const targetHistory = genHistory(target.id, SEED_START, TODAY, labelToId, rand, TARGET_WEIGHTS);
	await insertChunked('history', targetHistory);
	console.log(`  history: ${targetHistory.length} trips`);


	const byDate = groupByDate(targetHistory);
	const targetDaily = [];
	for (const [date, rows] of byDate) {
		const s = deriveDayScore(rows, idToLabel);
		targetDaily.push({
			user_id: target.id,
			score_date: date,
			raw_points: s.rawPoints,
			normalized_score: s.normalizedScore,
			grade: s.grade,
			total_km: s.totalKm,
			co2_saved_kgs: s.co2SavedKgs,
			updated_at: new Date().toISOString()
		});
	}
	await insertChunked('daily_scores', targetDaily, { onConflict: 'user_id,score_date' });
	console.log(`  daily_scores: ${targetDaily.length} days`);


	const targetWeekly = round1(
		targetDaily
			.filter((d) => d.score_date >= weekStart && d.score_date <= weekEnd)
			.reduce((sum, d) => sum + d.normalized_score, 0)
	);
	console.log(`  current-week weekly score: ${targetWeekly}`);


	const weekBuckets = new Map();
	for (const d of targetDaily) {
		const { weekStart: ws, weekEnd: we } = getIsoWeekRange(
			new Date(d.score_date + 'T12:00:00Z')
		);
		if (ws === weekStart) continue;
		const b = weekBuckets.get(ws) || { week_start: ws, week_end: we, sum: 0 };
		b.sum += d.normalized_score;
		weekBuckets.set(ws, b);
	}
	const pastWeeks = [...weekBuckets.values()]
		.sort((a, b) => (a.week_start < b.week_start ? 1 : -1))
		.slice(0, 12);





	const byScoreDesc = [...pastWeeks].sort((a, b) => b.sum - a.sum);
	const rankByWeekStart = new Map();
	byScoreDesc.forEach((w, idx) => {

		const rank = idx < 3 ? idx + 1 : Math.min(8, 4 + ((idx - 3) % 5));
		rankByWeekStart.set(w.week_start, rank);
	});

	const wlhRows = pastWeeks.map((w) => ({
		user_id: target.id,
		week_start: w.week_start,
		week_end: w.week_end,
		weekly_score: round1(w.sum),
		rank: rankByWeekStart.get(w.week_start)
	}));

	let rewardsCount = 0;
	if (wlhRows.length) {
		const { data: insertedWlh, error: wlhErr } = await admin
			.from('weekly_leaderboard_history')
			.upsert(wlhRows, { onConflict: 'user_id,week_start' })
			.select();
		if (wlhErr) throw new Error(`weekly_leaderboard_history: ${wlhErr.message}`);

		const rewardRows = (insertedWlh || [])
			.filter((w) => w.rank <= 3)
			.map((w) => ({
				user_id: target.id,
				weekly_leaderboard_history_id: w.id,
				rank: w.rank,
				reward_label: REWARD_LABELS[w.rank]
			}));
		if (rewardRows.length) {
			const { error: rErr } = await admin.from('rewards').insert(rewardRows);
			if (rErr) throw new Error(`rewards: ${rErr.message}`);
			rewardsCount = rewardRows.length;
		}
		console.log(`  weekly history: ${wlhRows.length} weeks, ${rewardsCount} rewards`);
	}





	console.log('\nSeeding competitors…');
	const targets = [1.12, 0.92, 0.82, 0.7, 0.58, 0.46, 0.34, 0.22].map((f) =>
		Math.max(5, round1(targetWeekly * f))
	);


	const weekDays = [0, 1, 2, 3, 4, 5].map((n) => addDays(weekStart, n));
	const crand = makePRNG(777);

	for (let i = 0; i < COMPETITORS.length; i++) {
		const c = COMPETITORS[i];
		const id = await ensureCompetitor(c);
		await wipeUserData(id);

		const weeklyTarget = targets[i];
		const per = weeklyTarget / weekDays.length;
		const dailyRows = [];
		const historyRows = [];
		for (const date of weekDays) {
			const n = round1(Math.min(100, Math.max(0, per * (0.75 + crand() * 0.5))));
			const totalKm = round1(6 + crand() * 10);
			const rawPoints = Math.round(n * 8 * totalKm);
			dailyRows.push({
				user_id: id,
				score_date: date,
				raw_points: rawPoints,
				normalized_score: n,
				grade: calculateGrade(n),
				total_km: totalKm,
				co2_saved_kgs: round1(rawPoints / 1000),
				updated_at: new Date().toISOString()
			});


			const trips = 2 + Math.floor(crand() * 2);
			for (let t = 0; t < trips; t++) {
				const mode = MODES[crand() < 0.5 ? 0 : 1];
				const distKm = mode.distMin + crand() * (mode.distMax - mode.distMin);
				const durationMin = Math.max(5, Math.round((distKm / mode.speed) * 60));
				const ts = new Date(`${date}T00:00:00.000Z`);
				ts.setUTCHours(8 + Math.floor(crand() * 10), Math.floor(crand() * 60), 0, 0);
				historyRows.push({
					user_id: id,
					timestamp_start: ts.toISOString(),
					timestamp_end: new Date(ts.getTime() + durationMin * 60000).toISOString(),
					movement_type_id: labelToId[mode.label],
					co2_kgs: 0,
					points: Math.round(mode.ptsMin + crand() * (mode.ptsMax - mode.ptsMin))
				});
			}
		}
		await insertChunked('daily_scores', dailyRows, { onConflict: 'user_id,score_date' });
		await insertChunked('history', historyRows);

		const actualWeekly = round1(dailyRows.reduce((s, d) => s + d.normalized_score, 0));
		console.log(`  ${c.name.padEnd(16)} weekly ≈ ${actualWeekly}`);
	}


	const { getCurrentWeekLeaderboard } = require('./src/services/gamificationService');
	const { data: lb } = await getCurrentWeekLeaderboard({
		limit: 20,
		requestingUserId: target.id,
		referenceDate: new Date(TODAY + 'T12:00:00Z')
	});
	console.log('\n🏁 Current-week leaderboard:');
	for (const e of lb.leaderboard) {
		const me = e.userId === target.id ? '  ⬅ TARGET' : '';
		console.log(`  #${String(e.rank).padStart(2)}  ${String(e.displayName).padEnd(16)} ${e.weeklyScore}${me}`);
	}

	console.log('\n✅ Done.');
}

main().catch((err) => {
	console.error('\n❌ Seed failed:', err.message);
	process.exit(1);
});
