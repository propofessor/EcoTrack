/**
 * HomeScreen — RF11.1 / RF11.2
 * Shows today's ecological grade (S–E) and the current week's score at a glance.
 */
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { getDailyScore, getWeeklyScore } from '../api/gamification';
import GradeCard from '../components/GradeCard';
import StatCard from '../components/StatCard';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();

  const [daily, setDaily] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const displayName = user?.profile?.name || user?.email || 'Utente';

  const loadData = useCallback(async () => {
    try {
      const [d, w] = await Promise.all([getDailyScore(), getWeeklyScore()]);
      setDaily(d.score);
      setWeekly(w);
    } catch {
      // Leave previous data visible on error; no crash.
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  return (
    <SafeAreaView className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="px-4 pt-4 pb-8">

          {/* Greeting */}
          <View className="mb-3">
            <Text>Ciao, {displayName} 👋</Text>
            <Text>Ecco il tuo impatto ambientale di oggi</Text>
          </View>

          {/* Daily grade — RF11.2 */}
          <View className="mb-6">
            <GradeCard score={daily} />
          </View>

          {/* Weekly quick-stats — RF11.3 */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text>Settimana corrente</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Classifica')}>
                <Text>Vedi classifica →</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap gap-3">
              <StatCard
                label="Punteggio settim."
                value={weekly ? `${weekly.weeklyScore}` : '—'}
              />
              <StatCard
                label="Giorni attivi"
                value={weekly ? `${weekly.daysWithActivity}` : '—'}
              />
            </View>
          </View>

          {/* Quick navigation shortcuts */}
          <View className="mb-6">
            <Text>Accesso rapido</Text>
            <View className="flex-col gap-2">
              <TouchableOpacity
                className="rounded-2xl p-4 flex-row items-center gap-3"
                onPress={() => navigation.navigate('Percorso')}
              >
                <Text>🧭</Text>
                <View className="flex-col gap-2">
                  <Text>Calcola percorso</Text>
                  <Text>Confronta le emissioni CO2 per il tuo tragitto</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                className="rounded-2xl p-4 flex-row items-center gap-3"
                onPress={() => navigation.navigate('Storico')}
              >
                <Text>📊</Text>
                <View className="flex-col gap-2">
                  <Text>Storico emissioni</Text>
                  <Text>Analizza il tuo andamento nel tempo</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                className="rounded-2xl p-4 flex-row items-center gap-3"
                onPress={() => navigation.navigate('Mappa')}
              >
                <Text>🗺️</Text>
                <View className="flex-col gap-2">
                  <Text>Mappa qualità aria</Text>
                  <Text>Visualizza l'inquinamento nella tua città</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
