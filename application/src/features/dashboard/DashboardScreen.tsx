import React, { useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { CloudSun, Sprout } from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { AppAlert } from '@/components/app/AppAlert';
import { AppButton } from '@/components/app/AppButton';
import { AppHeader } from '@/components/app/AppHeader';
import { CropThumb } from '@/components/app/CropThumb';
import { Disclosure } from '@/components/app/Disclosure';
import { HeroCard } from '@/components/app/HeroCard';
import { MetricTile } from '@/components/app/Metric';
import { Screen } from '@/components/app/Screen';
import { SectionCard } from '@/components/app/SectionCard';
import { StateView } from '@/components/app/StateView';
import { ToolTile } from '@/components/app/ToolTile';
import { Illustration } from '@/components/illustrations/Illustration';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { colors } from '@/design-system/tokens';
import { testIDs } from '@/design-system/testIDs';
import { formatCropSequence, formatDate, formatMissing, formatMoney, formatNumber } from '@/lib/format';
import { useComparison } from '@/providers/ComparisonProvider';
import { useOffline } from '@/providers/OfflineProvider';
import { useParcel } from '@/providers/ParcelProvider';
import { useProfile } from '@/providers/ProfileProvider';
import { createDemoParcel, getCrops, getSavedPlans, type Crop, type Parcel } from '@/services/api';
import { profileProgress } from '@/features/parcel/profileStatus';
import { PlanReviewInline } from '@/features/plan/PlanReviewInline';

type CropEconomics = {
  yield_kg_ha?: number | null;
  price_pen_kg?: number | null;
  costs_pen?: number | null;
};

function parcelLocation(parcel: Parcel): string {
  const coordinates = parcel.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return '';
  if (parcel.geometry.type === 'Point') {
    return `${Number(coordinates[1]).toFixed(4)}, ${Number(coordinates[0]).toFixed(4)}`;
  }
  if (parcel.geometry.type === 'Polygon' && Array.isArray(coordinates[0])) {
    const ring = coordinates[0] as number[][];
    const points =
      ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] ? ring.slice(0, -1) : ring;
    if (points.length === 0) return '';
    const lat = points.reduce((sum, point) => sum + point[1], 0) / points.length;
    const lon = points.reduce((sum, point) => sum + point[0], 0) / points.length;
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }
  return '';
}

export function DashboardScreen() {
  const { t } = useTranslation();
  const { parcel, parcels, context, indicators, loading, error, refresh, selectParcel } = useParcel();
  const queryClient = useQueryClient();
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const { comparison, createComparison, busy } = useComparison();
  const { online, bundle } = useOffline();
  const { profile } = useProfile();
  const cropsQuery = useQuery({
    queryKey: ['crops'],
    queryFn: getCrops,
    staleTime: 60 * 60 * 1000,
  });
  const savedPlansQuery = useQuery({
    queryKey: ['saved-plans', parcel?.id],
    queryFn: getSavedPlans,
    enabled: Boolean(parcel),
  });

  const displayName =
    profile?.display_name && profile.display_name !== 'Agricultor' ? profile.display_name : null;
  const greeting = displayName ? t('Hola, {{name}}', { name: displayName }) : t('Hola');

  const handleDemo = async () => {
    setDemoBusy(true);
    setDemoError(null);
    try {
      const created = await createDemoParcel();
      selectParcel(created);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['parcels'] }),
        queryClient.invalidateQueries({ queryKey: ['crop-history', created.id] }),
        queryClient.invalidateQueries({ queryKey: ['context', created.id] }),
        queryClient.invalidateQueries({ queryKey: ['indicators', created.id] }),
      ]);
    } catch (cause) {
      setDemoError(
        cause instanceof Error ? cause.message : t('No pudimos cargar los datos de ejemplo.'),
      );
    } finally {
      setDemoBusy(false);
    }
  };

  if (!parcel && loading) {
    return (
      <Screen header={<AppHeader subtitle={t('Inicio')} />}>
        <StateView
          loading
          title={t('Cargando parcela')}
          description={t('Leyendo tus datos.')}
        />
      </Screen>
    );
  }

  if (!parcel) {
    return (
      <Screen header={<AppHeader subtitle={t('Inicio')} onSettings={() => router.push('/settings')} />}>
        {error ? <AppAlert tone="error">{error}</AppAlert> : null}
        {demoError ? <AppAlert tone="error">{demoError}</AppAlert> : null}
        <HeroCard
          eyebrow={greeting}
          title={t('Bienvenido a Anden')}
          description={t('Crea tu primera parcela para comparar qué sembrar con tus datos reales.')}
          illustration="empty"
        >
          <AppButton
            tone="surface"
            onPress={() => router.push('/parcel-new')}
            className="min-h-14"
            testID={testIDs.dashboardParcel}
          >
            {t('Crear mi parcela')}
          </AppButton>
          <AppButton
            tone="outline"
            onPress={() => void handleDemo()}
            loading={demoBusy}
            className="min-h-14"
            testID={testIDs.dashboardDemo}
          >
            {t('Probar con datos de ejemplo')}
          </AppButton>
          <Text className="text-sm leading-5 text-muted-foreground">
            {t('Carga una parcela de demostración con cultivos, agua y precios.')}
          </Text>
        </HeroCard>
        <SectionCard title={t('Cómo funciona')} subtitle={t('Tres pasos, sin complicaciones')}>
          <VStack className="gap-3">
            <HStack className="items-start gap-3">
              <Illustration name="onboarding-location" size={40} />
              <Text className="flex-1 text-base leading-6 text-foreground">
                {t('1. Marca el punto de tu parcela.')}
              </Text>
            </HStack>
            <HStack className="items-start gap-3">
              <Illustration name="compare" size={40} />
              <Text className="flex-1 text-base leading-6 text-foreground">
                {t('2. Compara 3 planes con tu agua, suelo y precios.')}
              </Text>
            </HStack>
            <HStack className="items-start gap-3">
              <Illustration name="success" size={40} />
              <Text className="flex-1 text-base leading-6 text-foreground">
                {t('3. Guarda el plan que te sirva.')}
              </Text>
            </HStack>
          </VStack>
        </SectionCard>
        <Text className="text-center text-sm leading-5 text-muted-foreground">
          {t('Es una ayuda para decidir. No reemplaza la visita de un agrónomo.')}
        </Text>
      </Screen>
    );
  }

  const firstIndicator = indicators?.indicators?.[0];
  const latestPlan = (savedPlansQuery.data ?? []).find((plan) => plan.parcel_id === parcel.id);
  const fichaProgress = profileProgress(parcel, context);
  const location = parcelLocation(parcel);
  const economics = (parcel.preferences?.economics ?? {}) as Record<string, CropEconomics>;
  const cropMap = new Map<string, Crop>(
    (cropsQuery.data?.crops ?? []).map((crop) => [crop.id, crop]),
  );
  const priceRows = Object.entries(economics)
    .filter(([, value]) => value && (value.price_pen_kg != null || value.yield_kg_ha != null));
  const completePrices = Object.values(economics).filter(
    (value) =>
      value?.yield_kg_ha != null && value?.price_pen_kg != null && value?.costs_pen != null,
  ).length;
  const priceLabel =
    priceRows.length > 0
      ? t('{{done}} de {{total}} cultivos con precios', {
          done: completePrices,
          total: Object.keys(economics).length,
        })
      : t('Sin precios declarados');
  const waterReady = context?.completeness.water === 'ready';

  const handleCompare = async () => {
    try {
      if (!comparison) await createComparison();
      router.push('/comparison');
    } catch {
      // The provider exposes the error through the alert below.
    }
  };

  const handleScenario = async () => {
    try {
      if (!comparison) await createComparison();
      router.push('/scenario');
    } catch {
      // The provider exposes the error through the alert below.
    }
  };

  return (
    <Screen
      header={
        <AppHeader
          subtitle={`${parcel.name} · ${parcel.district ?? t('Moquegua')}`}
          onSources={() => router.push('/sources')}
          onSettings={() => router.push('/settings')}
        />
      }
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />
      }
    >
      {error && online ? <AppAlert tone="error">{error}</AppAlert> : null}
      {!online ? (
        <AppAlert tone="info">
          {bundle
            ? t('Sin conexión: usando los datos guardados de esta parcela.')
            : t('Sin conexión: descarga los datos de tu parcela cuando tengas señal.')}
        </AppAlert>
      ) : null}

      {parcels.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 8 }}
          testID={testIDs.dashboardParcels}
        >
          {parcels.map((item) => {
            const selected = item.id === parcel.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => selectParcel(item)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${item.name}. ${item.district ?? t('Moquegua')}`}
                className={`min-h-11 flex-row items-center gap-2 rounded-full border px-3 ${
                  selected ? 'border-primary bg-accent' : 'border-border bg-card'
                }`}
              >
                <Illustration name="parcel" size={24} />
                <Text className="max-w-[160px] text-sm font-semibold text-foreground" numberOfLines={1}>
                  {item.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <HeroCard
        eyebrow={greeting}
        title={comparison ? t('Tu comparación está lista') : t('¿Qué sembrar?')}
        description={
          comparison
            ? t('Revisa agua, suelo y ganancia en tus 3 planes.')
            : t('Compara con tu agua, tu suelo y tus precios.')
        }
        illustration="field"
        testID={testIDs.dashboardHero}
      >
        <AppButton
          testID={testIDs.dashboardCompare}
          loading={busy}
          onPress={() => void handleCompare()}
          tone="surface"
          className="min-h-14"
        >
          {comparison ? t('Ver comparación') : t('Comparar ahora')}
        </AppButton>
        <HStack className="flex-wrap gap-2">
          <Text className="rounded-full bg-primary-foreground/15 px-2.5 py-1 text-sm text-primary-foreground">
            {waterReady ? t('Agua lista') : t('Agua pendiente')}
          </Text>
          <Text className="rounded-full bg-primary-foreground/15 px-2.5 py-1 text-sm text-primary-foreground">
            {t('Ficha {{progress}}%', { progress: fichaProgress })}
          </Text>
          <Text className="rounded-full bg-primary-foreground/15 px-2.5 py-1 text-sm text-primary-foreground">
            {priceLabel}
          </Text>
        </HStack>
      </HeroCard>

      {latestPlan ? (
        <SectionCard
          title={t('Tu campaña')}
          subtitle={t('La decisión que guardaste')}
          action={
            <AppButton
              tone="ghost"
              size="sm"
              onPress={() =>
                router.push({ pathname: '/plan-review', params: { id: latestPlan.id } })
              }
            >
              {t('Revisar plan')}
            </AppButton>
          }
        >
          <HStack className="items-center gap-3">
            <Illustration name="success" size={56} />
            <VStack className="flex-1">
              <Text className="text-base font-semibold text-foreground">{latestPlan.name}</Text>
              <Text className="text-sm text-muted-foreground">
                {latestPlan.created_at ? formatDate(latestPlan.created_at) : t('Guardado')}
              </Text>
              {latestPlan.preferred ? (
                <Text className="text-sm text-muted-foreground">
                  {formatCropSequence(latestPlan.preferred.crop_sequence)}
                </Text>
              ) : null}
            </VStack>
          </HStack>
          <PlanReviewInline plan={latestPlan} comparisonId={comparison?.comparison_id} />
        </SectionCard>
      ) : null}

      <VStack className="gap-2">
        <Text className="text-lg font-bold text-foreground">{t('¿Qué necesitas?')}</Text>
        <HStack className="flex-wrap gap-3">
          <ToolTile
            illustration="prices"
            title={t('Precios')}
            subtitle={t('Tu precio, costo y margen')}
            onPress={() => router.push('/parcel-economics')}
            testID={testIDs.dashboardPrices}
            badge={priceLabel}
          />
          <ToolTile
            illustration="water"
            title={t('Riego')}
            subtitle={t('Lluvia y demanda de 7 días')}
            onPress={() => router.push('/parcel-irrigation')}
            testID={testIDs.dashboardIrrigation}
          />
          <ToolTile
            illustration="scenario"
            title={t('Probar un cambio')}
            subtitle={t('Menos agua o menor precio')}
            onPress={() => void handleScenario()}
            testID={testIDs.dashboardScenario}
          />
          <ToolTile
            illustration="agent"
            title={t('Preguntar')}
            subtitle={t('Respuestas con tus datos')}
            onPress={() => router.push('/agent')}
            testID={testIDs.dashboardAgent}
          />
        </HStack>
      </VStack>

      {priceRows.length > 0 ? (
        <SectionCard
          title={t('Tus precios')}
          subtitle={t('Lo que declaraste para calcular tu margen')}
          testID={testIDs.dashboardPrices}
          action={
            <AppButton tone="ghost" size="sm" onPress={() => router.push('/parcel-economics')}>
              {t('Editar')}
            </AppButton>
          }
        >
          <VStack className="gap-2">
            {priceRows.map(([cropId, value]) => (
              <HStack
                key={cropId}
                className="min-h-12 items-center gap-3 rounded-xl bg-muted/60 px-3 py-2"
              >
                <CropThumb cropId={cropId} size={36} />
                <VStack className="flex-1">
                  <Text className="text-base font-semibold text-foreground">
                    {cropMap.get(cropId)?.local_name ?? cropId}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    {value.price_pen_kg != null
                      ? `${formatMoney(value.price_pen_kg)} / kg`
                      : t('Falta precio')}
                  </Text>
                </VStack>
                <Text className="text-sm text-muted-foreground">
                  {value.yield_kg_ha != null
                    ? `${formatNumber(value.yield_kg_ha, 'kg/ha', 0)}`
                    : t('Falta rendimiento')}
                </Text>
              </HStack>
            ))}
            <AppButton tone="outline" onPress={() => router.push('/parcel-economics')}>
              {t('Completar precios')}
            </AppButton>
          </VStack>
        </SectionCard>
      ) : null}

      <SectionCard
        title={t('Tu parcela')}
        subtitle={`${parcel.name} · ${parcel.district ?? t('Moquegua')}`}
        testID={testIDs.dashboardParcel}
      >
        <HStack className="items-start gap-3">
          <Illustration name="parcel" size={64} />
          <VStack className="flex-1">
            <Text className="text-sm leading-5 text-muted-foreground">
              {parcel.area_ha ? formatNumber(parcel.area_ha, t('ha'), 2) : t('Superficie no disponible')}
              {location ? ` · ${location}` : ''}
            </Text>
            <Text className="mt-1 text-sm leading-5 text-muted-foreground">
              {t('Ficha {{progress}}% completa', { progress: fichaProgress })}
            </Text>
            <AppButton
              tone="outline"
              size="sm"
              onPress={() => router.push(fichaProgress === 100 ? '/parcel' : '/parcel-profile')}
            >
              {fichaProgress === 100 ? t('Revisar ficha') : t('Completar ficha')}
            </AppButton>
          </VStack>
        </HStack>
      </SectionCard>

      {context?.missing_inputs?.length ? (
        <AppAlert tone="warning">
          {t('Faltan datos: {{missing}}. Los números que dependen de ellos se muestran como no disponibles.', {
            missing: formatMissing(context.missing_inputs),
          })}
        </AppAlert>
      ) : null}

      {firstIndicator ? (
        <SectionCard
          title={t('Clima de tu zona')}
          subtitle={t('Datos estimados por NASA')}
          testID={testIDs.dashboardClimate}
        >
          <HStack className="gap-4">
            <MetricTile
              label={t('Lluvia')}
              value={formatNumber(firstIndicator.precip_mm, 'mm', 1)}
              tone="water"
              icon={<CloudSun size={18} color={colors.water} />}
            />
            <MetricTile
              label={t('Agua que evapora')}
              value={formatNumber(firstIndicator.eto_mm, 'mm', 1)}
              tone="primary"
              icon={<Sprout size={18} color={colors.primary} />}
            />
          </HStack>
          <Disclosure title={t('¿Qué significan estos datos?')}>
            <Text className="text-sm leading-5 text-muted-foreground">
              {t(
                'La lluvia es el agua que cae en tu zona. La ETo es el agua que el sol y el viento hacen evaporar. Son datos estimados de NASA, no una medición de tu parcela.',
              )}
            </Text>
            <AppButton tone="outline" size="sm" onPress={() => router.push('/sources')}>
              {t('Ver de dónde vienen')}
            </AppButton>
          </Disclosure>
        </SectionCard>
      ) : null}

      <Text className="text-center text-sm leading-5 text-muted-foreground">
        {t('Es una ayuda para decidir. No reemplaza la visita de un agrónomo.')}
      </Text>
    </Screen>
  );
}
