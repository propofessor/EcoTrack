/**
 * LeaderboardRow — a single ranked entry in the leaderboard list.
 *
 * Props:
 *   entry  — { rank, displayName, weeklyScore }
 *   isSelf — highlight this row as the current user
 */
import { View, Text } from 'react-native';

export default function LeaderboardRow({ entry, isSelf }) {
  return (
    <View className={`rounded-xl p-3 flex-row items-center gap-3 leaderboard-row${isSelf ? ' leaderboard-row--self' : ''}`}>

      {/* Rank badge */}
      <View className="items-center justify-center w-8 h-8">
        <Text className="rank-badge-text">#{entry.rank}</Text>
      </View>

      {/* Display name + "Tu" label for self */}
      <View className="flex-1 flex-col">
        <Text className="leaderboard-name">{entry.displayName}</Text>
        {isSelf && <Text className="leaderboard-self-label">Tu</Text>}
      </View>

      {/* Weekly score, right-aligned */}
      <View className="items-end">
        <Text className="leaderboard-score">{entry.weeklyScore} pt</Text>
      </View>
    </View>
  );
}
