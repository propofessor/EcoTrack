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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { login as apiLogin, getMe } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();

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

  return (
    <SafeAreaView className="flex-1">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          {/* Full-screen centred form */}
          <View className="flex-1 justify-center px-6">

            {/* Brand */}
            <View className="items-center mb-10">
              <Text>🌿</Text>
              <Text>EcoTrack</Text>
              <Text>Monitora la tua impronta ecologica</Text>
            </View>

            {/* Form surface */}
            <View className="rounded-3xl p-6 gap-4">

              <View className="flex-col gap-1">
                <Text>Email</Text>
                <TextInput
                  className="w-full rounded-xl px-4 py-3"
                  placeholder="nome@esempio.it"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View className="flex-col gap-1">
                <Text>Password</Text>
                <TextInput
                  className="w-full rounded-xl px-4 py-3"
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <View className="mt-2 gap-3">
                <TouchableOpacity
                  className="w-full rounded-xl py-4 items-center"
                  onPress={handleLogin}
                  disabled={loading}
                >
                  <Text>{loading ? 'Accesso in corso…' : 'Accedi'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Divider */}
            <View className="flex-row items-center gap-3 my-2">
              <View className="flex-1 h-px" />
              <Text>oppure</Text>
              <View className="flex-1 h-px" />
            </View>

            {/* Social buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity className="flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3">
                <Text>🇬</Text>
                <Text>Continua con Google</Text>
              </TouchableOpacity>
            </View>

            {/* Register link */}
            <View className="flex-row justify-center gap-1 mt-4">
              <Text>Non hai un account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text>Registrati</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
