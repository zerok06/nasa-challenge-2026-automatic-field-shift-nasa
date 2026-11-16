import React from 'react';
import { router } from 'expo-router';
import { Mountain } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { AppAlert } from '@/components/app/AppAlert';
import { AppButton } from '@/components/app/AppButton';
import { AppHeader } from '@/components/app/AppHeader';
import { MetricRow } from '@/components/app/Metric';
import { Screen } from '@/components/app/Screen';
import { Illustration } from '@/components/illustrations/Illustration';
import { SectionCard } from '@/components/app/SectionCard';
import { StateView } from '@/components/app/StateView';
import { AndenBarChart } from '@/components/charts/AndenCharts';
import { ChartCard } from '@/components/charts/ChartCard';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { colors } from '@/design-system/tokens';
import { testIDs } from '@/design-system/testIDs';
import { formatDate, formatNumber } from '@/lib/format';
import { useParcel } from '@/providers/ParcelProvider';
import { getIrrigation, type Irrigation } from '@/services/api';

function adviceText(irrigation: Irrigation, t: TFunction) {
  const demand = irrigation.totals.net_demand_mm;
  return irrigation.advice.map((code) => {
    switch (code) {
      case 'irrigation_needed':
        return t('Para los próximos 7 días, la lluvia no cubre la demanda de referencia. Repón alrededor de {{mm}} mm.', {
          mm: formatNumber(demand, '', 1),
        });
      case 'rain_covers':
        return t('La lluvia esperada cubre la demanda de referencia de esta semana.');
      case 'water_unknown':
        return t('No sabemos cuánta agua tienes disponible. Puedes completarlo en tu ficha.');
      case 'terrain_unavailable':
        return t('No pudimos obtener la elevación. El pronóstico y el agua siguen disponibles.');
      case 'forecast_incomplete':
        return t('Faltan algunos días del pronóstico; el total es parcial.');
      default:
        return null;
    }
  }).filter((value): value is string => Boolean(value));
}

function waterStatusText(status: Irrigation['water_status'], t: TFunction) {
  switch (status) {
    case 'rain_covers':
      return t('La lluvia alcanza');
    case 'water_sufficient':
      return t('Tu agua declarada alcanza para la semana');
    case 'water_tight':
      return t('Tu agua está ajustada');
    case 'water_insufficient':
      return t('Tu agua no alcanza para la semana');
    case 'water_unknown':
      return t('No sabemos tu agua');
    default:
      return t('No disponible');
  }
}

function slopeText(slope: Irrigation['terrain'], t: TFunction) {
  if (!slope) return t('No disponible');
  switch (slope.slope_class) {
    case 'flat':
      return t('Plano');
    case 'gentle':
      return t('Suave');
    case 'moderate':
      return t('Moderado');
    case 'steep':
      return t('Fuerte');
    default:
      return t('No disponible');
  }
}

export function ParcelIrrigationScreen() {
  const { t } = useTranslation();
  const { parcel } = useParcel();
  const irrigation = useQuery({
    queryKey: ['irrigation', parcel?.id],
    queryFn: () => getIrrigation(parcel!.id),
    enabled: Boolean(parcel),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  if (!parcel) {
    return (
      <Screen header={<AppHeader subtitle={t('Riego de la semana')} onBack={() => router.back()} />}>
        <AppAlert tone="info">{t('Primero crea una parcela.')}</AppAlert>
        <AppButton onPress={() => router.push('/parcel-new')}>{t('Crear mi parcela')}</AppButton>
      </Screen>
    );
  }

  if (irrigation.isLoading) {
    return (
      <Screen header={<AppHeader subtitle={t('Riego de la semana')} onBack={() => router.back()} />}>
        <StateView
          loading
          title={t('Leyendo el pronóstico')}
          description={t('Consultando Open-Meteo y la elevación de tu parcela.')}
          testID={testIDs.parcelIrrigation}
        />
      </Screen>
    );
  }

  if (irrigation.isError || !irrigation.data) {
    return (
      <Screen header={<AppHeader subtitle={t('Riego de la semana')} onBack={() => router.back()} />}>
        <AppAlert tone="error">
          {irrigation.error instanceof Error && irrigation.error.message
            ? irrigation.error.message
            : t('No pudimos leer el pronóstico. Revisa la conexión e intenta de nuevo.')}
        </AppAlert>
        <Text className="text-sm leading-5 text-muted-foreground">
          {t('El pronóstico semanal usa Open-Meteo. NASA POWER aporta datos históricos en otras consultas.')}
        </Text>
        <AppButton
          onPress={() => void irrigation.refetch()}
          testID={testIDs.parcelIrrigation}
        >
          {t('Reintentar')}
        </AppButton>
      </Screen>
    );
  }

  const data = irrigation.data;
  const waterAdvice = adviceText(data, t);
  const source = data.terrain?.provider ?? t('Sin elevación');

  return (
    <Screen header={<AppHeader subtitle={t('Riego de la semana')} onBack={() => router.back()} />}>
      <SectionCard
        title={t('Próximos 7 días')}
        subtitle={t('Una estimación con datos reales, no una receta')}
        testID={testIDs.irrigationSummary}
      >
        <Illustration name="water" size={72} />
        <MetricRow label={t('Lluvia esperada')} value={formatNumber(data.totals.precip_mm, 'mm', 1)} />
        <MetricRow label={t('ETo de referencia')} value={formatNumber(data.totals.et0_mm, 'mm', 1)} />
        <MetricRow
          label={t('Demanda neta estimada')}
          value={formatNumber(data.totals.net_demand_mm, 'mm', 1)}
        />
        <MetricRow
          label={t('Agua declarada')}
          value={formatNumber(data.water?.available_mm, 'mm', 1)}
        />
        <Text className="text-base font-semibold text-foreground">
          {waterStatusText(data.water_status, t)}
        </Text>
        {waterAdvice.map((text) => (
          <Text key={text} className="text-sm leading-5 text-muted-foreground">
            {text}
          </Text>
        ))}
        {data.water_status === 'water_unknown' ? (
          <AppButton tone="outline" onPress={() => router.push('/parcel-profile')}>
            {t('Completar agua en mi ficha')}
          </AppButton>
        ) : null}
      </SectionCard>

      <ChartCard
        title={t('Día por día')}
        subtitle={t('Lluvia, ETo y demanda neta')}
        summary={t('Gráfico de barras de demanda neta diaria en milímetros.')}
        columns={[t('Día'), t('Lluvia'), t('ETo'), t('Demanda')]}
        rows={data.forecast.map((day) => ({
          label: formatDate(day.date),
          values: [
            formatNumber(day.precip_mm, 'mm', 1),
            formatNumber(day.et0_mm, 'mm', 1),
            formatNumber(day.net_demand_mm, 'mm', 1),
          ],
        }))}
        testID={testIDs.irrigationChart}
      >
        <AndenBarChart
          data={data.forecast.map((day) => ({
            label: formatDate(day.date),
            value: day.net_demand_mm,
          }))}
          formatValue={(value) => formatNumber(value, 'mm', 1)}
        />
      </ChartCard>

      <SectionCard
        title={t('Tu terreno')}
        subtitle={t('Elevación y pendiente desde SRTM')}
        testID={testIDs.irrigationTerrain}
      >
        {data.terrain ? (
          <>
            <MetricRow
              label={t('Elevación')}
              value={formatNumber(data.terrain.elevation_m, 'm', 0)}
            />
            <MetricRow
              label={t('Pendiente del terreno')}
              value={`${formatNumber(data.terrain.slope_pct, '%', 1)} · ${slopeText(data.terrain, t)}`}
            />
            <MetricRow label={t('Fuente')} value={data.terrain.provider} />
            <MetricRow
              label={t('Resolución')}
              value={data.terrain.resolution}
            />
          </>
        ) : (
          <VStack className="gap-2">
            <Mountain size={28} color={colors.primary} />
            <Text className="text-sm leading-5 text-muted-foreground">
              {t('No pudimos obtener la elevación de esta parcela. No la inventamos.')}
            </Text>
          </VStack>
        )}
      </SectionCard>

      <SectionCard title={t('Agua y fuentes')} testID={testIDs.irrigationWater}>
        <MetricRow label={t('Fuente del pronóstico')} value={data.forecast_source.provider} />
        <MetricRow label={t('Conjunto')} value={data.forecast_source.dataset} />
        <MetricRow label={t('Elevación')} value={source} />
        <Text className="text-sm leading-5 text-muted-foreground">
          {t(
            'La ETo es de referencia y no incluye el coeficiente de tu cultivo. Usamos 80% de la lluvia como efectiva. No es una recomendación agronómica validada.',
          )}
        </Text>
        <Text className="text-sm leading-5 text-muted-foreground">
          {t('El pronóstico semanal usa Open-Meteo. NASA POWER aporta datos históricos en otras consultas.')}
        </Text>
        {data.warnings.includes('terrain_unavailable') ? (
          <Text className="text-sm leading-5 text-muted-foreground">
            {t('La elevación no estuvo disponible; el resto del cálculo sí.')}
          </Text>
        ) : null}
        <AppButton tone="outline" onPress={() => router.push('/sources')}>
          {t('Ver fuentes y límites')}
        </AppButton>
      </SectionCard>

      <Text className="text-center text-sm leading-5 text-muted-foreground">
        {t('Anden · piloto Moquegua · datos abiertos')}
      </Text>
    </Screen>
  );
}
