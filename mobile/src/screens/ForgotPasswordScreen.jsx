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
import { forgotPassword, resetPassword } from '../api/auth';

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState('email'); // 'email' | 'reset'
  const [email, setEmail] = useState('');
  const [tokenHash, setTokenHash] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRequestReset() {
    if (!email.trim()) {
      Alert.alert('Errore', 'Inserisci la tua email.');
      return;
    }
    setLoading(true);
    try {
      await forgotPassword({ email: email.trim() });
      setStep('reset');
    } catch {
      Alert.alert('Errore', 'Impossibile inviare il link. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!tokenHash.trim()) {
      Alert.alert('Errore', 'Inserisci il codice ricevuto via email.');
      return;
    }
    if (!PASSWORD_REGEX.test(newPassword)) {
      Alert.alert(
        'Password non valida',
        'Deve contenere almeno 8 caratteri, una maiuscola, una minuscola, un numero e un carattere speciale.'
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Errore', 'Le password non coincidono.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword({ token_hash: tokenHash.trim(), newPassword });
      Alert.alert('Successo', 'Password aggiornata. Puoi ora accedere.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err) {
      const msg = err.response?.data?.error || 'Token non valido o scaduto.';
      Alert.alert('Errore', msg);
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
              <Text className="link">← Torna al login</Text>
            </TouchableOpacity>

            <Text className="heading mb-1">Recupera password</Text>

            {step === 'email' ? (
              <>
                <Text className="text-muted mb-6">
                  Inserisci la tua email. Ti invieremo un codice per reimpostare la password.
                </Text>

                <View className="card rounded-3xl p-6 gap-4">
                  <View className="flex-col gap-1">
                    <Text className="text-label">Email</Text>
                    <TextInput
                      className="input w-full rounded-xl px-4 py-3"
                      placeholder="nome@esempio.it"
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
                      {loading ? 'Invio in corso…' : 'Invia link di recupero'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text className="text-muted mb-6">
                  Controlla la tua email e inserisci il codice ricevuto insieme alla nuova password.
                </Text>

                <View className="card rounded-3xl p-6 gap-4">
                  <View className="flex-col gap-1">
                    <Text className="text-label">Codice di recupero</Text>
                    <TextInput
                      className="input w-full rounded-xl px-4 py-3"
                      placeholder="Incolla qui il codice dall'email"
                      value={tokenHash}
                      onChangeText={setTokenHash}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <View className="flex-col gap-1">
                    <Text className="text-label">Nuova password</Text>
                    <TextInput
                      className="input w-full rounded-xl px-4 py-3"
                      placeholder="••••••••"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry
                    />
                  </View>

                  <View className="flex-col gap-1">
                    <Text className="text-label">Conferma password</Text>
                    <TextInput
                      className="input w-full rounded-xl px-4 py-3"
                      placeholder="••••••••"
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
                      {loading ? 'Aggiornamento…' : 'Reimposta password'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="items-center py-2"
                    onPress={() => setStep('email')}
                  >
                    <Text className="link">Non hai ricevuto il codice? Riprova</Text>
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
