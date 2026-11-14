/**
 * Anden i18n.
 *
 * Spanish source strings are used as keys. This keeps the Spanish UI readable
 * in the code and makes missing translations fall back to Spanish automatically.
 * Quechua and Aymara are drafts pending native-speaker review.
 */
import i18n from 'i18next';
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

// i18next exposes `use` both as a named export and on the default instance.
// eslint-disable-next-line import/no-named-as-default-member
void i18n.use(initReactI18next).init({
  resources: {
    'es-PE': { translation: {} },
    'qu-PE': { translation: qu },
    'ay-PE': { translation: ay },
    en: { translation: en },
  },
  lng: 'es-PE',
  fallbackLng: 'es-PE',
  supportedLngs: ['es-PE', 'qu-PE', 'ay-PE', 'en'],
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
