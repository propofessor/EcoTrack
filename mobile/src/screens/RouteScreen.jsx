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
import { useTranslation } from "react-i18next";
import { calculateCo2 } from "../api/maps";
import { getMockDirections } from "../api/directions";
import TransportCard from "../components/TransportCard";
import { Footprints, Bike, Bus, Car, Map } from "lucide-react-native";


const MOCK_POLYLINE = [
  [46.0748, 11.1217],
  [46.073, 11.121],
  [46.072, 11.1205],
  [46.071, 11.12],
  [46.0702, 11.1196],
];

const MODE_ICONS = {
  piedi: (color) => <Footprints size={28} color={color} />,
  bicicletta: (color) => <Bike size={28} color={color} />,
  autobus: (color) => <Bus size={28} color={color} />,
  macchina: (color) => <Car size={28} color={color} />,
};


export default function RouteScreen({ navigation }) {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const iconColor = scheme === "dark" ? "#f4f4f5" : "#09090b";
  const mutedColor = scheme === "dark" ? "#a1a1aa" : "#71717a";

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [results, setResults] = useState(null);
  const [directions, setDirections] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleCalculate() {
    if (!origin.trim() || !destination.trim()) {
      Alert.alert(t("common.error"), t("route.errorFill"));
      return;
    }
    setLoading(true);
    setResults(null);
    try {

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
        t("common.error"),
        err.response?.data?.error || t("route.errorCalc"),
      );
    } finally {
      setLoading(false);
    }
  }


  const bestMode = results
    ? Object.entries(results).reduce(
        (best, [mode, val]) => {
          const co2 = val ?? Infinity;
          return co2 < best.co2 ? { mode, co2 } : best;
        },
        { mode: null, co2: Infinity },
      ).mode
    : null;

  const modes = ["piedi", "bicicletta", "autobus", "macchina"];

  return (
    <SafeAreaView className="screen flex-1">
      <ScrollView className="flex-1">
        <View className="px-4 pt-4 pb-8">
          <Text className="heading">{t("route.title")}</Text>
          <Text className="text-muted mb-4">
            {t("route.subtitle")}
          </Text>

          {}
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
                placeholder={t("route.originPlaceholder")}
                placeholderTextColor={mutedColor}
                style={{ color: iconColor }}
                value={origin}
                onChangeText={setOrigin}
                returnKeyType="next"
              />
            </View>

            {}
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
                placeholder={t("route.destinationPlaceholder")}
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
              <Text className="btn-primary-text">{t("route.calculate")}</Text>
            )}
          </TouchableOpacity>

          {}
          {results && (
            <View className="gap-3">
              <Text className="subheading mb-1">{t("route.resultsTitle")}</Text>
              {modes.map((mode) => (
                <TransportCard
                  key={mode}
                  icon={MODE_ICONS[mode](iconColor)}
                  label={t(`route.modes.${mode}`)}
                  distanceKm={directions?.[mode]?.distanceKm ?? 0}
                  durationMin={directions?.[mode]?.durationMin ?? null}
                  co2Kg={results[mode] != null ? results[mode] / 1000 : 0}
                  isBest={mode === bestMode}
                />
              ))}

              {}
              <TouchableOpacity
                className="btn-ghost rounded-xl py-3 items-center mt-2"
                onPress={() =>
                  navigation.navigate("Mappa", { polyline: MOCK_POLYLINE })
                }
              >
                <View className="flex-row items-center gap-2">
                  <Map size={16} color={mutedColor} />
                  <Text className="btn-ghost-text">
                    {t("route.showOnMap")}
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
