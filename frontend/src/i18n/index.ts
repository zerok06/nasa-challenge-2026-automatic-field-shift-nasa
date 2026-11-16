/**
 * Anden PWA i18n.
 *
 * Spanish source strings are used as keys, exactly like the native app, so the
 * web copy stays identical to the Android copy. Missing translations fall back
 * to Spanish automatically; Quechua and Aymara remain review_pending drafts.
 */
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import ay from './locales/ay-PE';
import en from './locales/en';
import qu from './locales/qu-PE';

export type LanguageCode = 'es-PE' | 'qu-PE' | 'ay-PE' | 'en';

export const languageOptions: { code: LanguageCode; nativeLabel: string; helper: string }[] = [
  { code: 'es-PE', nativeLabel: 'Español', helper: 'Predeterminado' },
  { code: 'qu-PE', nativeLabel: 'Runasimi', helper: 'Quechua sureño · borrador' },
  { code: 'ay-PE', nativeLabel: 'Aymar aru', helper: 'Aimara · borrador' },
  { code: 'en', nativeLabel: 'English', helper: 'English' },
];

export const translationStatus = {
  'qu-PE': 'review_pending',
  'ay-PE': 'review_pending',
  en: 'available',
  'es-PE': 'source',
} as const;

export const LANGUAGE_KEY = 'anden.language';

function detectLanguage(): LanguageCode {
  const stored = window.localStorage.getItem(LANGUAGE_KEY);
  if (stored === 'es-PE' || stored === 'qu-PE' || stored === 'ay-PE' || stored === 'en') {
    return stored;
  }
  return 'es-PE';
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'es-PE': { translation: {} },
      'qu-PE': { translation: qu },
      'ay-PE': { translation: ay },
      en: { translation: en },
    },
    lng: detectLanguage(),
    fallbackLng: 'es-PE',
    supportedLngs: ['es-PE', 'qu-PE', 'ay-PE', 'en'],
    detection: { order: ['localStorage', 'navigator'], lookupLocalStorage: LANGUAGE_KEY },
    keySeparator: false,
    nsSeparator: false,
    interpolation: { escapeValue: false },
    returnNull: false,
  });

export function setLanguage(code: LanguageCode): void {
  window.localStorage.setItem(LANGUAGE_KEY, code);
  void i18n.changeLanguage(code);
}

export default i18n;
