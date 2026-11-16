import React, { useState } from 'react';
import { Check, MapPin, ShieldCheck } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';

import { AppAlert } from '@/components/app/AppAlert';
import { AppButton } from '@/components/app/AppButton';
import { AppHeader } from '@/components/app/AppHeader';
import { Disclosure } from '@/components/app/Disclosure';
import { FormField } from '@/components/app/FormField';
import { HeroCard } from '@/components/app/HeroCard';
import { Screen } from '@/components/app/Screen';
import { SectionCard } from '@/components/app/SectionCard';
import { SpeakerButton } from '@/components/app/SpeakerButton';
import { Illustration } from '@/components/illustrations/Illustration';
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
import { usePreferences } from '@/providers/PreferencesProvider';
import { useProfile } from '@/providers/ProfileProvider';

function CheckIcon(props: { size?: number; color?: string }) {
  return <Check {...props} />;
}

type Experience = 'first' | 'some' | 'experienced';

const EXPERIENCES: { code: Experience; label: string }[] = [
  { code: 'first', label: 'Es mi primera vez' },
  { code: 'some', label: 'Ya sembré antes' },
  { code: 'experienced', label: 'Tengo experiencia' },
];

export function OnboardingScreen() {
  const { t } = useTranslation();
  const { language, setLanguage } = usePreferences();
  const { saveProfile } = useProfile();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [experience, setExperience] = useState<Experience>('first');
  const [audio, setAudio] = useState(true);
  const [consent, setConsent] = useState(false);
  const [home, setHome] = useState<{ lat: number; lon: number; district: string | null } | null>(
    null,
  );
  const [locationBusy, setLocationBusy] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLocation = async () => {
    setLocationBusy(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setError('No diste permiso de ubicación. Puedes escribir las coordenadas.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      let district: string | null = null;
      try {
        const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
        const place = places[0];
        district = place?.district ?? place?.city ?? place?.subregion ?? null;
      } catch {
        // Reverse geocoding needs the platform service; coordinates still work.
      }
      setHome({ lat, lon, district });
      setManualLat(lat.toFixed(5));
      setManualLon(lon.toFixed(5));
    } catch {
      setError('No pudimos leer tu ubicación. Escribe las coordenadas.');
    } finally {
      setLocationBusy(false);
    }
  };

  const handleManualLocation = () => {
    const lat = Number(manualLat);
    const lon = Number(manualLon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !manualLat || !manualLon) {
      setError('Escribe una latitud y longitud válidas.');
      return;
    }
    setError(null);
    setHome({ lat, lon, district: home?.district ?? null });
  };

  const handleFinish = async () => {
    if (!name.trim()) {
      setError('Escribe tu nombre para saludarte como corresponde.');
      return;
    }
    if (!consent) {
      setError('Marca que aceptas usar tus datos para este piloto.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveProfile({
        displayName: name.trim(),
        locale: language,
        profile: {
          audio,
          experience,
          home,
          onboarding_version: 1,
        },
        onboardingCompleted: true,
        consentVersion: 'v1',
      });
      setStep(4);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No se pudo crear tu perfil. Intenta de nuevo.',
      );
    } finally {
      setBusy(false);
    }
  };

  const speakText =
    step === 0
      ? t('Bienvenido a Anden. Elige tu idioma para empezar.')
      : step === 1
        ? t('¿Cómo te llamas? Elige cuánta experiencia tienes.')
        : step === 2
          ? t('Usa tu ubicación para preparar el clima de tu zona.')
          : step === 3
            ? t('Revisa y acepta el uso de tus datos para el piloto.')
            : t('Tu perfil está listo. Bienvenido.');

  return (
    <Screen
      keyboard
      edges={['top', 'bottom']}
      header={<AppHeader subtitle={t('Tu perfil')} />}
      footer={
        step === 0 ? (
          <AppButton
            testID={testIDs.onboardingNext}
            onPress={() => {
              setError(null);
              setStep(1);
            }}
            className="min-h-14"
          >
            {t('Continuar')}
          </AppButton>
        ) : step === 1 ? (
          <>
            <AppButton
              testID={testIDs.onboardingNext}
              onPress={() => {
                setError(null);
                setStep(2);
              }}
              className="min-h-14"
            >
              {t('Continuar')}
            </AppButton>
            <AppButton testID={testIDs.onboardingBack} tone="ghost" onPress={() => setStep(0)}>
              {t('Volver')}
            </AppButton>
          </>
        ) : step === 2 ? (
          <>
            <AppButton
              onPress={() => {
                setError(null);
                setStep(3);
              }}
              className="min-h-14"
            >
              {t('Continuar')}
            </AppButton>
            <AppButton
              tone="ghost"
              onPress={() => {
                setHome(null);
                setError(null);
                setStep(3);
              }}
            >
              {t('Ahora no')}
            </AppButton>
          </>
        ) : step === 3 ? (
          <>
            <AppButton
              testID={testIDs.onboardingCreate}
              loading={busy}
              onPress={() => void handleFinish()}
              isDisabled={!consent}
              className="min-h-14"
            >
              {t('Crear mi perfil')}
            </AppButton>
            <AppButton testID={testIDs.onboardingBack} tone="ghost" onPress={() => setStep(2)}>
              {t('Volver')}
            </AppButton>
          </>
        ) : (
          <AppButton
            testID={testIDs.onboardingStart}
            onPress={() => router.replace('/parcel-new')}
            className="min-h-14"
          >
            {t('Crear mi primera parcela')}
          </AppButton>
        )
      }
    >
      <VStack className="gap-2">
        <HStack className="items-center justify-between">
          <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t('Paso {{current}} de {{total}}', { current: Math.min(step + 1, 5), total: 5 })}
          </Text>
          <SpeakerButton text={speakText} />
        </HStack>
        <Progress value={step === 0 ? 20 : step === 1 ? 40 : step === 2 ? 60 : step === 3 ? 80 : 100}>
          <ProgressFilledTrack className="bg-primary" />
        </Progress>
      </VStack>

      {step === 0 ? (
        <>
          <HeroCard
            eyebrow={t('Bienvenido')}
            title={t('Tu parcela, tus decisiones, más simples')}
            description={t(
              'Anden te ayuda a comparar qué sembrar con el clima, tu agua y tus costos. Sin inventar números.',
            )}
          />
          <SectionCard title={t('Idioma')} subtitle={t('Elige cómo quieres leer la app')}>
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
                    className={`min-h-12 w-[48%] flex-row items-center justify-center gap-1 rounded-full border px-3 py-2 ${
                      selected ? 'border-primary bg-accent' : 'border-border bg-card'
                    }`}
                  >
                    {selected ? <Check size={16} color={colors.primary} /> : null}
                    <Text
                      className={`text-base ${selected ? 'font-semibold text-primary' : 'text-foreground'}`}
                    >
                      {option.nativeLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </HStack>
            <Text className="text-sm leading-5 text-muted-foreground">
              {t('Quechua y aimara están en revisión con hablantes nativos.')}
            </Text>
          </SectionCard>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <Illustration name="onboarding-profile" size={88} />
          <VStack className="gap-2">
            <Text className="text-2xl font-bold tracking-tight text-foreground">
              {t('¿Cómo te llamas?')}
            </Text>
            <Text className="text-base leading-6 text-muted-foreground">
              {t('Así te saludamos en Inicio. No pedimos teléfono ni correo.')}
            </Text>
          </VStack>
          <SectionCard title={t('Tu nombre')}>
            <FormField
              label={t('Nombre')}
              testID={testIDs.onboardingName}
              value={name}
              onChangeText={setName}
              placeholder={t('Ejemplo: Juan')}
              autoCapitalize="words"
              required
            />
          </SectionCard>
          <SectionCard
            title={t('Tu experiencia')}
            subtitle={t('Nos ayuda a explicarte con más o menos detalle')}
          >
            <VStack className="gap-2">
              {EXPERIENCES.map((option) => {
                const selected = experience === option.code;
                return (
                  <Pressable
                    key={option.code}
                    onPress={() => setExperience(option.code)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={t(option.label)}
                    className={`min-h-12 flex-row items-center justify-between gap-3 rounded-xl border px-4 py-2 ${
                      selected ? 'border-primary bg-accent' : 'border-border bg-card'
                    }`}
                  >
                    <Text className="text-base text-foreground">{t(option.label)}</Text>
                    {selected ? <Check size={20} color={colors.primary} /> : null}
                  </Pressable>
                );
              })}
            </VStack>
          </SectionCard>
          <SectionCard
            title={t('Escuchar las preguntas')}
            subtitle={t('Puedes activar o desactivar el audio cuando quieras')}
          >
            <HStack className="items-center justify-between gap-3">
              <Text className="flex-1 text-base text-foreground">{t('Audio activado')}</Text>
              <Switch
                testID={testIDs.onboardingAudio}
                value={audio}
                onValueChange={setAudio}
                accessibilityLabel={t('Escuchar las preguntas')}
              />
            </HStack>
          </SectionCard>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Illustration name="onboarding-location" size={88} />
          <VStack className="gap-2">
            <Text className="text-2xl font-bold tracking-tight text-foreground">
              {t('¿Dónde está tu parcela?')}
            </Text>
            <Text className="text-base leading-6 text-muted-foreground">
              {t('Con tu ubicación buscamos el clima de tu zona. No mostramos un mapa.')}
            </Text>
          </VStack>
          <SectionCard
            title={t('Ubicación')}
            subtitle={t('Solo la usamos para el clima y tus planes')}
          >
            <AppButton
              testID={testIDs.onboardingGps}
              loading={locationBusy}
              onPress={() => void handleLocation()}
            >
              {t('Usar mi ubicación')}
            </AppButton>
            <HStack className="items-center gap-2">
              <MapPin size={18} color={colors.primary} />
              <Text className="flex-1 text-sm leading-5 text-muted-foreground">
                {home
                  ? t('Ubicación lista: {{lat}}, {{lon}}', {
                      lat: home.lat.toFixed(4),
                      lon: home.lon.toFixed(4),
                    })
                  : t('Todavía no tenemos tu ubicación.')}
              </Text>
            </HStack>
            {home?.district ? (
              <Text className="text-sm text-foreground">
                {t('Zona: {{district}}', { district: home.district })}
              </Text>
            ) : null}
            <Disclosure
              title={t('Escribir las coordenadas')}
              testID={testIDs.onboardingAdvancedLocation}
            >
              <FormField
                label={t('Latitud')}
                testID={testIDs.onboardingLat}
                value={manualLat}
                onChangeText={setManualLat}
                keyboardType="numbers-and-punctuation"
                placeholder="-17.19"
              />
              <FormField
                label={t('Longitud')}
                testID={testIDs.onboardingLon}
                value={manualLon}
                onChangeText={setManualLon}
                keyboardType="numbers-and-punctuation"
                placeholder="-70.93"
              />
              <AppButton tone="outline" onPress={handleManualLocation}>
                {t('Guardar ubicación')}
              </AppButton>
            </Disclosure>
          </SectionCard>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <Illustration name="onboarding-consent" size={88} />
          <VStack className="gap-2">
            <Text className="text-2xl font-bold tracking-tight text-foreground">
              {t('Revisa y acepta')}
            </Text>
            <Text className="text-base leading-6 text-muted-foreground">
              {t('Usamos tus datos para el piloto de Anden. No los vendemos.')}
            </Text>
          </VStack>
          <SectionCard title={t('Resumen')}>
            <HStack className="items-center gap-2">
              <ShieldCheck size={20} color={colors.primary} />
              <Text className="flex-1 text-base text-foreground">{name.trim() || t('Sin nombre')}</Text>
            </HStack>
            <Text className="text-sm text-muted-foreground">
              {home
                ? t('Zona: {{district}}', {
                    district: home.district ?? t('Ubicación guardada'),
                  })
                : t('Sin ubicación por ahora')}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {audio ? t('Audio activado') : t('Audio desactivado')}
            </Text>
            <Checkbox
              testID={testIDs.onboardingConsent}
              value="consent"
              isChecked={consent}
              onChange={setConsent}
              aria-label={t('Aceptar el uso de datos del piloto')}
            >
              <CheckboxIndicator>
                <CheckboxIcon as={CheckIcon as never} />
              </CheckboxIndicator>
              <CheckboxLabel className="text-base leading-6 text-foreground">
                {t('Acepto usar mis datos para este piloto. Puedo pedir que los borren.')}
              </CheckboxLabel>
            </Checkbox>
            <Disclosure title={t('Qué datos usamos y para qué')}>
              <Text className="text-sm leading-5 text-muted-foreground">
                {t(
                  'Usamos tu nombre, idioma y ubicación para saludarte y buscar el clima de tu zona. No pedimos teléfono ni correo. No vendemos tus datos.',
                )}
              </Text>
            </Disclosure>
          </SectionCard>
        </>
      ) : null}

      {step === 4 ? (
        <>
          <VStack className="items-center gap-3 py-6" testID={testIDs.onboardingReady}>
            <Illustration name="success" size={96} />
            <Text className="text-center text-2xl font-bold tracking-tight text-foreground">
              {t('Tu perfil está listo')}
            </Text>
            <Text className="text-center text-base leading-6 text-muted-foreground">
              {t('Ahora puedes crear tu primera parcela.')}
            </Text>
          </VStack>
          <SectionCard title={t('Bienvenido, {{name}}', { name: name.trim() })}>
            <Text className="text-base leading-6 text-foreground">
              {t('Tu cuenta está en este teléfono. No necesitas contraseña.')}
            </Text>
          </SectionCard>
        </>
      ) : null}

      {error ? <AppAlert tone="error">{error}</AppAlert> : null}

      <Text className="text-center text-sm leading-5 text-muted-foreground">
        {t('Anden · piloto Moquegua · datos abiertos de NASA · app gratuita')}
      </Text>
    </Screen>
  );
}
