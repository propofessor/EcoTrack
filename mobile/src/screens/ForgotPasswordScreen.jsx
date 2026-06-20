/**
 * ForgotPasswordScreen — RF5.5
 * Allows the user to request a password-reset email.
 * After submission the screen shows a confirmation and lets the user
 * enter the OTP token they receive by email to set a new password.
 */
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { forgotPassword, resetPassword } from '../api/auth';

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

export default function ForgotPasswordScreen({ navigation }) {
  const { t } = useTranslation();
  const [step, setStep] = useState('email'); // 'email' | 'reset'
  const [email, setEmail] = useState('');
  const [tokenHash, setTokenHash] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRequestReset() {
    if (!email.trim()) {
      Alert.alert(t('common.error'), t('forgotPassword.errorEmail'));
      return;
    }
    setLoading(true);
    try {
      await forgotPassword({ email: email.trim() });
      setStep('reset');
    } catch {
      Alert.alert(t('common.error'), t('forgotPassword.sendFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!tokenHash.trim()) {
      Alert.alert(t('common.error'), t('forgotPassword.errorToken'));
      return;
    }
    if (!PASSWORD_REGEX.test(newPassword)) {
      Alert.alert(
        t('forgotPassword.passwordInvalidTitle'),
        t('forgotPassword.passwordInvalidMessage')
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('profile.passwordMismatch'));
      return;
    }
    setLoading(true);
    try {
      await resetPassword({ token_hash: tokenHash.trim(), newPassword });
      Alert.alert(t('forgotPassword.successTitle'), t('forgotPassword.successMessage'), [
        { text: t('common.ok'), onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err) {
      const msg = err.response?.data?.error || t('forgotPassword.tokenInvalid');
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

            {/* Back button */}
            <TouchableOpacity className="mb-6" onPress={() => navigation.goBack()}>
              <Text className="link">{t('forgotPassword.backToLogin')}</Text>
            </TouchableOpacity>

            <Text className="heading mb-1">{t('forgotPassword.title')}</Text>

            {step === 'email' ? (
              <>
                <Text className="text-muted mb-6">
                  {t('forgotPassword.step1Description')}
                </Text>

                <View className="card rounded-3xl p-6 gap-4">
                  <View className="flex-col gap-1">
                    <Text className="text-label">{t('forgotPassword.emailLabel')}</Text>
                    <TextInput
                      className="input w-full rounded-xl px-4 py-3"
                      placeholder={t('forgotPassword.emailPlaceholder')}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <TouchableOpacity
                    className="btn-primary w-full rounded-xl py-4 items-center mt-2"
                    onPress={handleRequestReset}
                    disabled={loading}
                  >
                    <Text className="btn-primary-text">
                      {loading ? t('forgotPassword.submitting') : t('forgotPassword.submit')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text className="text-muted mb-6">
                  {t('forgotPassword.step2Description')}
                </Text>

                <View className="card rounded-3xl p-6 gap-4">
                  <View className="flex-col gap-1">
                    <Text className="text-label">{t('forgotPassword.tokenLabel')}</Text>
                    <TextInput
                      className="input w-full rounded-xl px-4 py-3"
                      placeholder={t('forgotPassword.tokenPlaceholder')}
                      value={tokenHash}
                      onChangeText={setTokenHash}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <View className="flex-col gap-1">
                    <Text className="text-label">{t('forgotPassword.newPasswordLabel')}</Text>
                    <TextInput
                      className="input w-full rounded-xl px-4 py-3"
                      placeholder={t('common.passwordPlaceholder')}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry
                    />
                  </View>

                  <View className="flex-col gap-1">
                    <Text className="text-label">{t('forgotPassword.confirmPasswordLabel')}</Text>
                    <TextInput
                      className="input w-full rounded-xl px-4 py-3"
                      placeholder={t('common.passwordPlaceholder')}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                    />
                  </View>

                  <TouchableOpacity
                    className="btn-primary w-full rounded-xl py-4 items-center mt-2"
                    onPress={handleResetPassword}
                    disabled={loading}
                  >
                    <Text className="btn-primary-text">
                      {loading ? t('forgotPassword.resetting') : t('forgotPassword.resetSubmit')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="items-center py-2"
                    onPress={() => setStep('email')}
                  >
                    <Text className="link">{t('forgotPassword.resendCode')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
