import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en.json';
import arTranslation from './locales/ar.json';
import urTranslation from './locales/ur.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation,
      },
      ar: {
        translation: arTranslation,
      },
      ur: {
        translation: urTranslation,
      },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'cookie', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage'],
    },
  });

// Handle RTL direction
i18n.on('languageChanged', (lng) => {
  const isRTL = ['ar', 'ur'].includes(lng);
  document.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
});

// Set initial direction
const initialIsRTL = ['ar', 'ur'].includes(i18n.language);
document.dir = initialIsRTL ? 'rtl' : 'ltr';
document.documentElement.lang = i18n.language;

export default i18n;
