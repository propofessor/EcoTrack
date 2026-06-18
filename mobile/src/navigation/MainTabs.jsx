import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import RouteScreen from '../screens/RouteScreen';
import HistoryScreen from '../screens/HistoryScreen';
import GamificationScreen from '../screens/GamificationScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

// Icons use plain text emoji as placeholders — a designer replaces these with
// a proper icon library (e.g. @expo/vector-icons).
const TAB_ICONS = {
  Home: '🏠',
  Mappa: '🗺️',
  Percorso: '🧭',
  Storico: '📊',
  Classifica: '🏆',
  Profilo: '👤',
};

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: () => (
          <Text style={{ fontSize: 20 }}>{TAB_ICONS[route.name]}</Text>
        ),
        tabBarShowLabel: true,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Mappa" component={MapScreen} />
      <Tab.Screen name="Percorso" component={RouteScreen} />
      <Tab.Screen name="Storico" component={HistoryScreen} />
      <Tab.Screen name="Classifica" component={GamificationScreen} />
      <Tab.Screen name="Profilo" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
