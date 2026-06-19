/**
 * StatCard — label + value stat tile.
 * Props: label (string), value (string)
 */
import { View, Text } from 'react-native';

export default function StatCard({ label, value }) {
  return (
    <View className="stat-card rounded-xl p-3 flex-col gap-1 flex-1">
      <Text className="text-label">{label}</Text>
      <Text className="stat-value mt-1">{value}</Text>
    </View>
  );
}
