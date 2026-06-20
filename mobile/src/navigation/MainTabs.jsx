import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Map, Compass, BarChart2, Trophy, User } from 'lucide-react-native';

import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import RouteScreen from '../screens/RouteScreen';
import HistoryScreen from '../screens/HistoryScreen';
import GamificationScreen from '../screens/GamificationScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const ACCENT      = '#8ab834';
const TAB_HEIGHT  = 68;

const TAB_CONFIG = {
  Home:       { Icon: Home,      label: 'Home'       },
  Mappa:      { Icon: Map,       label: 'Mappa'      },
  Percorso:   { Icon: Compass,   label: 'Percorso'   },
  Storico:    { Icon: BarChart2, label: 'Storico'    },
  Classifica: { Icon: Trophy,    label: 'Classifica' },
  Profilo:    { Icon: User,      label: 'Profilo'    },
};

function CustomTabBar({ state, navigation }) {
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = scheme === 'dark';

  const bg       = isDark ? '#09090b' : '#ffffff';
  const border   = isDark ? '#27272a' : '#e4e4e7';
  const inactive = isDark ? '#52525b' : '#a1a1aa';
  const active   = ACCENT;
  const focusBg  = 'rgba(138,184,52,0.10)';

  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: bg,
      borderTopWidth: 1,
      borderTopColor: border,
      height: TAB_HEIGHT + insets.bottom,
      paddingBottom: insets.bottom,
    }}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { Icon, label } = TAB_CONFIG[route.name] ?? { Icon: Home, label: route.name };
        const color = focused ? active : inactive;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate({ name: route.name, merge: true });
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: focused ? focusBg : 'transparent',
            }}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={label}
          >
            <Icon size={22} color={color} />
            <Text style={{
              fontSize: 10,
              fontWeight: focused ? '700' : '400',
              color,
              marginTop: 4,
              lineHeight: 13,
            }}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
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
