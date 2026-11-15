import React from 'react';
import { router } from 'expo-router';
import { ClipboardList, Coins, Droplets, FileText, Settings } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { ActionCard } from '@/components/app/ActionCard';
import { AppAlert } from '@/components/app/AppAlert';
import { AppButton } from '@/components/app/AppButton';
import { AppHeader } from '@/components/app/AppHeader';
import { MetricRow } from '@/components/app/Metric';
import { Screen } from '@/components/app/Screen';
import { SectionCard } from '@/components/app/SectionCard';
import { StatusBadge } from '@/components/app/StatusBadge';
import { Illustration } from '@/components/illustrations/Illustration';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { testIDs } from '@/design-system/testIDs';
import { formatCompleteness, formatDate, formatMissing, formatNumber } from '@/lib/format';
import { useOffline } from '@/providers/OfflineProvider';
import { useParcel } from '@/providers/ParcelProvider';
import { getSavedPlans, type Parcel } from '@/services/api';
import { BundleCard } from '@/features/parcel/BundleCard';
import { profileProgress } from '@/features/parcel/profileStatus';

function locationLabel(parcel: Parcel): string {
  const geometry = parcel.geometry;
  const coordinates = geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return '';
  if (geometry.type === 'Point') {
    return `${Number(coordinates[1]).toFixed(4)}, ${Number(coordinates[0]).toFixed(4)}`;
  }
  if (geometry.type === 'Polygon' && Array.isArray(coordinates[0])) {
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

export function ParcelScreen() {
  const { t } = useTranslation();
  const { online, bundle } = useOffline();
  const { parcel, context, loading, error, refresh } = useParcel();

  const savedPlans = useQuery({
    queryKey: ['saved-plans', parcel?.id],
    queryFn: getSavedPlans,
    enabled: Boolean(parcel),
  });

  if (!parcel) {
    return (
      <Screen header={<AppHeader subtitle={t('Mi parcela')} />}>
        <AppAlert tone="info">
          {t('Todavía no tienes una parcela. Crea la primera para empezar.')}
        </AppAlert>
        <AppButton onPress={() => router.push('/parcel-new')}>{t('Crear mi parcela')}</AppButton>
      </Screen>
    );
  }

  const missing = context?.missing_inputs ?? [];
  const fichaProgress = profileProgress(parcel, context);
  const location = locationLabel(parcel);
  const parcelPlans = (savedPlans.data ?? [])
    .filter((plan) => plan.parcel_id === parcel.id)
    .slice(0, 5);

  return (
    <Screen
      header={
        <AppHeader
          subtitle={t('Mi parcela')}
          onSettings={() => router.push('/settings')}
        />
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

      <SectionCard
        title={parcel.name}
        subtitle={parcel.district ?? t('Moquegua')}
        testID={testIDs.parcelSummary}
      >
        <Illustration name="parcel" size={64} />
        <MetricRow
          label={t('Superficie')}
          value={parcel.area_ha ? formatNumber(parcel.area_ha, t('ha'), 2) : t('No disponible')}
        />
        <MetricRow label={t('Distrito')} value={parcel.district ?? t('No disponible')} />
        <MetricRow label={t('Ubicación')} value={location || t('No disponible')} />
      </SectionCard>

      <ActionCard
        icon={ClipboardList}
        title={fichaProgress === 100 ? t('Ficha completa') : t('Ficha de parcela')}
        subtitle={
          fichaProgress === 100
            ? t('Revisa o actualiza tu historial, agua y prioridades')
            : t('Completa historial, agua, suelo y prioridades')
        }
        badge={`${fichaProgress}%`}
        onPress={() => router.push('/parcel-profile')}
        testID={testIDs.parcelProfile}
      />

      <ActionCard
        icon={Coins}
        illustration="prices"
        title={t('Precios y costos')}
        subtitle={t('Para calcular tu margen real, no un supuesto')}
        tone="earth"
        onPress={() => router.push('/parcel-economics')}
      />

      <ActionCard
        icon={Droplets}
        illustration="water"
        title={t('Riego de la semana')}
        subtitle={t('Lluvia, demanda y pendiente con datos reales')}
        tone="water"
        onPress={() => router.push('/parcel-irrigation')}
        testID={testIDs.parcelIrrigation}
      />

      <SectionCard
        title={t('Datos para decidir')}
        subtitle={t('Mientras más completos, mejores tus números')}
        testID={testIDs.parcelData}
      >
        <MetricRow
          label={t('Datos para comparar')}
          value={formatCompleteness(context?.completeness.comparison)}
        />
        <MetricRow label={t('Agua')} value={formatCompleteness(context?.completeness.water)} />
        <MetricRow label={t('Ganancia')} value={formatCompleteness(context?.completeness.margin)} />
        {missing.length > 0 ? (
          <AppAlert tone="warning">
            {t('Falta: {{missing}}', { missing: formatMissing(missing) })}
          </AppAlert>
        ) : (
          <Text className="text-sm leading-5 text-muted-foreground">
            {t('Ya tienes lo necesario para comparar tus planes.')}
          </Text>
        )}
        <Text className="text-sm leading-5 text-muted-foreground">
          {t('Aún no declaraste precios y costos. Ingrésalos para calcular tu margen real.')}
        </Text>
        <AppButton tone="outline" loading={loading} onPress={() => void refresh()}>
          {t('Actualizar datos')}
        </AppButton>
      </SectionCard>

      <BundleCard />

      <SectionCard
        title={t('Mis planes guardados')}
        subtitle={t('Los planes que decidiste guardar')}
        testID={testIDs.parcelSavedPlans}
      >
        {savedPlans.isLoading ? (
          <Text className="text-sm text-muted-foreground">{t('Cargando planes…')}</Text>
        ) : parcelPlans.length > 0 ? (
          <VStack className="gap-2">
            {parcelPlans.map((plan) => (
              <HStack
                key={plan.id}
                className="items-center justify-between gap-2 rounded-xl bg-muted/60 p-3"
              >
                <VStack className="flex-1">
                  <Text className="text-base font-semibold text-foreground">{plan.name}</Text>
                  {plan.created_at ? (
                    <Text className="text-sm text-muted-foreground">
                      {formatDate(plan.created_at)}
                    </Text>
                  ) : null}
                </VStack>
                <StatusBadge status={plan.status} />
              </HStack>
            ))}
          </VStack>
        ) : (
          <>
            <Text className="text-sm leading-5 text-muted-foreground">
              {t('Todavía no guardaste ningún plan. Compara y guarda el que más te sirva.')}
            </Text>
            <AppButton onPress={() => router.push('/comparison')}>
              {t('Comparar y guardar')}
            </AppButton>
          </>
        )}
      </SectionCard>

      <VStack className="gap-3">
        <ActionCard
          icon={FileText}
          title={t('Fuentes y límites')}
          subtitle={t('De dónde vienen los datos y qué no podemos afirmar')}
          tone="water"
          onPress={() => router.push('/sources')}
          testID={testIDs.parcelSources}
        />
        <ActionCard
          icon={Settings}
          title={t('Ajustes')}
          subtitle={t('Idioma, tema, accesibilidad y Acerca de Anden')}
          onPress={() => router.push('/settings')}
          testID={testIDs.parcelSettings}
        />
      </VStack>

      <Text className="text-center text-sm leading-5 text-muted-foreground">
        {t('Anden · piloto Moquegua · app gratuita')}
      </Text>
    </Screen>
  );
}
