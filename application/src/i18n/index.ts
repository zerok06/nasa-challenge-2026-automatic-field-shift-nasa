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

// es-PE is the source language and usually relies on Spanish strings being the
// keys themselves (empty resource). The agent greeting (spec 036) uses semantic
// i18n keys, so Spanish values for those keys live here.
const es = {
  'agent.greeting.missing':
    'Hola, soy Anden y voy a guiarte con {{name}}. Vi que no tienes registrado {{what}}. ¿Quieres decírmelo con tus palabras? Lo propongo y lo guardas solo si confirmas; si no, lo descarto y seguimos.',
  'agent.greeting.complete':
    'Hola, soy Anden y estoy revisando {{name}}. Tienes agua, suelo, precio e historial registrados, así que ya puedes comparar planes. ¿Quieres que revise tus opciones o que pruebe con menos agua?',
  'agent.missing.water_available': 'cuánta agua tienes para esta campaña',
  'agent.missing.soil_analysis': 'el análisis de suelo',
  'agent.missing.crop_economics': 'el precio y el gasto por cultivo',
  'agent.missing.crop_history': 'qué sembraste la campaña pasada',
  'agent.missing.area_ha': 'cuánta superficie tiene tu parcela',
};

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
    'es-PE': { translation: es },
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
