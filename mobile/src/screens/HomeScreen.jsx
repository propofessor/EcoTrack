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
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getDailyScore, getWeeklyScore } from '../api/gamification';
import GradeCard from '../components/GradeCard';
import StatCard from '../components/StatCard';
import { Compass, BarChart2, Map } from 'lucide-react-native';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const iconColor = scheme === 'dark' ? '#f4f4f5' : '#09090b';

  const [daily, setDaily] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const displayName = user?.name || user?.email || t('home.defaultUser');

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
    <SafeAreaView className="screen flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="px-4 pt-4 pb-8">

          {/* Greeting */}
          <View className="mb-3">
            <Text className="heading">{t('home.greeting', { name: displayName })}</Text>
            <Text className="text-muted">{t('home.subtitle')}</Text>
          </View>

          {/* Daily grade — RF11.2 */}
          <View className="mb-4">
            <GradeCard score={daily} />
          </View>

          {/* Weekly quick-stats — RF11.3 */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="subheading">{t('home.currentWeek')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Classifica')}>
                <Text className="link">{t('home.viewLeaderboard')}</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap gap-3">
              <StatCard
                label={t('home.weeklyScore')}
                value={weekly ? `${weekly.weeklyScore}` : '—'}
              />
              <StatCard
                label={t('home.activeDays')}
                value={weekly ? `${weekly.daysWithActivity}` : '—'}
              />
            </View>
          </View>

          {/* Quick navigation shortcuts */}
          <View className="mb-6">
            <Text className="subheading mb-3">{t('home.quickActions')}</Text>
            <View className="flex-col gap-2">
              <TouchableOpacity
                className="card rounded-2xl p-4 flex-row items-center gap-3"
                onPress={() => navigation.navigate('Percorso')}
              >
                <Compass size={24} color={iconColor} />
                <View className="flex-1 flex-col gap-1">
                  <Text className="text-body">{t('home.calculateRoute')}</Text>
                  <Text className="text-muted">{t('home.routeCardDesc')}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                className="card rounded-2xl p-4 flex-row items-center gap-3"
                onPress={() => navigation.navigate('Storico')}
              >
                <BarChart2 size={24} color={iconColor} />
                <View className="flex-1 flex-col gap-1">
                  <Text className="text-body">{t('home.historyCard')}</Text>
                  <Text className="text-muted">{t('home.historyCardDesc')}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                className="card rounded-2xl p-4 flex-row items-center gap-3"
                onPress={() => navigation.navigate('Mappa')}
              >
                <Map size={24} color={iconColor} />
                <View className="flex-1 flex-col gap-1">
                  <Text className="text-body">{t('home.mapCard')}</Text>
                  <Text className="text-muted">{t('home.mapCardDesc')}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
