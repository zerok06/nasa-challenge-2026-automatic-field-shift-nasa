import React from 'react';
import { Linking } from 'react-native';
import { Check, ExternalLink } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/app/AppButton';
import { AppHeader } from '@/components/app/AppHeader';
import { Disclosure } from '@/components/app/Disclosure';
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

const THEMES: { code: ThemePreference; label: string }[] = [
  { code: 'light', label: 'Claro' },
  { code: 'dark', label: 'Oscuro' },
  { code: 'system', label: 'Sistema' },
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
        <Text className="text-sm font-medium text-foreground">{label}</Text>
        {helper ? <Text className="text-xs text-muted-foreground">{helper}</Text> : null}
      </VStack>
      {selected ? <Check size={20} color={colors.primary} /> : null}
    </Pressable>
  );
}

export function SettingsScreen() {
  const { t } = useTranslation();
  const { language, theme, reduceMotion, setLanguage, setTheme, setReduceMotion } =
    usePreferences();

  return (
    <Screen header={<AppHeader subtitle={t('Ajustes')} onBack={() => router.back()} />}>
      <SectionCard title={t('Idioma')} subtitle={t('Elegí tu idioma')}>
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
        <Text className="text-xs leading-5 text-muted-foreground">
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
            <Text className="text-sm font-medium text-foreground">{t('Reducir movimiento')}</Text>
            <Text className="text-xs text-muted-foreground">
              {t('Desactiva animaciones de gráficos y transiciones.')}
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
          <Text className="text-sm text-muted-foreground">
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
          {t('Ver fuentes')}
        </AppButton>
        <Disclosure title={t('Acerca de Anden')} testID={testIDs.settingsAbout}>
          <Text className="text-sm text-muted-foreground">
            {t('Hecho para agricultores de Moquegua')}. Anden 0.1.0 · datos NASA abiertos.
          </Text>
          <Text className="text-xs text-muted-foreground">
            {t('Quechua y aimara están en revisión con hablantes nativos.')}
          </Text>
          <HStack className="items-center gap-1">
            <ExternalLink size={14} color={colors.water} />
            <Text className="text-xs text-water">power.larc.nasa.gov · earthdata.nasa.gov</Text>
          </HStack>
        </Disclosure>
      </SectionCard>
    </Screen>
  );
}
