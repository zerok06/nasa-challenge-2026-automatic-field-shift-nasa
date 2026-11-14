import React from 'react';
import { RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { MapPinOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { AppAlert } from '@/components/app/AppAlert';
import { AppButton } from '@/components/app/AppButton';
import { AppHeader } from '@/components/app/AppHeader';
import { MetricRow } from '@/components/app/Metric';
import { Screen } from '@/components/app/Screen';
import { AndenBarChart, AndenLineChart } from '@/components/charts/AndenCharts';
import { ChartCard } from '@/components/charts/ChartCard';
import { SectionCard } from '@/components/app/SectionCard';
import { StateView } from '@/components/app/StateView';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { formatMissing, formatNumber } from '@/lib/format';
import { chartColors, colors } from '@/design-system/tokens';
import { testIDs } from '@/design-system/testIDs';
import { useComparison } from '@/providers/ComparisonProvider';
import { useParcel } from '@/providers/ParcelProvider';

function completenessValue(value?: string): number {
  if (value === 'ready') return 100;
  if (value === 'partial') return 60;
  return 30;
}

export function DashboardScreen() {
  const { t } = useTranslation();
  const { parcel, context, indicators, loading, error, refresh } = useParcel();
  const { createComparison, busy } = useComparison();

  if (!parcel && loading) {
    return (
      <Screen header={<AppHeader subtitle={t('Copiloto de planificación agrícola')} />}>
        <StateView
          loading
          title={t('Cargando parcela')}
          description={t('Leyendo contexto y datos NASA.')}
        />
      </Screen>
    );
  }

  if (!parcel) {
    return (
      <Screen header={<AppHeader subtitle={t('Copiloto de planificación agrícola')} />}>
        <StateView
          icon={MapPinOff}
          title={t('No hay una parcela activa')}
          description={t('Creá una parcela o cargá la demo para empezar.')}
          action={
            <AppButton onPress={() => router.replace('/onboarding')}>{t('Ir al inicio')}</AppButton>
          }
        />
      </Screen>
    );
  }

  const indicatorList = indicators?.indicators ?? [];
  const firstIndicator = indicatorList[0];
  const completeness = completenessValue(context?.completeness.comparison);

  const handleCompare = async () => {
    try {
      await createComparison();
      router.push('/comparison');
    } catch {
      // The provider exposes the error through the alert below.
    }
  };

  return (
    <Screen
      header={
        <AppHeader
          subtitle={parcel.name}
          isSimulated={parcel.is_simulated}
          onSources={() => router.push('/sources')}
          onSettings={() => router.push('/settings')}
        />
      }
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />
      }
    >
      {error ? <AppAlert tone="error">{error}</AppAlert> : null}

      <SectionCard
        title={t('Ficha de parcela')}
        subtitle={t('Lo que sabemos y lo que falta')}
        testID="dashboard.plotCard"
      >
        <VStack className="gap-2">
          <MetricRow
            label={t('Superficie')}
            value={parcel.area_ha ? `${parcel.area_ha} ha` : t('No disponible')}
          />
          <MetricRow label={t('Distrito')} value={parcel.district ?? t('No disponible')} />
          <MetricRow
            label={t('Comparación')}
            value={context?.completeness.comparison ?? t('Sin datos')}
          />
          <MetricRow label={t('Agua')} value={context?.completeness.water ?? t('Sin datos')} />
        </VStack>
        <VStack className="gap-1 pt-1">
          <Text size="xs" className="text-muted-foreground">
            {t('Completitud del análisis')}
          </Text>
          <Progress value={completeness}>
            <ProgressFilledTrack className="bg-primary" />
          </Progress>
        </VStack>
        {context?.missing_inputs?.length ? (
          <AppAlert tone="warning">
            {t('Falta: {{missing}}', { missing: formatMissing(context.missing_inputs) })}.{' '}
            {t('Los resultados se muestran como no disponibles hasta completar esos datos.')}
          </AppAlert>
        ) : null}
      </SectionCard>

      <SectionCard
        title={t('Contexto NASA')}
        subtitle={t('NASA POWER · datos modelados de reanálisis')}
      >
        <VStack className="gap-2">
          <MetricRow label={t('Lluvia')} value={formatNumber(firstIndicator?.precip_mm, 'mm')} />
          <MetricRow label="Tmin" value={formatNumber(firstIndicator?.tmin_c, '°C')} />
          <MetricRow label="Tmax" value={formatNumber(firstIndicator?.tmax_c, '°C')} />
          <MetricRow label="ETo" value={formatNumber(firstIndicator?.eto_mm, 'mm')} />
        </VStack>
        <Text size="xs" className="text-muted-foreground">
          {indicators?.source?.source ?? 'NASA POWER'} ·{' '}
          {indicators?.source?.resolution ?? 'resolución no disponible'} ·{' '}
          {indicators?.source?.quality_flag ?? 'calidad no declarada'}
        </Text>
        <AppButton tone="outline" onPress={() => router.push('/sources')}>
          {t('Ver ficha de fuentes')}
        </AppButton>
      </SectionCard>

      {firstIndicator ? (
        <ChartCard
          title={t('Lluvia y ETo')}
          subtitle={t('NASA POWER · periodo analizado')}
          summary={`${t('Lluvia')} ${formatNumber(firstIndicator.precip_mm, 'mm')}; ETo ${formatNumber(
            firstIndicator.eto_mm,
            'mm',
          )}.`}
          columns={[t('Indicador'), 'mm']}
          rows={[
            { label: t('Lluvia'), values: [formatNumber(firstIndicator.precip_mm, 'mm')] },
            { label: 'ETo', values: [formatNumber(firstIndicator.eto_mm, 'mm')] },
          ]}
          testID="dashboard.chart.climate"
        >
          <AndenBarChart
            data={[
              {
                label: t('Lluvia'),
                value: firstIndicator.precip_mm,
                color: chartColors.water,
              },
              { label: 'ETo', value: firstIndicator.eto_mm, color: chartColors.primary },
            ]}
            formatValue={(value) => `${value.toFixed(1)}`}
          />
        </ChartCard>
      ) : null}

      {indicatorList.length > 1 ? (
        <ChartCard
          title={t('Tendencia mensual')}
          subtitle={t('Lluvia y ETo por mes')}
          summary={`${t('Serie de {{count}} meses de lluvia y ETo.', { count: indicatorList.length })}`}
          columns={[t('Mes'), t('Lluvia'), 'ETo']}
          rows={indicatorList.map((indicator) => ({
            label: indicator.month,
            values: [
              formatNumber(indicator.precip_mm, 'mm'),
              formatNumber(indicator.eto_mm, 'mm'),
            ],
          }))}
          testID="dashboard.chart.trend"
        >
          <AndenLineChart
            data={indicatorList.map((indicator) => ({
              label: indicator.month.slice(5),
              value: indicator.eto_mm,
            }))}
            formatValue={(value) => `${value.toFixed(0)}`}
          />
        </ChartCard>
      ) : null}

      <SectionCard title={t('¿Qué querés hacer ahora?')} subtitle={t('Tres caminos, una sola parcela')}>
        <AppButton
          testID={testIDs.dashboardCompare}
          loading={busy}
          onPress={handleCompare}
        >
          {t('Comparar rotaciones')}
        </AppButton>
        <AppButton
          testID={testIDs.dashboardMap}
          tone="water"
          onPress={() => router.push('/map')}
        >
          {t('Ver mapa')}
        </AppButton>
        <AppButton
          testID={testIDs.dashboardAgent}
          tone="earth"
          onPress={() => router.push('/agent')}
        >
          {t('Hablar con el agente')}
        </AppButton>
      </SectionCard>

      <Text className="text-center text-[10px] text-muted-foreground">
        {t(
          'Comparación de apoyo a decisiones bajo supuestos. No es una recomendación agronómica validada.',
        )}
      </Text>
    </Screen>
  );
}
