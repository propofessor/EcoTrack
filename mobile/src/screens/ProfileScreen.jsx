/**
 * ProfileScreen — RF7
 * View / edit personal data, manage vehicle plate, access preferences, delete account.
 *
 * RF7.1: display personal data.
 * RF7.2: edit name.
 * RF7.4: plate CRUD.
 * RF7.6: delete account (GDPR).
 */
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { getProfile, updateProfile, deleteAccount } from '../api/users';

const PLATE_REGEX = /^[A-Z]{2}\d{3}[A-Z]{2}$/i;

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [plate, setPlate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProfile()
      .then((data) => {
        setProfile(data);
        setName(data.profile?.name || '');
        setPlate(data.profile?.plate || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (plate && !PLATE_REGEX.test(plate)) {
      Alert.alert('Errore', 'Formato targa non valido (es. AB123CD).');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        name: name.trim() || undefined,
        plate: plate.trim().toUpperCase() || null,
      });
      setProfile((p) => ({
        ...p,
        profile: { ...p.profile, name: name.trim(), plate: plate.trim().toUpperCase() },
      }));
      setEditing(false);
      Alert.alert('Salvato', 'Profilo aggiornato con successo.');
    } catch {
      Alert.alert('Errore', 'Impossibile salvare le modifiche.');
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Elimina account',
      'Questa operazione è irreversibile. Tutti i tuoi dati verranno cancellati definitivamente (GDPR).',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina definitivamente',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              await logout();
            } catch {
              Alert.alert('Errore', "Impossibile eliminare l'account. Riprova.");
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const email = profile?.user?.email || user?.email || '—';

  return (
    <SafeAreaView className="flex-1">
      <ScrollView className="flex-1">
        <View className="px-4 pt-4 pb-8">

          {/* Profile header — RF7.1 */}
          <View className="items-center py-6 mb-4">
            <View className="rounded-full items-center justify-center mb-3 w-20 h-20">
              <Text>{(name || email).charAt(0).toUpperCase()}</Text>
            </View>
            <Text>{name || '—'}</Text>
            <Text>{email}</Text>
          </View>

          {/* Personal data section — RF7.1 / RF7.2 */}
          <View className="rounded-2xl p-4 mb-4">
            <View className="flex-row items-center justify-between py-3">
              <Text>Dati personali</Text>
              <TouchableOpacity onPress={() => setEditing((e) => !e)}>
                <Text>{editing ? 'Annulla' : 'Modifica'}</Text>
              </TouchableOpacity>
            </View>

            <View className="h-px" />

            {editing ? (
              <View className="flex-col gap-2 p-0">
                <View className="flex-col gap-1">
                  <Text>Nome e cognome</Text>
                  <TextInput
                    className="w-full rounded-xl px-4 py-3"
                    value={name}
                    onChangeText={setName}
                    placeholder="Mario Rossi"
                  />
                </View>
                <View className="flex-col gap-1">
                  <Text>Targa veicolo</Text>
                  <TextInput
                    className="w-full rounded-xl px-4 py-3"
                    value={plate}
                    onChangeText={setPlate}
                    placeholder="AB123CD"
                    autoCapitalize="characters"
                    maxLength={7}
                  />
                </View>
                <TouchableOpacity
                  className="w-full rounded-xl py-4 items-center"
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text>{saving ? 'Salvataggio…' : 'Salva modifiche'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-col gap-2">
                <View className="flex-row items-center justify-between py-3">
                  <View className="flex-row items-center gap-3">
                    <Text>👤</Text>
                    <Text>Nome</Text>
                  </View>
                  <Text>{name || '—'}</Text>
                </View>
                <View className="h-px" />
                <View className="flex-row items-center justify-between py-3">
                  <View className="flex-row items-center gap-3">
                    <Text>✉️</Text>
                    <Text>Email</Text>
                  </View>
                  <Text>{email}</Text>
                </View>
                <View className="h-px" />
                <View className="flex-row items-center justify-between py-3">
                  <View className="flex-row items-center gap-3">
                    <Text>🚗</Text>
                    <Text>Targa</Text>
                  </View>
                  <Text>{plate || 'Non inserita'}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Session section */}
          <View className="rounded-2xl p-4 mb-4">
            <TouchableOpacity
              className="flex-row items-center justify-between py-3"
              onPress={() =>
                Alert.alert("Logout", "Vuoi uscire dall'applicazione?", [
                  { text: 'Annulla', style: 'cancel' },
                  { text: 'Logout', style: 'destructive', onPress: logout },
                ])
              }
            >
              <View className="flex-row items-center gap-3">
                <Text>🚪</Text>
                <Text>Logout</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Danger zone — RF7.6 */}
          <View className="rounded-2xl p-4 mb-4">
            <TouchableOpacity
              className="flex-row items-center gap-3 py-3"
              onPress={handleDeleteAccount}
            >
              <Text>🗑️</Text>
              <Text>Elimina account definitivamente</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
