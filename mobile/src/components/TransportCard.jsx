/**
 * TransportCard — one transport mode's route stats and CO2 output.
 *
 * Props:
 *   icon       — emoji or icon element
 *   label      — mode name (e.g. "A piedi")
 *   distanceKm — distance in km
 *   co2Kg      — CO2 emission in kg
 *   isBest     — true when this is the lowest-emission option
 */
import { View, Text } from 'react-native';

export default function TransportCard({ icon, label, distanceKm, co2Kg, isBest }) {
  return (
    // Horizontal card row: icon | info | stats
    // Designer adds visual distinction for isBest (border, background, badge)
    <View className="rounded-2xl p-4 flex-row items-center gap-4">

      {/* Mode icon — 48×48 centred placeholder */}
      <View className="items-center justify-center w-12 h-12">
        <Text>{icon}</Text>
      </View>

      {/* Mode name and optional eco badge */}
      <View className="flex-1 flex-col">
        <Text>{label}</Text>
        {isBest && <Text>🌿 Opzione più ecologica</Text>}
      </View>

      {/* Distance and CO2 figures, right-aligned */}
      <View className="items-end gap-1">
        <Text>{distanceKm.toFixed(1)} km</Text>
        <Text>{co2Kg === 0 ? '0 g CO₂' : `${(co2Kg * 1000).toFixed(0)} g CO₂`}</Text>
      </View>
    </View>
  );
}
