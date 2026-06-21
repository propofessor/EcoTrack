import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { resendVerification } from '../api/auth';
import { Mail } from 'lucide-react-native';

export default function EmailVerificationScreen({ navigation, route }) {
  const { t } = useTranslation();
  const email = route.params?.email || '';
  const [sending, setSending] = useState(false);
  const scheme = useColorScheme();
  const iconColor = scheme === 'dark' ? '#f4f4f5' : '#09090b';

  async function handleResend() {
    if (!email) return;
    setSending(true);
    try {
      await resendVerification({ email });
      Alert.alert(t('emailVerification.resentTitle'), t('emailVerification.resentMessage'));
    } catch {
      Alert.alert(t('common.error'), t('emailVerification.resendFailed'));
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView className="screen flex-1">
      <View className="flex-1 justify-center items-center px-6">

        <Mail size={56} color={iconColor} />

        <Text className="heading text-center mt-4 mb-2">{t('emailVerification.title')}</Text>
        <Text className="text-muted text-center mb-8">
          {t('emailVerification.message')}{'\n'}
          <Text className="text-label">{email}</Text>.{'\n'}
          {t('emailVerification.instruction')}
        </Text>

        <View className="w-full gap-3">
          <TouchableOpacity
            className="btn-primary w-full rounded-xl py-4 items-center"
            onPress={handleResend}
            disabled={sending}
          >
            <Text className="btn-primary-text">
              {sending ? t('emailVerification.sending') : t('emailVerification.resend')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center py-3"
            onPress={() => navigation.navigate('Login')}
          >
            <Text className="link">{t('emailVerification.backToLogin')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
