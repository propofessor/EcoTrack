import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { login as apiLogin, getMe, getGoogleMobileUrl, getGoogleWebUrl, getCieAuthUrl, cieCallback } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { BASE_URL } from '../api/client';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CALLBACK_URL = 'ecotrack://auth/google';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const scheme = useColorScheme();
  const inputColor = scheme === 'dark' ? '#f4f4f5' : '#09090b';
  const placeholderColor = scheme === 'dark' ? '#71717a' : '#a1a1aa';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);


  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Errore', 'Inserisci email e password.');
      return;
    }
    setLoading(true);
    try {
      await apiLogin({ email: email.trim(), password });
      const userData = await getMe();
      login(userData);
    } catch (err) {
      const msg = err.response?.data?.error || 'Credenziali non valide.';
      Alert.alert('Accesso fallito', msg);
    } finally {
      setLoading(false);
    }
  }

  // RF5.2: Google login
  async function handleGoogleLogin() {
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        // Full-page redirect — backend sets cookies, redirects back to this app
        const { url } = await getGoogleWebUrl();
        window.location.href = url;
        return; // page navigates away; AuthContext re-checks session on return
      }
      const { url } = await getGoogleMobileUrl();
      const result = await WebBrowser.openAuthSessionAsync(url, GOOGLE_CALLBACK_URL);
      if (result.type === 'success') {
        const parsed = new URL(result.url);
        const access_token = parsed.searchParams.get('access_token');
        const refresh_token = parsed.searchParams.get('refresh_token');
        const error = parsed.searchParams.get('error');
        if (error || !access_token) { Alert.alert('Errore', 'Autenticazione Google fallita.'); return; }
        await AsyncStorage.setItem('access_token', access_token);
        if (refresh_token) await AsyncStorage.setItem('refresh_token', refresh_token);
        const userData = await getMe();
        login(userData);
      }
    } catch (err) {
      Alert.alert('Errore Google', err.response?.data?.error || 'Login Google fallito.');
    } finally {
      setLoading(false);
    }
  }

  // RF5.2: CIE authentication via expo-web-browser
  async function handleCieLogin() {
    setLoading(true);
    try {
      const { url, state } = await getCieAuthUrl();

      // Open CIE auth page in an in-app browser and capture the redirect
      const redirectUrl = `${BASE_URL}/auth/cie/mobile-callback`;
      const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl);

      if (result.type === 'success') {
        const redirected = new URL(result.url);
        const code = redirected.searchParams.get('code');
        const returnedState = redirected.searchParams.get('state');

        if (code && returnedState === state) {
          await cieCallback({ code, state: returnedState });
          const userData = await getMe();
          login(userData);
        } else {
          Alert.alert('Errore CIE', 'Autenticazione CIE non riuscita.');
        }
      }
    } catch (err) {
      Alert.alert('Errore CIE', err.response?.data?.error || 'Login CIE fallito.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="screen flex-1">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 justify-center px-6">

            {/* Brand */}
            <View className="items-center mb-10">
              <Image source={require('../../assets/icon.png')} accessibilityLabel='EcoTrack Logo' className='w-24 h-24 mb-4' />
              <Text className="heading text-center">EcoTrack</Text>
              <Text className="text-muted text-center">Monitora la tua impronta ecologica</Text>
            </View>

            {/* Form surface */}
            <View className="card rounded-3xl p-6 gap-4">

              <View className="flex-col gap-1">
                <Text className="text-label">Email</Text>
                <TextInput
                  className="input w-full rounded-xl px-4 py-3"
                  style={{ color: inputColor }}
                  placeholderTextColor={placeholderColor}
                  placeholder="nome@esempio.it"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View className="flex-col gap-1">
                <Text className="text-label">Password</Text>
                <TextInput
                  className="input w-full rounded-xl px-4 py-3"
                  style={{ color: inputColor }}
                  placeholderTextColor={placeholderColor}
                  placeholder="Inserisci la tua password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <View className="mt-2 gap-3">
                <TouchableOpacity
                  className="btn-primary w-full rounded-xl py-4 items-center"
                  onPress={handleLogin}
                  disabled={loading}
                >
                  <Text className="btn-primary-text">
                    {loading ? 'Accesso in corso…' : 'Accedi'}
                  </Text>
                </TouchableOpacity>

                {/* RF5.5: Password recovery link */}
                <TouchableOpacity
                  className="items-center py-1"
                  onPress={() => navigation.navigate('ForgotPassword')}
                >
                  <Text className="link">Password dimenticata?</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Divider */}
            <View className="flex-row items-center gap-3 my-2">
              <View className="divider flex-1 h-px" />
              <Text className="text-muted">oppure</Text>
              <View className="divider flex-1 h-px" />
            </View>

            {/* RF5.2: Social login buttons */}
            <View className="gap-3">
              <TouchableOpacity
                className="btn-ghost flex-row items-center justify-center gap-2 rounded-xl py-3"
                onPress={handleGoogleLogin}
                disabled={loading}
              >
                <Image source={require('../../assets/google-icon.png')} accessibilityLabel='Google Logo' className='w-6 h-6' />
                <Text className="btn-ghost-text">Continua con Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="btn-ghost flex-row items-center justify-center gap-2 rounded-xl py-3"
                onPress={handleCieLogin}
                disabled={loading}
              >
                <Image source={require('../../assets/cie-icon.png')} accessibilityLabel='CIE Logo' className='w-6 h-6' />
                <Text className="btn-ghost-text">Accedi con CIE</Text>
              </TouchableOpacity>
            </View>

            {/* Register link */}
            <View className="flex-row justify-center gap-1 mt-4">
              <Text className="text-muted">Non hai un account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text className="link">Registrati</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
