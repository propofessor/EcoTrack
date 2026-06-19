/**
 * GamificationScreen — RF11
 * Weekly leaderboard with podium (top 3) and ranked list.
 *
 * RF11.2: daily grade display.
 * RF11.3: weekly score.
 * RF11.4: podium + top-10/20 leaderboard + personal rank with neighbours.
 * RF11.5: reward badges from weekly history.
 * RF11.6: weekly progression history.
 */
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getLeaderboard,
  getDailyScore,
  getWeeklyScore,
  getGamificationHistory,
} from '../api/gamification';
import GradeCard from '../components/GradeCard';
import PodiumDisplay from '../components/PodiumDisplay';
import LeaderboardRow from '../components/LeaderboardRow';

export default function GamificationScreen() {
  const [daily, setDaily] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [weeklyHistory, setWeeklyHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTop20, setShowTop20] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const limit = showTop20 ? 20 : 10;
      const [d, w, lb, hist] = await Promise.all([
        getDailyScore(),
        getWeeklyScore(),
        getLeaderboard(limit),
        getGamificationHistory(12),
      ]);
      setDaily(d.score);
      setWeekly(w);
      setLeaderboard(lb);
      setWeeklyHistory(hist.weeklyHistory || []);
    } catch {
      // Keep previous data on error
    }
  }, [showTop20]);

  useEffect(() => { loadData().finally(() => setLoading(false)); }, [loadData]);

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View className="screen flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView className="screen flex-1">
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="px-4 pt-4 pb-8">
          <Text className="heading">Gamification</Text>
          <Text className="text-muted mb-4">
            Settimana {leaderboard?.weekStart} – {leaderboard?.weekEnd}
          </Text>

          {/* Daily grade — RF11.2 */}
          <View className="mb-6">
            <Text className="subheading mb-3">Il tuo voto di oggi</Text>
            <GradeCard score={daily} compact />
          </View>

          {/* Weekly score summary — RF11.3 */}
          <View className="mb-6">
            <View className="flex-row flex-wrap gap-3">
              <View className="stat-card rounded-xl p-3 flex-col gap-1 flex-1">
                <Text className="text-label">Punteggio settimana</Text>
                <Text className="stat-value mt-1">{weekly?.weeklyScore ?? '—'}</Text>
              </View>
              <View className="stat-card rounded-xl p-3 flex-col gap-1 flex-1">
                <Text className="text-label">Giorni attivi</Text>
                <Text className="stat-value mt-1">{weekly?.daysWithActivity ?? '—'} / 7</Text>
              </View>
            </View>
          </View>

          {/* Podium — RF11.4 */}
          {leaderboard?.podium?.length > 0 && (
            <View className="mb-6">
              <Text className="subheading mb-2">Podio settimana</Text>
              <PodiumDisplay podium={leaderboard.podium} />
            </View>
          )}

          {/* Personal rank — RF11.4 */}
          {leaderboard?.personalRank && (
            <View className="mb-6">
              <Text className="subheading mb-3">La tua posizione</Text>
              <View className="gap-2">
                {leaderboard.personalRank.neighbors.map((entry) => (
                  <LeaderboardRow
                    key={entry.userId}
                    entry={entry}
                    isSelf={entry.userId === leaderboard.personalRank?.userId}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Full leaderboard — RF11.4 */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="subheading">Classifica {showTop20 ? 'Top 20' : 'Top 10'}</Text>
              <TouchableOpacity onPress={() => setShowTop20((p) => !p)}>
                <Text className="link">{showTop20 ? 'Mostra Top 10' : 'Mostra Top 20'}</Text>
              </TouchableOpacity>
            </View>
            <View className="gap-2">
              {(leaderboard?.leaderboard || []).map((entry) => (
                <LeaderboardRow
                  key={entry.userId}
                  entry={entry}
                  isSelf={entry.userId === leaderboard.personalRank?.userId}
                />
              ))}
              {!leaderboard?.leaderboard?.length && (
                <View className="flex-1 items-center justify-center gap-3 px-8">
                  <Text className="text-muted">Nessun dato disponibile per questa settimana.</Text>
                </View>
              )}
            </View>
          </View>

          {/* Weekly history — RF11.6 */}
          {weeklyHistory.length > 0 && (
            <View className="mb-6">
              <Text className="subheading mb-3">Storico settimane</Text>
              <View className="flex-col gap-2">
                {weeklyHistory.map((week) => (
                  <View
                    key={week.week_start}
                    className="card rounded-2xl p-4 flex-row items-center justify-between"
                  >
                    <View>
                      <Text className="text-body">{week.week_start} – {week.week_end}</Text>
                      <Text className="text-muted">Posizione: #{week.rank}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="subheading">{week.weekly_score} pt</Text>
                      {week.rewards?.length > 0 && (
                        <Text className="text-label">{week.rewards[0].reward_label}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
