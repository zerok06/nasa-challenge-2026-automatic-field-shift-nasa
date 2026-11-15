import React, { useState } from 'react';
import { Linking } from 'react-native';
import { Check, ExternalLink } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppAlert } from '@/components/app/AppAlert';
import { AppButton } from '@/components/app/AppButton';
import { AppHeader } from '@/components/app/AppHeader';
import { Disclosure } from '@/components/app/Disclosure';
import { FormField } from '@/components/app/FormField';
import { Screen } from '@/components/app/Screen';
import { SectionCard } from '@/components/app/SectionCard';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { colors } from '@/design-system/tokens';
import { testIDs } from '@/design-system/testIDs';
import { languageOptions, translationStatus } from '@/i18n';
import { usePreferences, type ThemePreference } from '@/providers/PreferencesProvider';
import { useProfile } from '@/providers/ProfileProvider';
import { apiBaseUrl } from '@/services/api';

const THEMES: { code: ThemePreference; label: string }[] = [
  { code: 'light', label: 'Claro' },
  { code: 'dark', label: 'Oscuro' },
  { code: 'system', label: 'Como el teléfono' },
];

function Row({
  label,
  helper,
  selected,
  testID,
  onPress,
}: {
  label: string;
  helper?: string;
  selected?: boolean;
  testID: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      className="min-h-12 flex-row items-center justify-between gap-3 rounded-xl px-1 py-2"
    >
      <VStack className="flex-1 gap-0.5">
        <Text className="text-base font-medium text-foreground">{label}</Text>
        {helper ? <Text className="text-sm leading-5 text-muted-foreground">{helper}</Text> : null}
      </VStack>
      {selected ? <Check size={22} color={colors.primary} /> : null}
    </Pressable>
  );
}

export function SettingsScreen() {
  const { t } = useTranslation();
  const { language, theme, reduceMotion, setLanguage, setTheme, setReduceMotion } =
    usePreferences();
  const { profile, saveProfile } = useProfile();
  const [profileName, setProfileName] = useState(profile?.display_name ?? '');
  const [audio, setAudio] = useState(profile?.profile.audio ?? true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileError(null);
    setProfileSaved(false);
    try {
      await saveProfile({
        displayName: profileName.trim() || null,
        locale: language,
        profile: { ...(profile?.profile ?? {}), audio },
        onboardingCompleted: true,
      });
      setProfileSaved(true);
    } catch (cause) {
      setProfileError(
        cause instanceof Error ? cause.message : 'No se pudo guardar tu perfil.',
      );
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <Screen
      edges={['top', 'bottom']}
      header={<AppHeader subtitle={t('Ajustes')} onBack={() => router.back()} />}
    >
      <SectionCard title={t('Tu perfil')} subtitle={t('Así te saludamos en Inicio')}>
        <FormField
          label={t('Nombre')}
          testID="settings.profileName"
          value={profileName}
          onChangeText={setProfileName}
          placeholder={t('Ejemplo: Juan')}
          autoCapitalize="words"
        />
        <HStack className="items-center justify-between gap-3">
          <VStack className="flex-1 gap-0.5">
            <Text className="text-base font-medium text-foreground">
              {t('Escuchar las preguntas')}
            </Text>
            <Text className="text-sm leading-5 text-muted-foreground">
              {audio ? t('Audio activado') : t('Audio desactivado')}
            </Text>
          </VStack>
          <Switch
            testID="settings.audio"
            value={audio}
            onValueChange={setAudio}
            accessibilityLabel={t('Escuchar las preguntas')}
          />
        </HStack>
        {profileError ? <AppAlert tone="error">{profileError}</AppAlert> : null}
        {profileSaved ? <AppAlert tone="success">{t('Perfil guardado')}</AppAlert> : null}
        <AppButton loading={savingProfile} onPress={() => void handleSaveProfile()}>
          {t('Guardar cambios')}
        </AppButton>
      </SectionCard>

      <SectionCard title={t('Idioma')} subtitle={t('Elige cómo quieres leer la app')}>
        <VStack className="gap-1">
          {languageOptions.map((option) => (
            <Row
              key={option.code}
              label={option.nativeLabel}
              helper={
                option.code === 'es-PE'
                  ? t('Predeterminado')
                  : translationStatus[option.code] === 'review_pending'
                    ? `${t(option.helper)} · ${t('Borrador pendiente de revisión')}`
                    : t(option.helper)
              }
              selected={language === option.code}
              testID={testIDs.settingsLanguage(option.code)}
              onPress={() => setLanguage(option.code)}
            />
          ))}
        </VStack>
        {language !== 'es-PE' && language !== 'en' ? (
          <AppAlert tone="info">
            {t(
              'Este idioma es un borrador: parte del texto seguirá en español hasta la revisión con hablantes nativos.',
            )}
          </AppAlert>
        ) : null}
        <Text className="text-sm leading-5 text-muted-foreground">
          {t('Quechua y aimara están en revisión con hablantes nativos.')}
        </Text>
      </SectionCard>

      <SectionCard title={t('Apariencia')}>
        <VStack className="gap-1">
          {THEMES.map((option) => (
            <Row
              key={option.code}
              label={t(option.label)}
              selected={theme === option.code}
              testID={testIDs.settingsTheme(option.code)}
              onPress={() => setTheme(option.code)}
            />
          ))}
        </VStack>
      </SectionCard>

      <SectionCard title={t('Accesibilidad')}>
        <HStack className="items-center justify-between gap-3">
          <VStack className="flex-1 gap-0.5">
            <Text className="text-base font-medium text-foreground">
              {t('Reducir movimiento')}
            </Text>
            <Text className="text-sm leading-5 text-muted-foreground">
              {t('Desactiva las animaciones de gráficos y pantallas.')}
            </Text>
          </VStack>
          <Switch
            testID={testIDs.settingsReduceMotion}
            value={reduceMotion}
            onValueChange={setReduceMotion}
            accessibilityLabel={t('Reducir movimiento')}
          />
        </HStack>
        <Disclosure title={t('Tamaño de texto')}>
          <Text className="text-sm leading-5 text-muted-foreground">
            {t('Anden respeta el tamaño de letra de tu teléfono.')}
          </Text>
          <AppButton
            tone="outline"
            onPress={() => void Linking.openSettings()}
            testID="settings.systemText"
          >
            {t('Abrir ajustes del sistema')}
          </AppButton>
        </Disclosure>
      </SectionCard>

      <SectionCard title={t('Datos y privacidad')}>
        <AppButton
          tone="outline"
          onPress={() => router.push('/sources')}
          testID={testIDs.settingsSources}
        >
          {t('Ver fuentes y límites')}
        </AppButton>
        <Disclosure title={t('Conexión con el servidor')} testID={testIDs.settingsApiUrl}>
          <Text className="text-sm leading-5 text-muted-foreground">
            {t(
              'El teléfono y la computadora deben estar en la misma red Wi-Fi. Esta es la dirección que usa la app:',
            )}
          </Text>
          <Text selectable className="rounded-lg bg-muted/60 p-2 text-sm text-foreground">
            {apiBaseUrl()}
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            {t('Si cambia la red, actualiza EXPO_PUBLIC_API_URL en application/.env.local.')}
          </Text>
        </Disclosure>
      </SectionCard>

      <SectionCard title={t('Acerca de Anden')}>
        <Text className="text-base leading-6 text-foreground">
          {t('Hecho para agricultores de Moquegua')}. Anden 0.1.0 · datos abiertos de NASA.
        </Text>
        <Text className="text-sm leading-5 text-muted-foreground">
          {t('Quechua y aimara están en revisión con hablantes nativos.')}
        </Text>
        <HStack className="items-center gap-1">
          <ExternalLink size={16} color={colors.water} />
          <Text className="text-sm text-water">power.larc.nasa.gov · earthdata.nasa.gov</Text>
        </HStack>
        <AppButton tone="ghost" onPress={() => router.back()}>
          {t('Volver')}
        </AppButton>
      </SectionCard>
    </Screen>
  );
}
