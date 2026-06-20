/**
 * RouteScreen — RF9
 * Origin–destination inputs → calculate CO2 for 4 transport modes.
 *
 * RF9.1: define route (origin/destination).
 * RF9.2: getMockDirections provides distances and travel times (mock; replace with
 *        real Directions API when a paid key is available).
 * RF9.3: CO2 calculation via POST /api/maps/calculate-co2.
 * RF9.4: comparative results with distance, travel time, CO2, and "best" mode highlighted.
 * RF9.5: "Mostra su mappa" button sends the mock polyline to MapScreen.
 */
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { calculateCo2 } from "../api/maps";
import { getMockDirections } from "../api/directions";
import TransportCard from "../components/TransportCard";
import { Footprints, Bike, Bus, Car, Map } from "lucide-react-native";

const MODE_LABELS = {
  piedi: "A piedi",
  bicicletta: "In bicicletta",
  autobus: "Trasporto pubblico",
  macchina: "Automobile",
};

// Static mock polyline for Trento — same waypoints used in MapScreen.
// In production this would come from the Directions API response polyline.
const MOCK_POLYLINE = [
  [46.0748, 11.1217],
  [46.073, 11.121],
  [46.072, 11.1205],
  [46.071, 11.12],
  [46.0702, 11.1196],
];

const MODE_ICONS = {
  walking: (color) => <Footprints size={28} color={color} />,
  bicycling: (color) => <Bike size={28} color={color} />,
  transit: (color) => <Bus size={28} color={color} />,
  driving: (color) => <Car size={28} color={color} />,
};

export default function RouteScreen({ navigation }) {
  const scheme = useColorScheme();
  const iconColor = scheme === "dark" ? "#f4f4f5" : "#09090b";
  const mutedColor = scheme === "dark" ? "#a1a1aa" : "#71717a";

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [results, setResults] = useState(null);
  const [directions, setDirections] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleCalculate() {
    if (!origin.trim() || !destination.trim()) {
      Alert.alert("Errore", "Inserisci partenza e destinazione.");
      return;
    }
    setLoading(true);
    setResults(null);
    try {
      // RF9.2: resolve distances and travel times per mode
      const dir = getMockDirections(origin, destination);
      setDirections(dir);

      const distancesKm = {
        piedi: dir.piedi.distanceKm,
        bicicletta: dir.bicicletta.distanceKm,
        autobus: dir.autobus.distanceKm,
        macchina: dir.macchina.distanceKm,
      };

      const data = await calculateCo2({ distances: distancesKm });
      setResults(data.emissions);
    } catch (err) {
      Alert.alert(
        "Errore",
        err.response?.data?.error || "Impossibile calcolare le emissioni.",
      );
    } finally {
      setLoading(false);
    }
  }

  // RF9.4: find lowest-CO2 mode
  const bestMode = results
    ? Object.entries(results).reduce(
        (best, [mode, val]) =>
          val.co2_kg < best.co2 ? { mode, co2: val.co2_kg } : best,
        { mode: null, co2: Infinity },
      ).mode
    : null;

  const modes = ["piedi", "bicicletta", "autobus", "macchina"];

  return (
    <SafeAreaView className="screen flex-1">
      <ScrollView className="flex-1">
        <View className="px-4 pt-4 pb-8">
          <Text className="heading">Calcolo percorso CO2</Text>
          <Text className="text-muted mb-4">
            Confronta l'impatto ambientale dei diversi mezzi di trasporto
          </Text>

          {/* Route inputs — RF9.1 */}
          <View className="card rounded-2xl p-4 gap-3 mb-4">
            <View className="flex-row items-center gap-3">
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: "#8ab834",
                }}
              />
              <TextInput
                className="input flex-1 rounded-xl px-3 py-2"
                placeholder="Partenza (indirizzo o città)"
                placeholderTextColor={mutedColor}
                style={{ color: iconColor }}
                value={origin}
                onChangeText={setOrigin}
                returnKeyType="next"
              />
            </View>

            {/* Visual connector between origin and destination */}
            <View className="divider w-px ml-4 my-1 h-5" />

            <View className="flex-row items-center gap-3">
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: "#ef4444",
                }}
              />
              <TextInput
                className="input flex-1 rounded-xl px-3 py-2"
                placeholder="Destinazione (indirizzo o città)"
                placeholderTextColor={mutedColor}
                style={{ color: iconColor }}
                value={destination}
                onChangeText={setDestination}
                returnKeyType="done"
              />
            </View>
          </View>

          <TouchableOpacity
            className="btn-primary rounded-xl py-4 items-center mb-4"
            onPress={handleCalculate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="btn-primary-text">Calcola emissioni</Text>
            )}
          </TouchableOpacity>

          {/* Results — RF9.4 */}
          {results && (
            <View className="gap-3">
              <Text className="subheading mb-1">Confronto emissioni</Text>
              {modes.map((mode) => (
                <TransportCard
                  key={mode}
                  icon={MODE_ICONS[mode](iconColor)}
                  label={MODE_LABELS[mode]}
                  distanceKm={directions?.[mode]?.distanceKm ?? 0}
                  durationMin={directions?.[mode]?.durationMin ?? null}
                  co2Kg={results[mode]?.co2_kg ?? 0}
                  isBest={mode === bestMode}
                />
              ))}

              {/* RF9.5: route visualization on map */}
              <TouchableOpacity
                className="btn-ghost rounded-xl py-3 items-center mt-2"
                onPress={() =>
                  navigation.navigate("Mappa", { polyline: MOCK_POLYLINE })
                }
              >
                <View className="flex-row items-center gap-2">
                  <Map size={16} color={mutedColor} />
                  <Text className="btn-ghost-text">
                    Mostra percorso su mappa
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
