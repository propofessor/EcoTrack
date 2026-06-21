import { useState } from 'react';
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
import { useTranslation } from 'react-i18next';
import { login as apiLogin, getMe, getGoogleMobileUrl, getGoogleWebUrl, getCieAuthUrl, cieCallback } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { BASE_URL } from '../api/client';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CALLBACK_URL = 'ecotrack://auth/google';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const inputColor = scheme === 'dark' ? '#f4f4f5' : '#09090b';
  const placeholderColor = scheme === 'dark' ? '#71717a' : '#a1a1aa';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);


  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert(t('common.error'), t('login.fillFields'));
      return;
    }
    setLoading(true);
    try {
      await apiLogin({ email: email.trim(), password });
      const userData = await getMe();
      login(userData);
    } catch (err) {
      const msg = err.response?.data?.error || t('login.invalidCredentials');
      Alert.alert(t('login.failed'), msg);
    } finally {
      setLoading(false);
    }
  }


  async function handleGoogleLogin() {
    setLoading(true);
    try {
      if (Platform.OS === 'web') {

        const { url } = await getGoogleWebUrl();
        window.location.href = url;
        return;
      }
      const { url } = await getGoogleMobileUrl();
      const result = await WebBrowser.openAuthSessionAsync(url, GOOGLE_CALLBACK_URL);
      if (result.type === 'success') {
        const parsed = new URL(result.url);
        const access_token = parsed.searchParams.get('access_token');
        const refresh_token = parsed.searchParams.get('refresh_token');
        const error = parsed.searchParams.get('error');
        if (error || !access_token) { Alert.alert(t('common.error'), t('login.googleAuthFailed')); return; }
        await AsyncStorage.setItem('access_token', access_token);
        if (refresh_token) await AsyncStorage.setItem('refresh_token', refresh_token);
        const userData = await getMe();
        login(userData);
      }
    } catch (err) {
      Alert.alert(t('login.googleErrorTitle'), err.response?.data?.error || t('login.googleFailed'));
    } finally {
      setLoading(false);
    }
  }


  async function handleCieLogin() {
    setLoading(true);
    try {
      const { url, state } = await getCieAuthUrl();


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
          Alert.alert(t('login.cieErrorTitle'), t('login.cieAuthFailed'));
        }
      }
    } catch (err) {
      Alert.alert(t('login.cieErrorTitle'), err.response?.data?.error || t('login.cieFailed'));
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

            {}
            <View className="items-center mb-10">
              <Image source={require('../../assets/icon.png')} accessibilityLabel='EcoTrack Logo' className='w-24 h-24 mb-4' />
              <Text className="heading text-center">{t('login.title')}</Text>
              <Text className="text-muted text-center">{t('login.subtitle')}</Text>
            </View>

            {}
            <View className="card rounded-3xl p-6 gap-4">

              <View className="flex-col gap-1">
                <Text className="text-label">{t('login.emailLabel')}</Text>
                <TextInput
                  className="input w-full rounded-xl px-4 py-3"
                  style={{ color: inputColor }}
                  placeholderTextColor={placeholderColor}
                  placeholder={t('login.emailPlaceholder')}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View className="flex-col gap-1">
                <Text className="text-label">{t('login.passwordLabel')}</Text>
                <TextInput
                  className="input w-full rounded-xl px-4 py-3"
                  style={{ color: inputColor }}
                  placeholderTextColor={placeholderColor}
                  placeholder={t('login.passwordPlaceholder')}
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
                    {loading ? t('login.submitting') : t('login.submit')}
                  </Text>
                </TouchableOpacity>

                {}
                <TouchableOpacity
                  className="items-center py-1"
                  onPress={() => navigation.navigate('ForgotPassword')}
                >
                  <Text className="link">{t('login.forgotPassword')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {}
            <View className="flex-row items-center gap-3 my-2">
              <View className="divider flex-1 h-px" />
              <Text className="text-muted">{t('common.or')}</Text>
              <View className="divider flex-1 h-px" />
            </View>

            {}
            <View className="gap-3">
              <TouchableOpacity
                className="btn-ghost flex-row items-center justify-center gap-2 rounded-xl py-3"
                onPress={handleGoogleLogin}
                disabled={loading}
              >
                <Image source={require('../../assets/google-icon.png')} accessibilityLabel='Google Logo' className='w-6 h-6' />
                <Text className="btn-ghost-text">{t('login.continueWithGoogle')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="btn-ghost flex-row items-center justify-center gap-2 rounded-xl py-3"
                onPress={handleCieLogin}
                disabled={loading}
              >
                <Image source={require('../../assets/cie-icon.png')} accessibilityLabel='CIE Logo' className='w-6 h-6' />
                <Text className="btn-ghost-text">{t('login.continueWithCie')}</Text>
              </TouchableOpacity>
            </View>

            {}
            <View className="flex-row justify-center gap-1 mt-4">
              <Text className="text-muted">{t('login.noAccount')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text className="link">{t('login.register')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
