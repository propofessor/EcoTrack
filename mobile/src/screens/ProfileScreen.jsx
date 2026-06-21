import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import {
  getProfile,
  updateProfile,
  deleteAccount,
  changePassword,
} from "../api/users";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import {
  getGoogleMobileUrl,
  getCieAuthUrl,
  cieCallback,
} from "../api/auth";
import { BASE_URL } from "../api/client";
import {
  User,
  Mail,
  Car,
  KeyRound,
  Settings,
  LogOut,
  Trash2,
  ChevronRight,
  Check,
} from 'lucide-react-native';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CALLBACK_URL = 'ecotrack://auth/google';

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

const PLATE_REGEX = /^[A-Z]{2}\d{3}[A-Z]{2}$/i;

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const iconColor = scheme === 'dark' ? '#f4f4f5' : '#09090b';
  const placeholderColor = scheme === 'dark' ? '#71717a' : '#a1a1aa';
  const mutedColor = scheme === 'dark' ? '#a1a1aa' : '#71717a';
  const dangerColor = '#ef4444';

  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [plate, setPlate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // RF7.2: password change state
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // RF7.3: provider linking
  const [linkedProviders, setLinkedProviders] = useState([]);
  const [linkingProvider, setLinkingProvider] = useState(false);

  useEffect(() => {
    getProfile()
      .then((data) => {
        setProfile(data);
        setName(data.profile?.name || "");
        setPlate(data.profile?.plate || "");
        // Infer linked providers from user_metadata
        const providers = [];
        if (data.user?.app_metadata?.providers) {
          providers.push(...data.user.app_metadata.providers);
        }
        setLinkedProviders(providers);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleLinkGoogle() {
    setLinkingProvider(true);
    try {
      const { url } = await getGoogleMobileUrl();
      const result = await WebBrowser.openAuthSessionAsync(url, GOOGLE_CALLBACK_URL);
      if (result.type === 'success') {
        const parsed = new URL(result.url);
        const access_token = parsed.searchParams.get('access_token');
        const refresh_token = parsed.searchParams.get('refresh_token');
        const error = parsed.searchParams.get('error');
        if (error || !access_token) { Alert.alert(t('common.error'), t('profile.googleLinkFailed')); return; }
        await AsyncStorage.setItem('access_token', access_token);
        if (refresh_token) await AsyncStorage.setItem('refresh_token', refresh_token);
        setLinkedProviders((prev) => [...new Set([...prev, 'google'])]);
        Alert.alert(t('profile.googleLinked'), t('profile.googleLinkedMsg'));
      }
    } catch (err) {
      Alert.alert(t('common.error'), err.response?.data?.error || t('profile.googleLinkFailed'));
    } finally {
      setLinkingProvider(false);
    }
  }

  async function handleLinkCie() {
    setLinkingProvider(true);
    try {
      const { url, state } = await getCieAuthUrl();
      const redirectUrl = `${BASE_URL}/auth/cie/mobile-callback`;
      const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl);
      if (result.type === "success") {
        const redirected = new URL(result.url);
        const code = redirected.searchParams.get("code");
        const returnedState = redirected.searchParams.get("state");
        if (code && returnedState === state) {
          await cieCallback({ code, state: returnedState });
          setLinkedProviders((prev) => [...new Set([...prev, "cie"])]);
          Alert.alert(t('profile.cieLinked'), t('profile.cieLinkedMsg'));
        }
      }
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err.response?.data?.error || t('profile.cieLinkFailed'),
      );
    } finally {
      setLinkingProvider(false);
    }
  }

  async function handleSave() {
    if (plate && !PLATE_REGEX.test(plate)) {
      Alert.alert(t('common.error'), t('profile.plateInvalid'));
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
        profile: {
          ...p.profile,
          name: name.trim(),
          plate: plate.trim().toUpperCase(),
        },
      }));
      setEditing(false);
      Alert.alert(t('profile.saved'), t('profile.profileUpdated'));
    } catch {
      Alert.alert(t('common.error'), t('profile.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!PASSWORD_REGEX.test(newPassword)) {
      Alert.alert(t('profile.passwordInvalidTitle'), t('profile.passwordInvalid'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('profile.passwordMismatch'));
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword({ newPassword });
      Alert.alert(t('common.success'), t('profile.passwordChanged'));
      setChangingPassword(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err.response?.data?.error || t('profile.passwordUpdateFailed'),
      );
    } finally {
      setSavingPassword(false);
    }
  }

  async function performDeleteAccount() {
    try {
      await deleteAccount();
      await logout();
    } catch {
      Alert.alert(t('common.error'), t('profile.deleteFailed'));
    }
  }

  // RF7.6 / US7: doppia conferma esplicita prima dell'eliminazione definitiva.
  function handleDeleteAccount() {
    Alert.alert(
      t('profile.deleteConfirmTitle'),
      t('profile.deleteConfirmMessage'),
      [
        { text: t('common.cancel'), style: "cancel" },
        {
          text: t('profile.continueLabel'),
          style: "destructive",
          onPress: () => {
            Alert.alert(
              t('profile.deleteFinalTitle'),
              t('profile.deleteFinalMessage'),
              [
                { text: t('common.cancel'), style: "cancel" },
                {
                  text: t('profile.deleteConfirm'),
                  style: "destructive",
                  onPress: performDeleteAccount,
                },
              ],
            );
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <View className="screen flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const email = profile?.user?.email || user?.email || "—";

  return (
    <SafeAreaView className="screen flex-1">
      <ScrollView className="flex-1">
        <View className="px-4 pt-4 pb-8">
          {}
          <View className="items-center py-6 mb-4">
            <View className="avatar rounded-full items-center justify-center mb-3 w-20 h-20">
              <Text className="avatar-letter">
                {(name || email).charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text className="subheading text-center">{name || "—"}</Text>
            <Text className="text-muted text-center">{email}</Text>
          </View>

          {}
          <View className="card rounded-2xl p-4 mb-4">
            <View className="flex-row items-center justify-between py-3">
              <Text className="subheading">{t('profile.personalData')}</Text>
              <TouchableOpacity onPress={() => setEditing((e) => !e)}>
                <Text className="link">{editing ? t('common.cancel') : t('profile.edit')}</Text>
              </TouchableOpacity>
            </View>

            <View className="divider h-px" />

            {editing ? (
              <View className="flex-col gap-2 p-0">
                <View className="flex-col gap-1">
                  <Text className="text-label">{t('profile.nameLabel')}</Text>
                  <TextInput
                    className="input w-full rounded-xl px-4 py-3"
                    style={{ color: iconColor }}
                    placeholderTextColor={placeholderColor}
                    value={name}
                    onChangeText={setName}
                    placeholder={t('register.namePlaceholder')}
                  />
                </View>
                <View className="flex-col gap-1">
                  <Text className="text-label">{t('profile.plateLabel')}</Text>
                  <TextInput
                    className="input w-full rounded-xl px-4 py-3"
                    style={{ color: iconColor }}
                    placeholderTextColor={placeholderColor}
                    value={plate}
                    onChangeText={setPlate}
                    placeholder="AB123CD"
                    autoCapitalize="characters"
                    maxLength={7}
                  />
                </View>
                <TouchableOpacity
                  className="btn-primary w-full rounded-xl py-4 items-center"
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text className="btn-primary-text">
                    {saving ? t('profile.saving') : t('profile.saveChanges')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-col gap-2">
                <View className="flex-row items-center justify-between py-3">
                  <View className="flex-row items-center gap-3">
                    <View className="svg-wrapper">
                      <User size={20} color={iconColor} />
                    </View>
                    <Text className="text-label">{t('profile.name')}</Text>
                  </View>
                  <Text className="text-body">{name || "—"}</Text>
                </View>
                <View className="divider h-px" />
                <View className="flex-row items-center justify-between py-3">
                  <View className="flex-row items-center gap-3">
                    <Mail size={20} color={iconColor} />
                    <Text className="text-label">{t('profile.emailLabel')}</Text>
                  </View>
                  <Text className="text-body">{email}</Text>
                </View>
                <View className="divider h-px" />
                <View className="flex-row items-center justify-between py-3">
                  <View className="flex-row items-center gap-3">
                    <Car size={20} color={iconColor} />
                    <Text className="text-label">{t('profile.plate')}</Text>
                  </View>
                  <Text className="text-body">{plate || t('profile.plateEmpty')}</Text>
                </View>
              </View>
            )}
          </View>

          {}
          <View className="card rounded-2xl p-4 mb-4">
            <TouchableOpacity
              className="flex-row items-center justify-between py-3"
              onPress={() => setChangingPassword((v) => !v)}
            >
              <View className="flex-row items-center gap-3">
                <KeyRound size={20} color={iconColor} />
                <Text className="text-body">{t('profile.changePassword')}</Text>
              </View>
              <Text className="link">
                {changingPassword ? t('common.cancel') : t('profile.edit')}
              </Text>
            </TouchableOpacity>

            {changingPassword && (
              <View className="flex-col gap-3 pt-2">
                <View className="divider h-px mb-2" />
                <View className="flex-col gap-1">
                  <Text className="text-label">{t('profile.newPassword')}</Text>
                  <TextInput
                    className="input w-full rounded-xl px-4 py-3"
                    style={{ color: iconColor }}
                    placeholderTextColor={placeholderColor}
                    placeholder="••••••••"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                  />
                </View>
                <View className="flex-col gap-1">
                  <Text className="text-label">{t('profile.confirmPassword')}</Text>
                  <TextInput
                    className="input w-full rounded-xl px-4 py-3"
                    style={{ color: iconColor }}
                    placeholderTextColor={placeholderColor}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />
                </View>
                <TouchableOpacity
                  className="btn-primary w-full rounded-xl py-4 items-center"
                  onPress={handleChangePassword}
                  disabled={savingPassword}
                >
                  <Text className="btn-primary-text">
                    {savingPassword ? t('profile.saving') : t('profile.updatePassword')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {}
          <View className="card rounded-2xl p-4 mb-4">
            <Text className="subheading mb-3">{t('profile.linkedAccounts')}</Text>

            {(
              <View className="flex-row items-center justify-between py-3">
                <View className="flex-row items-center gap-3">
                  <Image source={require('../../assets/google-icon.png')} accessibilityLabel='Google Logo' className='w-6 h-6' />
                  <Text className="text-body">Google</Text>
                </View>
                {linkedProviders.includes("google") ? (
                  <View className="flex-row items-center gap-1">
                    <Check size={16} color={iconColor} />
                    <Text className="link">{t('profile.linked')}</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleLinkGoogle()}
                    disabled={linkingProvider}
                  >
                    <Text className="link">
                      {linkingProvider ? t('profile.linking') : t('profile.link')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View className="divider h-px" />

            <View className="flex-row items-center justify-between py-3">
              <View className="flex-row items-center gap-3">
                <Image source={require('../../assets/cie-icon.png')} accessibilityLabel='CIE Logo' className='w-6 h-6' />
                <Text className="text-body">CIE</Text>
              </View>
              {linkedProviders.includes("cie") ? (
                <View className="flex-row items-center gap-1">
                  <Check size={16} color={iconColor} />
                  <Text className="link">{t('profile.linked')}</Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleLinkCie}
                  disabled={linkingProvider}
                >
                  <Text className="link">
                    {linkingProvider ? t('profile.linking') : t('profile.link')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {}
          <View className="card rounded-2xl p-4 mb-4">
            <TouchableOpacity
              className="flex-row items-center justify-between py-3"
              onPress={() => navigation.navigate("Preferences")}
            >
              <View className="flex-row items-center gap-3">
                <Settings size={20} color={iconColor} />
                <Text className="text-body">{t('profile.preferences')}</Text>
              </View>
              <ChevronRight size={20} color={mutedColor} />
            </TouchableOpacity>
          </View>

          {}
          <View className="card rounded-2xl p-4 mb-4">
            <TouchableOpacity
              className="flex-row items-center justify-between py-3"
              onPress={() =>
                Alert.alert(t('profile.logoutConfirmTitle'), t('profile.logoutConfirmMessage'), [
                  { text: t('common.cancel'), style: "cancel" },
                  { text: t('common.logout'), style: "destructive", onPress: logout },
                ])
              }
            >
              <View className="flex-row items-center gap-3">
                <LogOut size={20} color={iconColor} />
                <Text className="text-body">{t('common.logout')}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {}
          <View className="card rounded-2xl p-4 mb-4">
            <TouchableOpacity
              className="flex-row items-center gap-3 py-3"
              onPress={handleDeleteAccount}
            >
              <Trash2 size={20} color={dangerColor} />
              <Text className="btn-danger-text">
                {t('profile.deleteAccount')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
