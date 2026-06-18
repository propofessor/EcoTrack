import client from './client';

/** GET /api/gamification/daily-score — today's grade and score. */
export async function getDailyScore() {
  const res = await client.get('/gamification/daily-score');
  return res.data; // { score: { date, grade, normalizedScore, rawPoints, totalKm, co2SavedKgs } }
}

/** GET /api/gamification/weekly-score — current week's aggregated score. */
export async function getWeeklyScore() {
  const res = await client.get('/gamification/weekly-score');
  return res.data; // { weekStart, weekEnd, weeklyScore, daysWithActivity }
}

/**
 * GET /api/gamification/leaderboard
 * @param {10|20} limit
 */
export async function getLeaderboard(limit = 10) {
  const res = await client.get('/gamification/leaderboard', {
    params: { limit },
  });
  return res.data; // { weekStart, weekEnd, podium, leaderboard, personalRank }
}

/**
 * GET /api/gamification/history
 * @param {number} limit — number of past weeks to return (default 12)
 */
export async function getGamificationHistory(limit = 12) {
  const res = await client.get('/gamification/history', { params: { limit } });
  return res.data; // { weeklyHistory: [...] }
}
