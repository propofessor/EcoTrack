import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function LeaderboardRow({ entry, isSelf }) {
  const { t } = useTranslation();
  return (
    <View className={`rounded-xl p-3 flex-row items-center gap-3 leaderboard-row${isSelf ? ' leaderboard-row--self' : ''}`}>

      {}
      <View className="items-center justify-center w-8 h-8">
        <Text className="rank-badge-text">#{entry.rank}</Text>
      </View>

      {}
      <View className="flex-1 flex-col">
        <Text className="leaderboard-name">{entry.displayName}</Text>
        {isSelf && <Text className="leaderboard-self-label">{t('gamification.you')}</Text>}
      </View>

      {}
      <View className="items-end">
        <Text className="leaderboard-score">{entry.weeklyScore} pt</Text>
      </View>
    </View>
  );
}
