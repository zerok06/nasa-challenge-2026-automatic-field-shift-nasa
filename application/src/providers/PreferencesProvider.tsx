import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, Platform } from 'react-native';
import * as Localization from 'expo-localization';
import * as SecureStore from 'expo-secure-store';

import i18n, { type LanguageCode } from '@/i18n';

export type ThemePreference = 'light' | 'dark' | 'system';

type Preferences = {
  language: LanguageCode;
  theme: ThemePreference;
  reduceMotion: boolean;
};

type PreferencesState = Preferences & {
  setLanguage: (language: LanguageCode) => void;
  setTheme: (theme: ThemePreference) => void;
  setReduceMotion: (reduceMotion: boolean) => void;
};

const STORAGE_KEY = 'anden.preferences.v1';

/**
 * Use the phone locale as a starting point, not as a hard rule. The farmer can
 * always change it. Quechua/Aymara device locales get their draft locale.
 */
function deviceLanguage(): LanguageCode {
  const code = Localization.getLocales()[0]?.languageCode;
  // The pilot is Spanish-first. Quechua/Aymara device locales are respected;
  // English stays available from the selector but is not the default.
  if (code === 'qu') return 'qu-PE';
  if (code === 'ay') return 'ay-PE';
  return 'es-PE';
}

const defaults: Preferences = {
  language: deviceLanguage(),
  theme: 'light',
  reduceMotion: false,
};

const PreferencesContext = createContext<PreferencesState | null>(null);

function isLanguage(value: unknown): value is LanguageCode {
  return value === 'es-PE' || value === 'qu-PE' || value === 'ay-PE' || value === 'en';
}

function isTheme(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(defaults);

  useEffect(() => {
    let mounted = true;
    void SecureStore.getItemAsync(STORAGE_KEY)
      .then((raw) => {
        if (!mounted || !raw) return;
        const parsed = JSON.parse(raw) as Partial<Preferences>;
        setPreferences({
          language: isLanguage(parsed.language) ? parsed.language : defaults.language,
          theme: isTheme(parsed.theme) ? parsed.theme : defaults.theme,
          reduceMotion:
            typeof parsed.reduceMotion === 'boolean' ? parsed.reduceMotion : defaults.reduceMotion,
        });
      })
      .catch(() => {
        // A missing or unreadable preference file simply keeps the defaults.
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    void i18n.changeLanguage(preferences.language);
    // React Native Web exposes Appearance but not setColorScheme. Keep the
    // call native-only; `null` follows the operating system theme.
    if (Platform.OS !== 'web' && typeof Appearance.setColorScheme === 'function') {
      Appearance.setColorScheme(preferences.theme === 'system' ? 'auto' : preferences.theme);
    }
    void SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(preferences)).catch(() => {
      // Preferences are best-effort; the app still works with defaults.
    });
  }, [preferences]);

  const setLanguage = useCallback((language: LanguageCode) => {
    setPreferences((current) => ({ ...current, language }));
  }, []);

  const setTheme = useCallback((theme: ThemePreference) => {
    setPreferences((current) => ({ ...current, theme }));
  }, []);

  const setReduceMotion = useCallback((reduceMotion: boolean) => {
    setPreferences((current) => ({ ...current, reduceMotion }));
  }, []);

  const value = useMemo<PreferencesState>(
    () => ({ ...preferences, setLanguage, setTheme, setReduceMotion }),
    [preferences, setLanguage, setTheme, setReduceMotion],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesState {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('usePreferences must be used inside PreferencesProvider');
  return value;
}

export const languageCodes: LanguageCode[] = ['es-PE', 'qu-PE', 'ay-PE', 'en'];
