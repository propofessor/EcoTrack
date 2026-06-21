import { View, Text, useColorScheme } from 'react-native';
import { Leaf } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

export default function TransportCard({ icon, label, distanceKm, co2Kg, isBest, durationMin }) {
  const scheme = useColorScheme();
  const { t } = useTranslation();
  const ecoColor = '#8ab834';

  return (
    <View className={`rounded-2xl p-4 flex-row items-center gap-4 transport-card${isBest ? ' transport-card--best' : ''}`}>

      {}
      <View className="items-center justify-center w-12 h-12">
        {icon}
      </View>

      {}
      <View className="flex-1 flex-col">
        <Text className="transport-mode-label">{label}</Text>
        {isBest && (
          <View className="flex-row items-center gap-1">
            <Leaf size={14} color={ecoColor} />
            <Text className="eco-badge">{t('route.ecoBadge')}</Text>
          </View>
        )}
        {durationMin != null && (
          <Text className="text-muted">{durationMin} min</Text>
        )}
      </View>

      {}
      <View className="items-end gap-1">
        <Text className="transport-stat">{distanceKm.toFixed(1)} km</Text>
        <Text className="transport-co2">
          {co2Kg === 0 ? '0 g CO₂' : `${(co2Kg * 1000).toFixed(0)} g CO₂`}
        </Text>
      </View>
    </View>
  );
}
