/**
 * preferences.js — applies & persists user UI preferences (theme + language).
 *
 * Theme is driven through NativeWind's color scheme (colorScheme.set), which is
 * what the `@media (prefers-color-scheme: dark)` rules in global.css respond to.
 * Without this, toggling the theme in PreferencesScreen had no effect because the
 * app only ever followed the device's system color scheme.
 *
 * Both values are mirrored to AsyncStorage so the chosen theme/language survive
 * an app restart and apply immediately on launch, before the profile is fetched.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme } from 'nativewind';
import i18n from '../i18n';

const THEME_KEY = 'pref_theme';
const LANG_KEY = 'pref_language';

/** Apply a theme ('light' | 'dark') to NativeWind and persist it. */
export async function applyTheme(theme) {
  const next = theme === 'light' ? 'light' : 'dark';
  colorScheme.set(next);
  try {
    await AsyncStorage.setItem(THEME_KEY, next);
  } catch {
    // Non-fatal: theme still applied for this session.
  }
}

/** Apply a language ('it' | 'en' | 'de') to i18next and persist it. */
export async function applyLanguage(lang) {
  if (!lang) return;
  if (lang !== i18n.language) {
    await i18n.changeLanguage(lang);
  }
  try {
    await AsyncStorage.setItem(LANG_KEY, lang);
  } catch {
    // Non-fatal: language still applied for this session.
  }
}

/**
 * Restore the last-applied theme & language on app startup.
 * Falls back to the system color scheme / device locale when nothing is stored.
 */
export async function loadStoredPreferences() {
  try {
    const [theme, lang] = await Promise.all([
      AsyncStorage.getItem(THEME_KEY),
      AsyncStorage.getItem(LANG_KEY),
    ]);
    if (theme) colorScheme.set(theme);
    if (lang && lang !== i18n.language) await i18n.changeLanguage(lang);
  } catch {
    // Ignore — defaults remain in effect.
  }
}
