/**
 * i18n.js — RNF (Multi-language: IT / EN / DE)
 * Initializes i18next with expo-localization language detection.
 * Import this file once at the app entry point (App.jsx) before rendering.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import it from './locales/it.json';
import en from './locales/en.json';
import de from './locales/de.json';

// Derive the best-matching supported language from the device locale list.
// expo-localization returns locales in preference order (e.g. ['de-DE', 'en-US']).
function detectLanguage() {
  const supported = ['it', 'en', 'de'];
  const deviceLocales = Localization.getLocales?.() ?? [];
  for (const locale of deviceLocales) {
    const lang = locale.languageCode;
    if (supported.includes(lang)) return lang;
  }
  return 'it'; // Default to Italian (app market)
}

i18n.use(initReactI18next).init({
  resources: { it: { translation: it }, en: { translation: en }, de: { translation: de } },
  lng: detectLanguage(),
  fallbackLng: 'it',
  interpolation: { escapeValue: false },
});

export default i18n;
