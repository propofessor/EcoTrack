/**
 * i18n.js — RNF (Multi-language: IT / EN / DE)
 * Initializes i18next with automatic browser language detection.
 * Import this file once in main.jsx before rendering the React tree.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import it from './locales/it.json';
import en from './locales/en.json';
import de from './locales/de.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      it: { translation: it },
      en: { translation: en },
      de: { translation: de },
    },
    fallbackLng: 'it',
    supportedLngs: ['it', 'en', 'de'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'ecotrack_language',
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
