/**
 * GradeCard — daily ecological grade (S–E) with supporting stats.
 *
 * Props:
 *   score   — { grade, normalizedScore, totalKm, co2SavedKgs } | null
 *   compact — omit secondary stats row (used in dense contexts)
 */
import { View, Text, useColorScheme } from 'react-native';

export default function GradeCard({ score, compact = false }) {
  const isDark = useColorScheme() === 'dark';
  const grade = score?.grade ?? '—';
  const points = score?.normalizedScore ?? 0;
  const km = score?.totalKm ?? 0;
  const co2Saved = score?.co2SavedKgs ?? 0;

  return (
    <View className="grade-card rounded-2xl p-4 flex-row items-center gap-4">

      {/* Grade letter in a tinted circle */}
      <View
        className="items-center justify-center w-20 h-20 rounded-full"
        style={{
          backgroundColor: isDark ? 'rgba(138,184,52,0.12)' : '#eef5e5',
          borderWidth: 1.5,
          borderColor: isDark ? '#8ab834' : '#c8dfa8',
        }}
      >
        <Text className="grade-letter">{grade}</Text>
      </View>

      {/* Score and optional stats */}
      <View className="flex-1 flex-col gap-1">
        <Text className="grade-points">{points.toFixed(1)} pt</Text>

        {!compact && (
          <View className="flex-row gap-5 mt-1">
            <View>
              <Text className="grade-stat-value">{km.toFixed(1)} km</Text>
              <Text className="grade-stat-label">Percorsi</Text>
            </View>
            <View>
              <Text className="grade-stat-value">{co2Saved.toFixed(2)} kg</Text>
              <Text className="grade-stat-label">CO2 risparmiata</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
