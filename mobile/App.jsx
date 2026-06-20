import './global.css';
import './src/i18n'; // RNF: i18n initialization (must run before first render)

import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { loadStoredPreferences } from './src/utils/preferences';

export default function App() {
  // Restore the user's saved theme & language before they touch any screen.
  useEffect(() => {
    loadStoredPreferences();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
        <StatusBar style="auto" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
