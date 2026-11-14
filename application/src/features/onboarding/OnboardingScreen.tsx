import React, { useState } from 'react';
import { Check } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppAlert } from '@/components/app/AppAlert';
import { AppButton } from '@/components/app/AppButton';
import { AppHeader } from '@/components/app/AppHeader';
import { Disclosure } from '@/components/app/Disclosure';
import { FormField } from '@/components/app/FormField';
import { Screen } from '@/components/app/Screen';
import { SectionCard } from '@/components/app/SectionCard';
import {
  Checkbox,
  CheckboxIcon,
  CheckboxIndicator,
  CheckboxLabel,
} from '@/components/ui/checkbox';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { colors } from '@/design-system/tokens';
import { testIDs } from '@/design-system/testIDs';
import { languageOptions } from '@/i18n';
import { useParcel } from '@/providers/ParcelProvider';
import { usePreferences } from '@/providers/PreferencesProvider';

function CheckIcon(props: { size?: number; color?: string }) {
  return <Check {...props} />;
}

export function OnboardingScreen() {
  const { t } = useTranslation();
  const { createDemo, createParcel } = useParcel();
  const { language, reduceMotion, setLanguage, setReduceMotion } = usePreferences();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('Mi parcela');
  const [area, setArea] = useState('1.2');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDemo = async () => {
    setBusy(true);
    setError(null);
    try {
      await createDemo();
      router.replace('/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear la parcela demo');
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Escribí un nombre para la parcela');
      return;
    }
    if (!consent) {
      setError('Necesitamos tu consentimiento para continuar');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createParcel({
        name: name.trim(),
        areaHa: Number(area) > 0 ? Number(area) : null,
        lat: -17.19,
        lon: -70.93,
      });
      router.replace('/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear la parcela');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      keyboard
      edges={['top', 'bottom']}
      header={<AppHeader subtitle={t('Copiloto de planificación agrícola')} />}
    >
      <VStack className="gap-2">
        <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('Paso {{current}} de {{total}}', { current: step + 1, total: 2 })}
        </Text>
        <Progress value={step === 0 ? 50 : 100}>
          <ProgressFilledTrack className="bg-primary" />
        </Progress>
      </VStack>

      {step === 0 ? (
        <>
          <SectionCard title={t('Idioma')} subtitle={t('Elegí tu idioma')}>
            <HStack className="flex-wrap gap-2">
              {languageOptions.map((option) => {
                const selected = language === option.code;
                return (
                  <Pressable
                    key={option.code}
                    testID={testIDs.onboardingLanguage(option.code)}
                    onPress={() => setLanguage(option.code)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={option.nativeLabel}
                    className={`min-h-10 w-[48%] flex-row items-center justify-center gap-1 rounded-full border px-3 py-2 ${
                      selected ? 'border-primary bg-accent' : 'border-border bg-card'
                    }`}
                  >
                    {selected ? <Check size={14} color={colors.primary} /> : null}
                    <Text
                      className={`text-sm ${selected ? 'font-semibold text-primary' : 'text-foreground'}`}
                    >
                      {option.nativeLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </HStack>
            <Text className="text-xs leading-4 text-muted-foreground">
              {t('Quechua y aimara están en revisión con hablantes nativos.')}
            </Text>
          </SectionCard>

          <Disclosure title={t('Preferencias de accesibilidad')} testID={testIDs.onboardingA11y}>
            <HStack className="items-center justify-between gap-3">
              <Text className="flex-1 text-sm text-foreground">{t('Reducir movimiento')}</Text>
              <Switch
                value={reduceMotion}
                onValueChange={setReduceMotion}
                accessibilityLabel={t('Reducir movimiento')}
              />
            </HStack>
            <Text className="text-xs leading-4 text-muted-foreground">
              {t('Anden respeta el tamaño de letra de tu teléfono.')}
            </Text>
          </Disclosure>

          <VStack className="gap-2">
            <Text className="text-3xl font-bold leading-9 tracking-tight text-foreground">
              Tu parcela, tus decisiones, más información.
            </Text>
            <Text className="text-base leading-6 text-muted-foreground">
              Anden reúne datos NASA, tu historial y tus restricciones para comparar
              rotaciones con evidencia y sin inventar datos.
            </Text>
          </VStack>

          <SectionCard
            title={t('Parcela de demostración')}
            subtitle={t(
              'Datos sintéticos etiquetados: cebolla → zapallo, agua declarada y sin análisis de suelo.',
            )}
          >
            <AppButton
              testID={testIDs.onboardingDemo}
              loading={busy}
              onPress={handleDemo}
            >
              {t('Cargar parcela demo')}
            </AppButton>
            <AppButton
              testID={testIDs.onboardingNext}
              tone="outline"
              onPress={() => setStep(1)}
            >
              {t('Crear mi parcela')}
            </AppButton>
          </SectionCard>

          <AppAlert tone="info">
            No es una recomendación agronómica certificada. Las cifras faltantes se muestran como
            “No disponible”, nunca como cero.
          </AppAlert>
        </>
      ) : (
        <>
          <VStack className="gap-2">
            <Text className="text-2xl font-bold tracking-tight text-foreground">
              Contanos sobre tu parcela
            </Text>
            <Text className="text-sm leading-5 text-muted-foreground">
              Con estos datos podemos ubicar el contexto NASA y estimar agua, suelo y margen.
            </Text>
          </VStack>

          <SectionCard title="Datos de la parcela">
            <FormField
              label="Nombre"
              testID={testIDs.onboardingName}
              value={name}
              onChangeText={setName}
              placeholder="Mi parcela"
              required
            />
            <FormField
              label="Superficie (ha, opcional)"
              testID={testIDs.onboardingArea}
              value={area}
              onChangeText={setArea}
              placeholder="1.2"
              keyboardType="decimal-pad"
              helper="Si no la sabés, podés dejarla vacía. No vamos a inventarla."
            />
            <HStack className="items-start gap-3 pt-1">
              <Checkbox
                value="consent"
                isChecked={consent}
                onChange={setConsent}
                aria-label="Aceptar consentimiento del piloto"
              >
                <CheckboxIndicator>
                  <CheckboxIcon as={CheckIcon as any} />
                </CheckboxIndicator>
                <CheckboxLabel className="text-sm leading-5 text-foreground">
                  Acepto el consentimiento del piloto: datos mínimos, borrado/exportación y uso
                  gratuito.
                </CheckboxLabel>
              </Checkbox>
            </HStack>
          </SectionCard>

          {error ? <AppAlert tone="error">{error}</AppAlert> : null}

          <AppButton
            testID={testIDs.onboardingCreate}
            loading={busy}
            onPress={handleCreate}
            isDisabled={!consent}
          >
            Crear parcela
          </AppButton>
          <AppButton tone="ghost" onPress={() => setStep(0)}>
            Volver
          </AppButton>
        </>
      )}

      {step === 0 && error ? <AppAlert tone="error">{error}</AppAlert> : null}
      <Text className="text-center text-xs leading-4 text-muted-foreground">
        Anden · piloto Moquegua · datos abiertos NASA · app gratuita
      </Text>
    </Screen>
  );
}
