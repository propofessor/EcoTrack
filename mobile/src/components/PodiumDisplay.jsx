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

const PODIUM_HEIGHT = {
  1: 'h-20',
  2: 'h-[60px]',
  3: 'h-12',
};

const PODIUM_COLOR = {
  1: 'podium-block-1',
  2: 'podium-block-2',
  3: 'podium-block-3',
};

export default function PodiumDisplay({ podium }) {
  if (!podium?.length) return null;

  const ordered = [
    podium.find((e) => e.rank === 2),
    podium.find((e) => e.rank === 1),
    podium.find((e) => e.rank === 3),
  ].filter(Boolean);

  return (
    <View className="flex-row items-end justify-center gap-2 py-6">
      {ordered.map((entry) => (
        <View key={entry.rank} className="items-center w-24">

          {/* Avatar circle */}
          <View className="avatar rounded-full items-center justify-center mb-1 w-12 h-12">
            <Text className="text-body font-bold">
              {(entry.displayName || '?').charAt(0).toUpperCase()}
            </Text>
          </View>

          {/* Podium block */}
          <View className={`w-full items-center justify-center rounded-t-lg ${PODIUM_HEIGHT[entry.rank]} ${PODIUM_COLOR[entry.rank]}`}>
            <Text>{MEDALS[entry.rank]}</Text>
          </View>

          {/* Name + score */}
          <Text className="podium-name mt-2 text-center" numberOfLines={1}>
            {entry.displayName}
          </Text>
          <Text className="podium-score text-center">{entry.weeklyScore} pt</Text>
        </View>
      ))}
    </View>
  );
}
