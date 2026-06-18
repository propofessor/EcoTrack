/**
 * LeaderboardRow — a single ranked entry in the leaderboard list.
 *
 * Props:
 *   entry  — { rank, displayName, weeklyScore }
 *   isSelf — highlight this row as the current user
 *            (designer adds background/border for isSelf=true)
 */
import { View, Text } from 'react-native';

export default function LeaderboardRow({ entry, isSelf }) {
  return (
    // Compact horizontal row: rank | name | score
    // isSelf rows use the same layout; designer applies a highlight
    <View className="rounded-xl p-3 flex-row items-center gap-3">

      {/* Rank badge — 32×32 centred */}
      <View className="items-center justify-center w-8 h-8">
        <Text>#{entry.rank}</Text>
      </View>

      {/* Display name + "Tu" label for self */}
      <View className="flex-1 flex-col">
        <Text>{entry.displayName}</Text>
        {isSelf && <Text>Tu</Text>}
      </View>

      {/* Weekly score, right-aligned */}
      <View className="items-end">
        <Text>{entry.weeklyScore} pt</Text>
      </View>
    </View>
  );
}
