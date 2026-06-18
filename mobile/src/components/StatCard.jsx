/**
 * StatCard — label + value stat tile.
 * Props: label (string), value (string)
 */
import { View, Text } from 'react-native';

export default function StatCard({ label, value }) {
  return (
    // Compact rounded tile: small padding, vertical stack, small gap
    <View className="rounded-xl p-3 flex-col gap-1 flex-1">
      <Text>{label}</Text>
      <Text className="mt-1">{value}</Text>
    </View>
  );
}
