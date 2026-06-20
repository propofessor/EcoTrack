/**
 * PreferencesScreen — RF7.5
 * User preferences: notifications, language, leaderboard privacy, theme.
 */
import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { getProfile, updateProfile } from "../api/users";
import { Check, Sun, Moon } from "lucide-react-native";
import { applyTheme, applyLanguage } from "../utils/preferences";

const LANGUAGES = [
  { code: "it", label: "Italiano 🇮🇹" },
  { code: "en", label: "English 🇬🇧" },
  { code: "de", label: "Deutsch 🇩🇪" },
];

const VISIBILITY_OPTIONS = ["nickname", "anonymous", "full_name"];

export default function PreferencesScreen({ navigation }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const iconColor = scheme === "dark" ? "#f4f4f5" : "#09090b";
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProfile()
      .then((data) => {
        const p = data.profile?.preferences || {};
        const loaded = {
          notificationsEnabled: p.notifications !== false,
          language: p.language || "it",
          leaderboard_visibility: p.leaderboard_visibility || "nickname",
          theme: p.theme || "dark",
        };
        setPrefs(loaded);
        // Sync the live UI (i18n + NativeWind) with the stored preferences.
        applyTheme(loaded.theme);
        applyLanguage(loaded.language);
      })
      .catch(() =>
        setPrefs({
          notificationsEnabled: true,
          language: "it",
          leaderboard_visibility: "nickname",
          theme: "dark",
        }),
      )
      .finally(() => setLoading(false));
  }, []);

  async function savePrefs(updated) {
    const next = { ...prefs, ...updated };
    setPrefs(next);
    setSaving(true);
    // Apply theme / language changes immediately (and persist locally).
    if (updated.theme) applyTheme(updated.theme);
    if (updated.language) applyLanguage(updated.language);
    try {
      await updateProfile({
        preferences: {
          notifications: next.notificationsEnabled,
          language: next.language,
          leaderboard_visibility: next.leaderboard_visibility,
          theme: next.theme,
        },
      });
    } catch {
      Alert.alert(t("common.error"), t("preferences.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View className="screen flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView className="screen flex-1">
      <ScrollView className="flex-1">
        <View className="px-4 pt-4 pb-8">
          {/* Header */}
          <TouchableOpacity
            className="mb-4"
            onPress={() => navigation.goBack()}
          >
            <Text className="link">{t("common.back")}</Text>
          </TouchableOpacity>
          <Text className="heading mb-4">{t("preferences.title")}</Text>
          {saving && (
            <Text className="text-muted mb-2">{t("profile.saving")}</Text>
          )}

          {/* Notifications */}
          <View className="card rounded-2xl p-4 mb-4">
            <Text className="subheading mb-3">
              {t("preferences.notifications")}
            </Text>
            <View className="flex-row items-center justify-between py-3">
              <View>
                <Text className="text-body">{t("preferences.dailyGrade")}</Text>
                <Text className="text-muted">
                  {t("preferences.dailyGradeDesc")}
                </Text>
              </View>
              <Switch
                value={prefs.notificationsEnabled}
                onValueChange={(v) => savePrefs({ notificationsEnabled: v })}
                trackColor={{ false: "#3f3f46", true: "#8ab834" }}
                thumbColor="#ffffff"
              />
            </View>
          </View>

          {/* Language */}
          <View className="card rounded-2xl p-4 mb-4">
            <Text className="subheading mb-3">{t("preferences.language")}</Text>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                className="flex-row items-center justify-between py-3"
                onPress={() => savePrefs({ language: lang.code })}
              >
                <Text className="text-body">{lang.label}</Text>
                {prefs.language === lang.code && (
                  <Check size={16} color={iconColor} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Leaderboard privacy */}
          <View className="card rounded-2xl p-4 mb-4">
            <Text className="subheading mb-3">
              {t("preferences.leaderboardPrivacy")}
            </Text>
            <Text className="text-muted mb-3">
              {t("preferences.leaderboardPrivacyDesc")}
            </Text>
            {VISIBILITY_OPTIONS.map((value) => (
              <TouchableOpacity
                key={value}
                className="flex-row items-center justify-between py-3"
                onPress={() => savePrefs({ leaderboard_visibility: value })}
              >
                <Text className="text-body">{opt.label}</Text>
                {prefs.leaderboard_visibility === opt.value && (
                  <Check size={16} color={iconColor} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Theme */}
          <View className="card rounded-2xl p-4 mb-4">
            <Text className="subheading mb-3">{t("preferences.theme")}</Text>
            <View className="flex-row gap-3">
              {["light", "dark"].map((themeOption) => (
                <TouchableOpacity
                  key={themeOption}
                  className={`flex-1 rounded-xl py-4 items-center ${prefs.theme === themeOption ? "btn-primary" : "btn-ghost"}`}
                  onPress={() => savePrefs({ theme: themeOption })}
                >
                  <View className="flex-row items-center gap-2">
                    {t === "light" ? (
                      <Sun
                        size={22}
                        color={prefs.theme === "light" ? "#ffffff" : iconColor}
                      />
                    ) : (
                      <Moon
                        size={22}
                        color={prefs.theme === "dark" ? "#ffffff" : iconColor}
                      />
                    )}
                    <Text
                      className={
                        prefs.theme === t
                          ? "btn-primary-text"
                          : "btn-ghost-text"
                      }
                      style={{ fontSize: 17 }}
                    >
                      {t === "light" ? "Chiaro" : "Scuro"}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
