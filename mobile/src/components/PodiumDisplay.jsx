/**
 * PodiumDisplay — top-3 podium (RF11.4).
 *
 * Props:
 *   podium — [{ rank, displayName, weeklyScore }] up to 3 entries
 *
 * Visual order: 2nd (left) | 1st (centre, tallest) | 3rd (right)
 */
import { View, Text } from 'react-native';

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

// Block heights for each podium rank
const PODIUM_HEIGHT = {
  1: 'h-20',       // 80px — tallest
  2: 'h-[60px]',   // 60px
  3: 'h-12',       // 48px — shortest
};

export default function PodiumDisplay({ podium }) {
  if (!podium?.length) return null;

  // Re-order for classic podium layout: 2nd | 1st | 3rd
  const ordered = [
    podium.find((e) => e.rank === 2),
    podium.find((e) => e.rank === 1),
    podium.find((e) => e.rank === 3),
  ].filter(Boolean);

  return (
    // Horizontal row, items aligned to the bottom so blocks grow upward
    <View className="flex-row items-end justify-center gap-2 py-6">
      {ordered.map((entry) => (
        // Each slot is 96px wide, children centred
        <View key={entry.rank} className="items-center w-24">

          {/* Avatar — 48×48 circle above the block */}
          <View className="rounded-full items-center justify-center mb-1 w-12 h-12">
            <Text>{(entry.displayName || '?').charAt(0).toUpperCase()}</Text>
          </View>

          {/* Podium block — height varies by rank */}
          <View className={`w-full items-center justify-center rounded-t-lg ${PODIUM_HEIGHT[entry.rank]}`}>
            <Text>{MEDALS[entry.rank]}</Text>
          </View>

          {/* Name + score below the block */}
          <Text className="mt-2 text-center" numberOfLines={1}>
            {entry.displayName}
          </Text>
          <Text className="text-center">{entry.weeklyScore} pt</Text>
        </View>
      ))}
    </View>
  );
}
