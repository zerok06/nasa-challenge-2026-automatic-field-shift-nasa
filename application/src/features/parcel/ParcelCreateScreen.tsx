import React, { useState } from 'react';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Check, MapPin, Ruler, ShieldCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { AppAlert } from '@/components/app/AppAlert';
import { AppButton } from '@/components/app/AppButton';
import { AppHeader } from '@/components/app/AppHeader';
import { Disclosure } from '@/components/app/Disclosure';
import { FormField } from '@/components/app/FormField';
import { Screen } from '@/components/app/Screen';
import { SectionCard } from '@/components/app/SectionCard';
import { SpeakerButton } from '@/components/app/SpeakerButton';
import { HStack } from '@/components/ui/hstack';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { colors } from '@/design-system/tokens';
import { testIDs } from '@/design-system/testIDs';
import { parseEsNumber } from '@/lib/parse';
import { useParcel } from '@/providers/ParcelProvider';
import { useProfile } from '@/providers/ProfileProvider';

const STEP_COUNT = 2;

function validCoordinate(lat: string, lon: string): boolean {
  const latitude = parseEsNumber(lat);
  const longitude = parseEsNumber(lon);
  return (
    latitude !== null &&
    longitude !== null &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function ParcelCreateScreen() {
  const { t } = useTranslation();
  const { createParcel } = useParcel();
  const { profile } = useProfile();
  const profileHome = profile?.profile.home;
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [lat, setLat] = useState(() => (profileHome ? String(profileHome.lat) : ''));
  const [lon, setLon] = useState(() => (profileHome ? String(profileHome.lon) : ''));
  const [district, setDistrict] = useState<string | null>(() => profileHome?.district ?? null);
  const [locationBusy, setLocationBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLocation = async () => {
    setLocationBusy(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setError(t('No diste permiso de ubicación. Escribe las coordenadas.'));
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const nextLat = position.coords.latitude;
      const nextLon = position.coords.longitude;
      setLat(nextLat.toFixed(5));
      setLon(nextLon.toFixed(5));
      try {
        const places = await Location.reverseGeocodeAsync({
          latitude: nextLat,
          longitude: nextLon,
        });
        const place = places[0];
        setDistrict(place?.district ?? place?.city ?? place?.subregion ?? null);
      } catch {
        // Coordinates still work without the platform geocoder.
      }
    } catch {
      setError(t('No pudimos leer tu ubicación. Escribe las coordenadas.'));
    } finally {
      setLocationBusy(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError(t('Escribe un nombre para la parcela.'));
      setStep(0);
      return;
    }
    if (!validCoordinate(lat, lon)) {
      setError(t('Necesitamos una latitud y longitud válidas para buscar el clima.'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const parsedArea = area.trim() ? parseEsNumber(area) : null;
      if (area.trim() && (parsedArea === null || parsedArea <= 0)) {
        setError(
          t('“{{value}}” no es una superficie válida. Usa hectáreas, por ejemplo 1.2.', {
            value: area.trim(),
          }),
        );
        setStep(0);
        return;
      }
      const parsedLat = parseEsNumber(lat);
      const parsedLon = parseEsNumber(lon);
      if (parsedLat === null || parsedLon === null) {
        setError(t('Necesitamos una latitud y longitud válidas para buscar el clima.'));
        return;
      }
      await createParcel({
        name: name.trim(),
        areaHa: parsedArea,
        lat: parsedLat,
        lon: parsedLon,
        district,
      });
      // The next onboarding is the parcel ficha: it collects the data the
      // rotation engine needs. The farmer can leave it and return later.
      router.replace('/parcel-profile');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('No se pudo crear la parcela.'));
    } finally {
      setBusy(false);
    }
  };

  const parsedArea = area.trim() ? parseEsNumber(area) : null;
  const locationSummary = validCoordinate(lat, lon)
    ? `${(parseEsNumber(lat) ?? 0).toFixed(4)}, ${(parseEsNumber(lon) ?? 0).toFixed(4)}`
    : t('Sin ubicación todavía');
  const speakText =
    step === 0
      ? t('Ponle un nombre a tu parcela y, si sabes, cuántas hectáreas tiene.')
      : t('Confirma dónde está tu parcela. Usaremos esa ubicación para los datos de NASA.');

  return (
    <Screen
      keyboard
      edges={['top', 'bottom']}
      header={
        <AppHeader
          title={t('NUEVA PARCELA')}
          subtitle={t('Crear parcela')}
          onBack={() => router.back()}
        />
      }
      footer={
        step === 0 ? (
          <AppButton
            testID={testIDs.parcelNewNext}
            onPress={() => {
              if (!name.trim()) {
                setError(t('Escribe un nombre para la parcela.'));
                return;
              }
              setError(null);
              setStep(1);
            }}
            isDisabled={!name.trim()}
            className="min-h-14"
          >
            {t('Continuar')}
          </AppButton>
        ) : (
          <>
            <AppButton
              testID={testIDs.parcelNewCreate}
              loading={busy}
              onPress={() => void handleCreate()}
              isDisabled={!validCoordinate(lat, lon)}
              className="min-h-14"
            >
              {t('Crear parcela y completar ficha')}
            </AppButton>
            <AppButton
              testID={testIDs.parcelNewBack}
              tone="ghost"
              onPress={() => setStep(0)}
              isDisabled={busy}
            >
              {t('Volver')}
            </AppButton>
          </>
        )
      }
      testID={testIDs.parcelNew}
    >
      <VStack className="gap-2">
        <HStack className="items-center justify-between">
          <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t('Paso {{current}} de {{total}}', { current: step + 1, total: STEP_COUNT })}
          </Text>
          <SpeakerButton text={speakText} />
        </HStack>
        <Progress value={step === 0 ? 50 : 100}>
          <ProgressFilledTrack className="bg-primary" />
        </Progress>
        <Text className="text-sm leading-5 text-muted-foreground">
          {t('Solo pedimos lo necesario. La ficha se puede completar después.')}
        </Text>
      </VStack>

      {step === 0 ? (
        <>
          <Text className="text-2xl font-bold tracking-tight text-foreground">
            {t('Datos de tu parcela')}
          </Text>
          <Text className="text-base leading-6 text-muted-foreground">
            {t('Usa un nombre que reconozcas. La superficie es opcional, pero ayuda a estimar el agua y la ganancia.')}
          </Text>
          <SectionCard title={t('Nombre y superficie')}>
            <FormField
              label={t('Nombre')}
              testID={testIDs.parcelNewName}
              value={name}
              onChangeText={setName}
              placeholder={t('Mi parcela')}
              autoCapitalize="sentences"
              required
            />
            <FormField
              label={t('Hectáreas (opcional)')}
              testID={testIDs.parcelNewArea}
              value={area}
              onChangeText={setArea}
              placeholder={t('Ejemplo: 1.2')}
              keyboardType="decimal-pad"
              helper={t('Una hectárea es 10,000 m².')}
            />
          </SectionCard>
          <Disclosure title={t('¿Por qué te pido la superficie?')}>
            <Text className="text-sm leading-5 text-muted-foreground">
              {t(
                'Con la superficie convertimos el agua y las cosechas a hectáreas. Si no la sabes, puedes continuar y completarla después.',
              )}
            </Text>
          </Disclosure>
        </>
      ) : (
        <>
          <Text className="text-2xl font-bold tracking-tight text-foreground">
            {t('¿Dónde está tu parcela?')}
          </Text>
          <Text className="text-base leading-6 text-muted-foreground">
            {t('Usamos la ubicación para pedir datos reales de NASA POWER. No mostramos un mapa en esta versión.')}
          </Text>
          <SectionCard title={t('Ubicación')}>
            <HStack className="items-center gap-2 rounded-xl bg-accent p-3">
              <MapPin size={20} color={colors.primary} />
              <VStack className="flex-1">
                <Text className="text-sm font-semibold text-foreground">{locationSummary}</Text>
                {district ? (
                  <Text className="text-sm text-muted-foreground">{district}</Text>
                ) : null}
              </VStack>
              {validCoordinate(lat, lon) ? <Check size={20} color={colors.success} /> : null}
            </HStack>
            <AppButton
              testID={testIDs.parcelNewGps}
              loading={locationBusy}
              onPress={() => void handleLocation()}
            >
              {t('Usar mi ubicación actual')}
            </AppButton>
            <Text className="text-sm leading-5 text-muted-foreground">
              {t('Si ya usaste tu ubicación en el perfil, puedes continuar con esa.')}
            </Text>
            <Disclosure title={t('Escribir las coordenadas')}>
              <FormField
                label={t('Latitud')}
                testID={testIDs.parcelNewLat}
                value={lat}
                onChangeText={setLat}
                keyboardType="numbers-and-punctuation"
                placeholder="-17.19"
              />
              <FormField
                label={t('Longitud')}
                testID={testIDs.parcelNewLon}
                value={lon}
                onChangeText={setLon}
                keyboardType="numbers-and-punctuation"
                placeholder="-70.93"
              />
            </Disclosure>
          </SectionCard>

          <SectionCard title={t('Resumen')}>
            <HStack className="items-center gap-2">
              <Check size={18} color={colors.success} />
              <Text className="flex-1 text-base font-semibold text-foreground">{name}</Text>
            </HStack>
            <HStack className="items-center gap-2">
              <Ruler size={18} color={colors.water} />
              <Text className="flex-1 text-sm text-muted-foreground">
                {parsedArea && parsedArea > 0 ? `${area.trim()} ha` : t('Superficie no disponible')}
              </Text>
            </HStack>
            <HStack className="items-center gap-2">
              <ShieldCheck size={18} color={colors.primary} />
              <Text className="flex-1 text-sm text-muted-foreground">
                {t('Los datos de clima se pedirán para este punto.')}
              </Text>
            </HStack>
          </SectionCard>
        </>
      )}

      {error ? <AppAlert tone="error">{error}</AppAlert> : null}
    </Screen>
  );
}
