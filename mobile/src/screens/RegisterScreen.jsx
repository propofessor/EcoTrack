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
import { useTranslation } from 'react-i18next';
import { register as apiRegister, getMe } from '../api/auth';
import { useAuth } from '../context/AuthContext';


const PLATE_REGEX = /^[A-Z]{2}\d{3}[A-Z]{2}$/i;


const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

export default function RegisterScreen({ navigation }) {
  const { login } = useAuth();
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const inputColor = scheme === 'dark' ? '#f4f4f5' : '#09090b';
  const placeholderColor = scheme === 'dark' ? '#71717a' : '#a1a1aa';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [plate, setPlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (!name.trim()) e.name = t('register.errors.name');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = t('register.errors.email');
    if (!PASSWORD_REGEX.test(password)) {
      e.password = t('register.errors.password');
    }
    if (plate && !PLATE_REGEX.test(plate)) e.plate = t('register.errors.plate');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await apiRegister({
        name: name.trim(),
        email: email.trim(),
        password,
        plate: plate.trim().toUpperCase() || undefined,
      });

      // RF6.5: if email confirmation is enabled on Supabase, there is no session yet
      if (result?.email_verification_required) {
        navigation.navigate('EmailVerification', { email: email.trim() });
        return;
      }

      const userData = await getMe();
      login(userData);
    } catch (err) {
      const msg = err.response?.data?.error || t('register.failed');
      Alert.alert(t('common.error'), msg);
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
              <Text className="heading text-center">{t('register.title')}</Text>
            </View>

            {/* Form */}
            <View className="card rounded-3xl p-6 gap-4">

              <View className="flex-col gap-1">
                <Text className="text-label">{t('register.nameLabel')}</Text>
                <TextInput
                  className="input w-full rounded-xl px-4 py-3"
                  style={{ color: inputColor }}
                  placeholderTextColor={placeholderColor}
                  placeholder={t('register.namePlaceholder')}
                  value={name}
                  onChangeText={setName}
                />
                {errors.name && <Text className="text-error mt-1 pl-1">{errors.name}</Text>}
              </View>

              <View className="flex-col gap-1">
                <Text className="text-label">{t('register.emailLabel')}</Text>
                <TextInput
                  className="input w-full rounded-xl px-4 py-3"
                  style={{ color: inputColor }}
                  placeholderTextColor={placeholderColor}
                  placeholder={t('register.emailPlaceholder')}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {errors.email && <Text className="text-error mt-1 pl-1">{errors.email}</Text>}
              </View>

              <View className="flex-col gap-1">
                <Text className="text-label">{t('register.passwordLabel')}</Text>
                <TextInput
                  className="input w-full rounded-xl px-4 py-3"
                  style={{ color: inputColor }}
                  placeholderTextColor={placeholderColor}
                  placeholder={t('register.passwordPlaceholder')}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                {errors.password && <Text className="text-error mt-1 pl-1">{errors.password}</Text>}
              </View>

              <View className="flex-col gap-1">
                <Text className="text-label">{t('register.plateLabel')}</Text>
                <TextInput
                  className="input w-full rounded-xl px-4 py-3"
                  style={{ color: inputColor }}
                  placeholderTextColor={placeholderColor}
                  placeholder={t('register.platePlaceholder')}
                  value={plate}
                  onChangeText={setPlate}
                  autoCapitalize="characters"
                  maxLength={7}
                />
                {errors.plate && <Text className="text-error mt-1 pl-1">{errors.plate}</Text>}
              </View>

              <View className="mt-2 gap-3">
                <TouchableOpacity
                  className="btn-primary w-full rounded-xl py-4 items-center"
                  onPress={handleRegister}
                  disabled={loading}
                >
                  <Text className="btn-primary-text">
                    {loading ? t('register.submitting') : t('register.submit')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Login link */}
            <View className="flex-row justify-center gap-1 mt-4">
              <Text className="text-muted">{t('register.hasAccount')}</Text>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text className="link">{t('register.signIn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
