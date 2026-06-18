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
import { register as apiRegister, getMe } from '../api/auth';
import { useAuth } from '../context/AuthContext';

// Italian plate format: 2 letters + 3 digits + 2 letters (e.g. AB123CD)
const PLATE_REGEX = /^[A-Z]{2}\d{3}[A-Z]{2}$/i;

export default function RegisterScreen({ navigation }) {
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [plate, setPlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (!name.trim()) e.name = 'Il nome è obbligatorio.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Email non valida.';
    if (password.length < 8) e.password = 'La password deve avere almeno 8 caratteri.';
    if (!/[A-Z]/.test(password)) e.password = 'Usa almeno una lettera maiuscola.';
    if (!/\d/.test(password)) e.password = 'Usa almeno un numero.';
    if (plate && !PLATE_REGEX.test(plate)) e.plate = 'Formato targa non valido (es. AB123CD).';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    setLoading(true);
    try {
      await apiRegister({
        name: name.trim(),
        email: email.trim(),
        password,
        plate: plate.trim().toUpperCase() || undefined,
      });
      const userData = await getMe();
      login(userData);
    } catch (err) {
      const msg = err.response?.data?.error || 'Registrazione fallita.';
      Alert.alert('Errore', msg);
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
          <View className="flex-1 justify-center px-6">

            {/* Brand */}
            <View className="items-center mb-10">
              <Text>🌿</Text>
              <Text>Crea il tuo account</Text>
            </View>

            {/* Form */}
            <View className="rounded-3xl p-6 gap-4">

              <View className="flex-col gap-1">
                <Text>Nome e cognome</Text>
                <TextInput
                  className="w-full rounded-xl px-4 py-3"
                  placeholder="Mario Rossi"
                  value={name}
                  onChangeText={setName}
                />
                {errors.name && <Text className="mt-1 pl-1">{errors.name}</Text>}
              </View>

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
                {errors.email && <Text className="mt-1 pl-1">{errors.email}</Text>}
              </View>

              <View className="flex-col gap-1">
                <Text>Password</Text>
                <TextInput
                  className="w-full rounded-xl px-4 py-3"
                  placeholder="Almeno 8 caratteri, 1 maiuscola, 1 numero"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                {errors.password && <Text className="mt-1 pl-1">{errors.password}</Text>}
              </View>

              <View className="flex-col gap-1">
                <Text>Targa veicolo (opzionale)</Text>
                <TextInput
                  className="w-full rounded-xl px-4 py-3"
                  placeholder="AB123CD"
                  value={plate}
                  onChangeText={setPlate}
                  autoCapitalize="characters"
                  maxLength={7}
                />
                {errors.plate && <Text className="mt-1 pl-1">{errors.plate}</Text>}
              </View>

              <View className="mt-2 gap-3">
                <TouchableOpacity
                  className="w-full rounded-xl py-4 items-center"
                  onPress={handleRegister}
                  disabled={loading}
                >
                  <Text>{loading ? 'Registrazione…' : 'Registrati'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Login link */}
            <View className="flex-row justify-center gap-1 mt-4">
              <Text>Hai già un account?</Text>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text>Accedi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
