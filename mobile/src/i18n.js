import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import it from './locales/it.json';
import en from './locales/en.json';
import de from './locales/de.json';


function detectLanguage() {
  const supported = ['it', 'en', 'de'];
  const deviceLocales = Localization.getLocales?.() ?? [];
  for (const locale of deviceLocales) {
    const lang = locale.languageCode;
    if (supported.includes(lang)) return lang;
  }
  return 'it';
}

i18n.use(initReactI18next).init({
  resources: { it: { translation: it }, en: { translation: en }, de: { translation: de } },
  lng: detectLanguage(),
  fallbackLng: 'it',
  interpolation: { escapeValue: false },
});

export default i18n;
