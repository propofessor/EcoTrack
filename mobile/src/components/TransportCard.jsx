/**
 * TransportCard — one transport mode's route stats and CO2 output.
 *
 * Props:
 *   icon        — emoji or icon element
 *   label       — mode name (e.g. "A piedi")
 *   distanceKm  — distance in km
 *   co2Kg       — CO2 emission in kg
 *   isBest      — true when this is the lowest-emission option
 *   durationMin — estimated travel time in minutes (RF9.4)
 */
import { View, Text } from 'react-native';

export default function TransportCard({ icon, label, distanceKm, co2Kg, isBest, durationMin }) {
  return (
    <View className={`rounded-2xl p-4 flex-row items-center gap-4 transport-card${isBest ? ' transport-card--best' : ''}`}>

      {/* Mode icon — 48×48 */}
      <View className="items-center justify-center w-12 h-12">
        <Text>{icon}</Text>
      </View>

      {/* Mode name and optional eco badge */}
      <View className="flex-1 flex-col">
        <Text className="transport-mode-label">{label}</Text>
        {isBest && <Text className="eco-badge">🌿 Opzione più ecologica</Text>}
        {durationMin != null && (
          <Text className="text-muted">{durationMin} min</Text>
        )}
      </View>

      {/* Distance and CO2 figures, right-aligned */}
      <View className="items-end gap-1">
        <Text className="transport-stat">{distanceKm.toFixed(1)} km</Text>
        <Text className="transport-co2">
          {co2Kg === 0 ? '0 g CO₂' : `${(co2Kg * 1000).toFixed(0)} g CO₂`}
        </Text>
      </View>
    </View>
  );
}
