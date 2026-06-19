/**
 * EmailVerificationScreen — RF6.5
 * Shown after registration when Supabase email confirmation is enabled.
 * Prompts the user to check their inbox and allows resending the link.
 */
import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { resendVerification } from '../api/auth';

export default function EmailVerificationScreen({ navigation, route }) {
  const email = route.params?.email || '';
  const [sending, setSending] = useState(false);

  async function handleResend() {
    if (!email) return;
    setSending(true);
    try {
      await resendVerification({ email });
      Alert.alert('Email inviata', 'Controlla di nuovo la tua casella di posta.');
    } catch {
      Alert.alert('Errore', 'Impossibile inviare. Riprova più tardi.');
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView className="screen flex-1">
      <View className="flex-1 justify-center items-center px-6">

        <Text style={{ fontSize: 56 }}>📧</Text>

        <Text className="heading text-center mt-4 mb-2">Verifica la tua email</Text>
        <Text className="text-muted text-center mb-8">
          Abbiamo inviato un link di conferma a{'\n'}
          <Text className="text-label">{email}</Text>.{'\n'}
          Clicca il link nell'email per attivare il tuo account.
        </Text>

        <View className="w-full gap-3">
          <TouchableOpacity
            className="btn-primary w-full rounded-xl py-4 items-center"
            onPress={handleResend}
            disabled={sending}
          >
            <Text className="btn-primary-text">
              {sending ? 'Invio…' : 'Reinvia email di verifica'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center py-3"
            onPress={() => navigation.navigate('Login')}
          >
            <Text className="link">Torna al login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
