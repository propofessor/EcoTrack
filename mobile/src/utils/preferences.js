import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme } from 'nativewind';
import i18n from '../i18n';

const THEME_KEY = 'pref_theme';
const LANG_KEY = 'pref_language';


export async function applyTheme(theme) {
  const next = theme === 'light' ? 'light' : 'dark';
  colorScheme.set(next);
  try {
    await AsyncStorage.setItem(THEME_KEY, next);
  } catch {

  }
}


export async function applyLanguage(lang) {
  if (!lang) return;
  if (lang !== i18n.language) {
    await i18n.changeLanguage(lang);
  }
  try {
    await AsyncStorage.setItem(LANG_KEY, lang);
  } catch {

  }
}


export async function loadStoredPreferences() {
  try {
    const [theme, lang] = await Promise.all([
      AsyncStorage.getItem(THEME_KEY),
      AsyncStorage.getItem(LANG_KEY),
    ]);
    if (theme) colorScheme.set(theme);
    if (lang && lang !== i18n.language) await i18n.changeLanguage(lang);
  } catch {

  }
}
