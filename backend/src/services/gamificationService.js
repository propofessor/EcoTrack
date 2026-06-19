// src/services/gamificationService.js
const { supabaseAdmin } = require('../db');
const { computeDailyScore } = require('./scoreEngine');
const { notifyUser, notifyMany } = require('./notificationService');

// ============================================================
// HELPERS DI DATA (settimana ISO: lunedì-domenica, reset alla domenica
// come richiesto da RF11.3 "resettato ogni domenica")
// ============================================================

function toDateOnly(date) {
	return date.toISOString().slice(0, 10);
}

/**
 * Calcola inizio (lunedì) e fine (domenica) della settimana ISO a cui
 * appartiene la data fornita.
 */
function getIsoWeekRange(referenceDate = new Date()) {
	const date = new Date(referenceDate);
	const dayOfWeek = date.getUTCDay(); // 0 = domenica, 1 = lunedì, ...
	const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

	const monday = new Date(date);
	monday.setUTCDate(date.getUTCDate() + diffToMonday);
	monday.setUTCHours(0, 0, 0, 0);

	const sunday = new Date(monday);
	sunday.setUTCDate(monday.getUTCDate() + 6);

	return { weekStart: toDateOnly(monday), weekEnd: toDateOnly(sunday) };
}

// ============================================================
// RF11.1 / RF11.2: ricalcolo del punteggio giornaliero di un utente
// ============================================================

/**
 * Ricalcola e salva (upsert) il punteggio giornaliero di un utente per
 * una data specifica, leggendo tutti i movimenti di quel giorno da
 * `history`. Va chiamata ogni volta che un nuovo viaggio viene
 * registrato (RF11.1: "calcolo deve avvenire real time per ogni
 * attività"), così il punteggio del giorno è sempre coerente con
 * l'ultimo dato disponibile.
 *
 * @param {string} userId
 * @param {string} dateOnly - formato 'YYYY-MM-DD'
 * @returns {Promise<{data: object|null, error: object|null}>}
 */
async function recalculateDailyScore(userId, dateOnly) {
	const dayStart = `${dateOnly}T00:00:00.000Z`;
	const dayEnd = `${dateOnly}T23:59:59.999Z`;

	const { data: dayHistory, error: historyError } = await supabaseAdmin
		.from('history')
		.select(
			`
			co2_kgs,
			timestamp_start,
			timestamp_end,
			movement_types ( label )
		`
		)
		.eq('user_id', userId)
		.gte('timestamp_start', dayStart)
		.lte('timestamp_start', dayEnd);

	if (historyError) {
		console.error(
			'Errore Supabase nel recupero storico per ricalcolo punteggio giornaliero:',
			historyError.message
		);
		return { data: null, error: historyError };
	}

	// NOTA: history.co2_kgs è l'emissione effettiva del movimento, non la
	// distanza. Per coerenza con scoreEngine (che lavora su distanza e
	// CO2 effettiva) deriviamo una distanza implicita dal rapporto
	// emissione/fattore quando il movimento non è 'driving'/'transit' a
	// emissione nulla. In assenza del dato di distanza esplicito in
	// `history` (lo schema attuale non lo persiste, solo l'emissione
	// risultante), usiamo co2_kgs come proxy diretto del "comportamento
	// virtuoso": più basso è, meglio è. Questo evita di richiedere una
	// migrazione aggiuntiva sulla tabella `history` esistente.
	// Average speeds (km/h) used to estimate distance for zero-emission trips
	// whose co2_kgs=0 makes the CO2-based proxy unusable.
	const ZERO_EMISSION_SPEEDS_KMH = { walking: 5, bicycling: 15, transit: 20 };

	const movements = (dayHistory || []).map((entry) => {
		const co2Grams = (parseFloat(entry.co2_kgs) || 0) * 1000;
		const movementLabel = entry.movement_types?.label || 'unknown';

		let impliedKm;
		if (co2Grams > 0) {
			// Non-zero CO2: reverse-engineer distance from emission / baseline factor
			impliedKm = co2Grams / 110;
		} else {
			// Zero-emission trip: estimate distance from elapsed time × mode speed
			const durationHours =
				(new Date(entry.timestamp_end) - new Date(entry.timestamp_start)) /
				3_600_000;
			const speed = ZERO_EMISSION_SPEEDS_KMH[movementLabel] ?? 8;
			impliedKm = Math.max(0.1, durationHours * speed);
		}

		return { movementLabel, distanceKm: impliedKm, co2Grams };
	});

	const score = computeDailyScore(movements);

	const { data, error } = await supabaseAdmin
		.from('daily_scores')
		.upsert(
			{
				user_id: userId,
				score_date: dateOnly,
				raw_points: score.rawPoints,
				normalized_score: score.normalizedScore,
				grade: score.grade,
				total_km: score.totalKm,
				co2_saved_kgs: score.co2SavedKgs,
				updated_at: new Date().toISOString()
			},
			{ onConflict: 'user_id,score_date' }
		)
		.select()
		.single();

	if (error) {
		console.error(
			'Errore Supabase nel salvataggio del punteggio giornaliero:',
			error.message
		);
		return { data: null, error };
	}

	// RF11.2: notify user of their daily grade (fire-and-forget — don't block the response)
	const grade = score.grade;
	const gradeEmoji = grade === 'S' ? '🌟' : grade === 'A' ? '✅' : grade === 'B' ? '👍' : grade === 'C' ? '⚠️' : '📉';
	notifyUser(
		userId,
		`Voto giornaliero: ${grade} ${gradeEmoji}`,
		`Hai ottenuto un punteggio di ${score.normalizedScore.toFixed(0)}/100 oggi. Continua così!`
	).catch(() => {});

	return { data, error: null };
}

// ============================================================
// RF11.3: punteggio settimanale (aggregazione real-time dei giornalieri)
// ============================================================

/**
 * Somma i punteggi normalizzati giornalieri di un utente per la
 * settimana corrente. Non persiste nulla: è un calcolo live, coerente
 * con RF11.3 ("aggiornato realtime"). La persistenza dello snapshot
 * settimanale avviene solo alla chiusura (vedi closeWeekAndResetLeaderboard).
 */
async function getWeeklyScoreForUser(userId, referenceDate = new Date()) {
	const { weekStart, weekEnd } = getIsoWeekRange(referenceDate);

	const { data, error } = await supabaseAdmin
		.from('daily_scores')
		.select('normalized_score, score_date')
		.eq('user_id', userId)
		.gte('score_date', weekStart)
		.lte('score_date', weekEnd);

	if (error) {
		console.error(
			'Errore Supabase nel calcolo del punteggio settimanale:',
			error.message
		);
		return { data: null, error };
	}

	const weeklyScore = (data || []).reduce(
		(sum, row) => sum + (parseFloat(row.normalized_score) || 0),
		0
	);

	return {
		data: {
			weekStart,
			weekEnd,
			weeklyScore: Math.round(weeklyScore * 10) / 10,
			daysWithActivity: (data || []).filter(
			(r) => (parseFloat(r.normalized_score) || 0) > 0
		).length
		},
		error: null
	};
}

// ============================================================
// RF11.4: classifica live della settimana corrente
// ============================================================

/**
 * Costruisce la classifica della settimana corrente aggregando
 * daily_scores per utente. Applica la preferenza di privacy
 * dell'utente (RF11.4: "nickname, anonimizzazione parziale") leggendo
 * `users.preferences.leaderboard_visibility`.
 *
 * @param {object} options
 * @param {number} options.limit - quanti utenti restituire (es. Top 10/20, RF11.4)
 * @param {string} [options.requestingUserId] - se fornito, calcola anche la posizione personale
 */
async function getCurrentWeekLeaderboard({
	limit = 20,
	requestingUserId,
	referenceDate
} = {}) {
	const { weekStart, weekEnd } = getIsoWeekRange(referenceDate);

	const { data: scores, error: scoresError } = await supabaseAdmin
		.from('daily_scores')
		.select('user_id, normalized_score')
		.gte('score_date', weekStart)
		.lte('score_date', weekEnd);

	if (scoresError) {
		console.error(
			'Errore Supabase nel recupero punteggi per la classifica:',
			scoresError.message
		);
		return { data: null, error: scoresError };
	}

	const totalsByUser = new Map();
	for (const row of scores || []) {
		const current = totalsByUser.get(row.user_id) || 0;
		totalsByUser.set(
			row.user_id,
			current + (parseFloat(row.normalized_score) || 0)
		);
	}

	const userIds = [...totalsByUser.keys()];
	if (userIds.length === 0) {
		return {
			data: { weekStart, weekEnd, podium: [], leaderboard: [], personalRank: null },
			error: null
		};
	}

	const { data: users, error: usersError } = await supabaseAdmin
		.from('users')
		.select('id, name, preferences')
		.in('id', userIds);

	if (usersError) {
		console.error(
			'Errore Supabase nel recupero dati utenti per la classifica:',
			usersError.message
		);
		return { data: null, error: usersError };
	}

	const userById = new Map((users || []).map((u) => [u.id, u]));

	const ranked = userIds
		.map((userId) => ({
			userId,
			displayName: resolveDisplayName(userById.get(userId)),
			weeklyScore: Math.round((totalsByUser.get(userId) || 0) * 10) / 10
		}))
		.sort((a, b) => b.weeklyScore - a.weeklyScore)
		.map((entry, index) => ({ ...entry, rank: index + 1 }));

	let personalRank = null;
	if (requestingUserId) {
		const personalEntry = ranked.find(
			(entry) => entry.userId === requestingUserId
		);
		if (personalEntry) {
			// RF11.4: "mostrando anche gli utenti immediatamente sopra e sotto"
			const personalIndex = ranked.indexOf(personalEntry);
			const neighbors = ranked.slice(
				Math.max(0, personalIndex - 1),
				personalIndex + 2
			);
			personalRank = { ...personalEntry, neighbors };
		}
	}

	return {
		data: {
			weekStart,
			weekEnd,
			podium: ranked.slice(0, 3),
			leaderboard: ranked.slice(0, limit),
			personalRank
		},
		error: null
	};
}

/**
 * Applica la preferenza di privacy dell'utente al nome mostrato in
 * classifica. Default prudente: 'nickname' se non specificato.
 */
function resolveDisplayName(userRow) {
	if (!userRow) return 'Utente EcoTrack';

	const visibility =
		userRow.preferences?.leaderboard_visibility || 'nickname';

	if (visibility === 'anonymous') return 'Utente anonimo';
	if (visibility === 'full_name') return userRow.name || 'Utente EcoTrack';

	// 'nickname': first name + last initial (e.g. "Mario R.").
	// Single-word names are returned as-is to avoid trailing punctuation.
	const parts = (userRow.name || 'Utente').split(' ').filter(Boolean);
	if (parts.length === 1) return parts[0];
	return `${parts[0]} ${parts[1][0]}.`;
}

// ============================================================
// RF11.5 / RF11.3: chiusura settimana, assegnazione ricompense, reset
// ============================================================

const REWARD_LABELS = {
	1: 'Medaglia Oro Settimanale 🥇',
	2: 'Medaglia Argento Settimanale 🥈',
	3: 'Medaglia Bronzo Settimanale 🥉'
};

/**
 * Chiude la settimana appena conclusa: calcola la classifica finale,
 * la persiste in `weekly_leaderboard_history` (storico immutabile per
 * RF11.6), assegna le ricompense ai primi 3 (RF11.5). Non serve
 * "resettare" esplicitamente nulla: la classifica della nuova
 * settimana è automaticamente vuota perché si basa su un range di date
 * diverso (vedi getCurrentWeekLeaderboard) — è la query stessa, non uno
 * stato mutabile, a garantire il reset richiesto da RF11.3.
 *
 * Pensata per essere invocata dal job di cron (vedi
 * src/jobs/weeklyLeaderboardReset.js) ogni domenica a fine giornata,
 * ma esposta come funzione pura del service per essere testabile senza
 * dover simulare un trigger di cron.
 */
async function closeWeekAndAwardRewards(referenceDate = new Date()) {
	const { data: leaderboardData, error: leaderboardError } =
		await getCurrentWeekLeaderboard({ limit: 9999, referenceDate });

	if (leaderboardError) {
		return { data: null, error: leaderboardError };
	}

	const { weekStart, weekEnd, leaderboard } = leaderboardData;

	if (leaderboard.length === 0) {
		return { data: { weekStart, weekEnd, rewardsAwarded: 0 }, error: null };
	}

	const snapshotRows = leaderboard.map((entry) => ({
		user_id: entry.userId,
		week_start: weekStart,
		week_end: weekEnd,
		weekly_score: entry.weeklyScore,
		rank: entry.rank
	}));

	const { data: insertedSnapshots, error: snapshotError } =
		await supabaseAdmin
			.from('weekly_leaderboard_history')
			.upsert(snapshotRows, { onConflict: 'user_id,week_start' })
			.select();

	if (snapshotError) {
		console.error(
			'Errore Supabase nel salvataggio dello storico classifica settimanale:',
			snapshotError.message
		);
		return { data: null, error: snapshotError };
	}

	const topThreeSnapshots = (insertedSnapshots || [])
		.filter((row) => row.rank <= 3)
		.sort((a, b) => a.rank - b.rank);

	const rewardRows = topThreeSnapshots.map((snapshot) => ({
		user_id: snapshot.user_id,
		weekly_leaderboard_history_id: snapshot.id,
		rank: snapshot.rank,
		reward_label:
			REWARD_LABELS[snapshot.rank] || 'Riconoscimento Settimanale'
	}));

	let rewardsAwarded = 0;
	if (rewardRows.length > 0) {
		// Idempotency guard: skip if rewards were already assigned for these snapshots
		const snapshotIds = topThreeSnapshots.map((s) => s.id).filter(Boolean);
		if (snapshotIds.length > 0) {
			const { data: existing } = await supabaseAdmin
				.from('rewards')
				.select('id')
				.in('weekly_leaderboard_history_id', snapshotIds)
				.limit(1);
			if (existing?.length > 0) {
				return { data: { weekStart, weekEnd, rewardsAwarded: 0 }, error: null };
			}
		}

		const { data: insertedRewards, error: rewardError } =
			await supabaseAdmin.from('rewards').insert(rewardRows).select();

		if (rewardError) {
			console.error(
				"Errore Supabase nell'assegnazione delle ricompense settimanali:",
				rewardError.message
			);
			return { data: null, error: rewardError };
		}
		rewardsAwarded = insertedRewards.length;
	}

	// RF11.7: notify all participants about their weekly result (fire-and-forget)
	const allUserIds = leaderboard.map((e) => e.userId);
	const rankByUserId = new Map(leaderboard.map((e) => [e.userId, e.rank]));
	notifyMany(allUserIds, (userId) => {
		const rank = rankByUserId.get(userId);
		if (rank === 1) return { title: '🥇 Hai vinto la classifica!', body: `Sei arrivato 1° questa settimana. Complimenti!` };
		if (rank === 2) return { title: '🥈 Ottimo risultato!', body: `Sei arrivato 2° in classifica questa settimana.` };
		if (rank === 3) return { title: '🥉 Sul podio!', body: `Sei arrivato 3° in classifica questa settimana.` };
		return { title: '📊 Risultati settimanali disponibili', body: `Questa settimana sei arrivato #${rank} in classifica. Continua!` };
	}).catch(() => {});

	return { data: { weekStart, weekEnd, rewardsAwarded }, error: null };
}

// ============================================================
// RF11.6: storico personale e progressione
// ============================================================

async function getUserWeeklyHistory(userId, { limit = 12 } = {}) {
	const { data, error } = await supabaseAdmin
		.from('weekly_leaderboard_history')
		.select(
			`
			week_start,
			week_end,
			weekly_score,
			rank,
			rewards ( reward_label, awarded_at )
		`
		)
		.eq('user_id', userId)
		.order('week_start', { ascending: false })
		.limit(limit);

	if (error) {
		console.error(
			"Errore Supabase nel recupero dello storico settimanale dell'utente:",
			error.message
		);
		return { data: null, error };
	}

	return { data: data || [], error: null };
}

module.exports = {
	getIsoWeekRange,
	resolveDisplayName,
	recalculateDailyScore,
	getWeeklyScoreForUser,
	getCurrentWeekLeaderboard,
	closeWeekAndAwardRewards,
	getUserWeeklyHistory
};
