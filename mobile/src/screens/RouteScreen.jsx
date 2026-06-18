/**
 * RouteScreen — RF9
 * Origin–destination inputs → calculate CO2 for 4 transport modes.
 *
 * RF9.1: define route (origin/destination).
 * RF9.2: Google Maps Directions API provides distances.
 * RF9.3: CO2 calculation via POST /api/maps/calculate-co2.
 * RF9.4: comparative results with "best" mode highlighted.
 */
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { calculateCo2 } from '../api/maps';
import TransportCard from '../components/TransportCard';

// Static distance fallback — replace with Google Maps Directions API call in production.
const MOCK_DISTANCES_KM = { walking: 2.1, bicycling: 2.3, transit: 3.8, driving: 2.8 };

const MODE_LABELS = {
  walking: 'A piedi',
  bicycling: 'In bicicletta',
  transit: 'Trasporto pubblico',
  driving: 'Automobile',
};

const MODE_ICONS = { walking: '🚶', bicycling: '🚴', transit: '🚌', driving: '🚗' };

export default function RouteScreen() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [results, setResults] = useState(null);
  const [distances, setDistances] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleCalculate() {
    if (!origin.trim() || !destination.trim()) {
      Alert.alert('Errore', 'Inserisci partenza e destinazione.');
      return;
    }
    setLoading(true);
    setResults(null);
    try {
      const distancesKm = MOCK_DISTANCES_KM;
      setDistances(distancesKm);
      const data = await calculateCo2({ distances: distancesKm });
      setResults(data.emissions);
    } catch (err) {
      Alert.alert('Errore', err.response?.data?.error || 'Impossibile calcolare le emissioni.');
    } finally {
      setLoading(false);
    }
  }

  // RF9.4: find lowest-CO2 mode
  const bestMode = results
    ? Object.entries(results).reduce(
        (best, [mode, val]) =>
          val.co2_kg < best.co2 ? { mode, co2: val.co2_kg } : best,
        { mode: null, co2: Infinity }
      ).mode
    : null;

  const modes = ['walking', 'bicycling', 'transit', 'driving'];

  return (
    <SafeAreaView className="flex-1">
      <ScrollView className="flex-1">
        <View className="px-4 pt-4 pb-8">
          <Text>Calcolo percorso CO2</Text>
          <Text>Confronta l'impatto ambientale dei diversi mezzi di trasporto</Text>

          {/* Route inputs — RF9.1 */}
          <View className="rounded-2xl p-4 gap-3 mb-4">
            <View className="flex-row items-center gap-3">
              <Text>🟢</Text>
              <TextInput
                className="flex-1 rounded-xl px-3 py-2"
                placeholder="Partenza (indirizzo o città)"
                value={origin}
                onChangeText={setOrigin}
                returnKeyType="next"
              />
            </View>

            {/* Visual connector between origin and destination */}
            <View className="w-px ml-4 my-1 h-5" />

            <View className="flex-row items-center gap-3">
              <Text>🔴</Text>
              <TextInput
                className="flex-1 rounded-xl px-3 py-2"
                placeholder="Destinazione (indirizzo o città)"
                value={destination}
                onChangeText={setDestination}
                returnKeyType="done"
              />
            </View>
          </View>

          <TouchableOpacity
            className="rounded-xl py-4 items-center mb-4"
            onPress={handleCalculate}
            disabled={loading}
          >
            {loading ? <ActivityIndicator /> : <Text>Calcola emissioni</Text>}
          </TouchableOpacity>

          {/* Results — RF9.4 */}
          {results && (
            <View className="gap-3">
              <Text>Confronto emissioni</Text>
              {modes.map((mode) => (
                <TransportCard
                  key={mode}
                  icon={MODE_ICONS[mode]}
                  label={MODE_LABELS[mode]}
                  distanceKm={distances?.[mode] ?? 0}
                  co2Kg={results[mode]?.co2_kg ?? 0}
                  isBest={mode === bestMode}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
