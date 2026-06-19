/**
 * GradeCard — daily ecological grade (S–E) with supporting stats.
 *
 * Props:
 *   score   — { grade, normalizedScore, totalKm, co2SavedKgs } | null
 *   compact — omit secondary stats row (used in dense contexts)
 */
import { View, Text } from 'react-native';

export default function GradeCard({ score, compact = false }) {
  const grade = score?.grade ?? '—';
  const points = score?.normalizedScore ?? 0;
  const km = score?.totalKm ?? 0;
  const co2Saved = score?.co2SavedKgs ?? 0;

  return (
    <View className="grade-card rounded-2xl px-4 py-8 items-center">

      {/* Large grade letter */}
      <View className="items-center justify-center w-24 h-24">
        <Text className="grade-letter">{grade}</Text>
      </View>

      {/* Numeric score */}
      <View className="mt-3">
        <Text className="grade-points">{points.toFixed(1)} pt</Text>
      </View>

      {/* Secondary stats — hidden in compact mode */}
      {!compact && (
        <View className="flex-row justify-around w-full mt-6 pt-4">
          <View className="items-center">
            <Text className="grade-stat-value">{km.toFixed(1)} km</Text>
            <Text className="grade-stat-label">Percorsi</Text>
          </View>
          <View className="items-center">
            <Text className="grade-stat-value">{co2Saved.toFixed(2)} kg</Text>
            <Text className="grade-stat-label">CO2 risparmiata</Text>
          </View>
        </View>
      )}
    </View>
  );
}
