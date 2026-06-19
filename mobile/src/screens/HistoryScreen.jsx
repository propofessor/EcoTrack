/**
 * HistoryScreen — RF10
 * Ecological footprint over time: line chart + summary statistics.
 *
 * RF10.1: dedicated screen.
 * RF10.2: daily / weekly / monthly / annual granularity.
 * RF10.3: line chart for periods > 1 day.
 * RF10.4: current value, average, trend, min/max, cumulative.
 */
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { getHistory } from '../api/history';

const PERIODS = [
  { key: 'day', label: 'Giorno' },
  { key: 'week', label: 'Settimana' },
  { key: 'month', label: 'Mese' },
  { key: 'year', label: 'Anno' },
  { key: 'all', label: 'Tutto' },
];

const screenWidth = Dimensions.get('window').width;

function aggregateHistory(rawHistory, period) {
  if (!rawHistory?.length) return { labels: [], values: [] };
  const map = {};
  rawHistory.forEach((row) => {
    const d = new Date(row.timestamp_start);
    let key;
    if (period === 'day') key = d.toISOString().slice(0, 10);
    else if (period === 'week') {
      const day = d.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day;
      const mon = new Date(d);
      mon.setUTCDate(d.getUTCDate() + diff);
      key = mon.toISOString().slice(0, 10);
    } else if (period === 'month') key = d.toISOString().slice(0, 7);
    else if (period === 'year') key = String(d.getUTCFullYear());
    else key = d.toISOString().slice(0, 7);
    map[key] = (map[key] || 0) + (parseFloat(row.co2_kgs) || 0);
  });
  const entries = Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  const sliced = entries.slice(-8);
  return {
    labels: sliced.map(([k]) => {
      if (period === 'day') return k.slice(5);
      if (period === 'month' || period === 'all') return k.slice(0, 7).replace('-', '/');
      return k;
    }),
    values: sliced.map(([, v]) => parseFloat(v.toFixed(2))),
  };
}

function computeStats(values) {
  if (!values.length) return { avg: 0, min: 0, max: 0, total: 0 };
  const total = values.reduce((s, v) => s + v, 0);
  return {
    avg: parseFloat((total / values.length).toFixed(2)),
    min: Math.min(...values),
    max: Math.max(...values),
    total: parseFloat(total.toFixed(2)),
  };
}

export default function HistoryScreen() {
  const [rawHistory, setRawHistory] = useState([]);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await getHistory();
      setRawHistory(data.history || []);
    } catch {
      // Keep existing data on error
    }
  }, []);

  useEffect(() => { loadData().finally(() => setLoading(false)); }, [loadData]);

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const { labels, values } = aggregateHistory(rawHistory, period);
  const stats = computeStats(values);
  const chartData = {
    labels: labels.length ? labels : ['—'],
    datasets: [{ data: values.length ? values : [0] }],
  };
  const trend = values.length >= 2
    ? ((values[values.length - 1] - values[values.length - 2]) /
        (values[values.length - 2] || 1)) * 100
    : 0;

  return (
    <SafeAreaView className="screen flex-1">
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="px-4 pt-4 pb-8">
          <Text className="heading">Storico emissioni</Text>
          <Text className="text-muted mb-4">La tua impronta ecologica nel tempo</Text>

          {/* Period selector — RF10.2 */}
          <View className="flex-row gap-1 mb-4">
            {PERIODS.map((p) => (
              <TouchableOpacity
                key={p.key}
                className={`flex-1 items-center justify-center py-2 period-btn${period === p.key ? ' period-btn--active' : ''}`}
                onPress={() => setPeriod(p.key)}
              >
                <Text className={period === p.key ? 'period-btn-text--active' : 'period-btn-text'}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Line chart — RF10.3 */}
          {loading ? (
            <View className="screen flex-1 items-center justify-center">
              <ActivityIndicator />
            </View>
          ) : (
            <View className="rounded-2xl overflow-hidden mb-4" style={{ height: 220 }}>
              <LineChart
                data={chartData}
                width={screenWidth - 32}
                height={220}
                yAxisSuffix=" kg"
                chartConfig={{
                  backgroundGradientFrom: '#fff',
                  backgroundGradientTo: '#fff',
                  color: (opacity = 1) => `rgba(0,0,0,${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`,
                  propsForDots: { r: '4' },
                }}
                bezier
                style={{ borderRadius: 12 }}
              />
            </View>
          )}

          {/* Summary statistics — RF10.4 */}
          <View className="flex-row flex-wrap gap-3 mb-4">
            <View className="stat-card rounded-xl p-3 flex-col gap-1 flex-1">
              <Text className="text-label">Totale</Text>
              <Text className="stat-value mt-1">{stats.total} kg</Text>
            </View>
            <View className="stat-card rounded-xl p-3 flex-col gap-1 flex-1">
              <Text className="text-label">Media</Text>
              <Text className="stat-value mt-1">{stats.avg} kg</Text>
            </View>
            <View className="stat-card rounded-xl p-3 flex-col gap-1 flex-1">
              <Text className="text-label">Migliore</Text>
              <Text className="stat-value mt-1">{stats.min} kg</Text>
            </View>
            <View className="stat-card rounded-xl p-3 flex-col gap-1 flex-1">
              <Text className="text-label">Peggiore</Text>
              <Text className="stat-value mt-1">{stats.max} kg</Text>
            </View>
          </View>

          {/* Trend indicator */}
          {values.length >= 2 && (
            <View className="card rounded-2xl p-4">
              <View className="flex-row items-center gap-1 mt-1">
                <Text className={trend < 0 ? 'trend-positive' : 'trend-negative'}>
                  {trend < 0 ? '↘ ' : '↗ '}
                </Text>
                <Text className="text-body">
                  {Math.abs(trend).toFixed(1)}%{' '}
                  {trend < 0 ? 'in miglioramento' : 'in peggioramento'} rispetto al periodo precedente
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
