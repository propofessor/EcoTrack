import client from './client';


export async function getDailyScore() {
  const res = await client.get('/gamification/daily-score');
  return res.data;
}


export async function getWeeklyScore() {
  const res = await client.get('/gamification/weekly-score');
  return res.data;
}


export async function getLeaderboard(limit = 10) {
  const res = await client.get('/gamification/leaderboard', {
    params: { limit },
  });
  return res.data;
}


export async function getGamificationHistory(limit = 12) {
  const res = await client.get('/gamification/history', { params: { limit } });
  return res.data;
}
