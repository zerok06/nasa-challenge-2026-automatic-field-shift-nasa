import React from 'react';
import { router } from 'expo-router';
import { FlaskConical } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { AppAlert } from '@/components/app/AppAlert';
import { AppButton } from '@/components/app/AppButton';
import { AppHeader } from '@/components/app/AppHeader';
import { MetricRow } from '@/components/app/Metric';
import { Screen } from '@/components/app/Screen';
import { SectionCard } from '@/components/app/SectionCard';
import { StateView } from '@/components/app/StateView';
import { HStack } from '@/components/ui/hstack';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { AndenBarChart } from '@/components/charts/AndenCharts';
import { ChartCard } from '@/components/charts/ChartCard';
import { chartColors } from '@/design-system/tokens';
import { testIDs } from '@/design-system/testIDs';
import { formatMoney, formatNumber } from '@/lib/format';
import { useComparison } from '@/providers/ComparisonProvider';

export function ScenarioScreen() {
  const { t } = useTranslation();
  const { comparison, scenario, busy, error, simulate, resetScenario } = useComparison();

  if (!comparison) {
    return (
      <Screen
        edges={['top', 'bottom']}
        header={
          <AppHeader
            title={t('ESCENARIOS')}
            subtitle={t('Laboratorio de escenarios')}
            onBack={() => router.back()}
          />
        }
      >
        <StateView
          icon={FlaskConical}
          title={t('Primero generá una comparación')}
          description={t('El simulador necesita un baseline para comparar los cambios.')}
          action={<AppButton onPress={() => router.back()}>{t('Volver')}</AppButton>}
        />
      </Screen>
    );
  }

  const handleReset = () => {
    resetScenario();
    router.back();
  };

  return (
    <Screen
      edges={['top', 'bottom']}
      header={
        <AppHeader
          title={t('ESCENARIOS')}
          subtitle={t('Laboratorio de escenarios')}
          onBack={() => router.back()}
        />
      }
    >
      {error ? <AppAlert tone="error">{error}</AppAlert> : null}

      <SectionCard
        title={t('Cambiá una variable a la vez')}
        subtitle={t('El baseline no se modifica; el resultado es hipotético.')}
      >
        <HStack className="flex-wrap gap-2">
          <AppButton
            testID={testIDs.scenarioWaterPreset20}
            tone="water"
            size="sm"
            isDisabled={busy}
            onPress={() => simulate(0.8, 1)}
          >
            {t('Agua −20%')}
          </AppButton>
          <AppButton
            testID={testIDs.scenarioPricePreset15}
            tone="earth"
            size="sm"
            isDisabled={busy}
            onPress={() => simulate(1, 0.85)}
          >
            {t('Precio −15%')}
          </AppButton>
          <AppButton
            testID={testIDs.scenarioReset}
            tone="outline"
            size="sm"
            isDisabled={busy}
            onPress={handleReset}
          >
            {t('Restablecer')}
          </AppButton>
        </HStack>
        {busy ? (
          <HStack className="items-center gap-2 pt-1">
            <Spinner size="small" />
            <Text size="sm" className="text-muted-foreground">
              {t('Recalculando escenario…')}
            </Text>
          </HStack>
        ) : null}
      </SectionCard>

      <AppAlert tone="info">
        {t(
          'Solo cambian las métricas derivadas de agua y precio. ETc, lluvia y coeficientes de cultivo no se recalculan en el escenario.',
        )}
      </AppAlert>

      {scenario ? (
        <>
          <ChartCard
            title={t('Margen baseline vs escenario')}
            subtitle={scenario.plans[0] ? t(scenario.plans[0].label) : t('Plan comparado')}
            summary={`Baseline ${formatMoney(
              comparison.plans[0]?.economics.margin_pen ?? null,
            )}; escenario ${formatMoney(scenario.plans[0]?.economics.margin_pen ?? null)}.`}
            columns={[t('Escenario'), t('Margen')]}
            rows={[
              {
                label: t('Baseline'),
                values: [formatMoney(comparison.plans[0]?.economics.margin_pen ?? null)],
              },
              {
                label: t('Escenario'),
                values: [formatMoney(scenario.plans[0]?.economics.margin_pen ?? null)],
              },
            ]}
            testID="scenario.chart.margin"
          >
            <AndenBarChart
              data={[
                {
                  label: t('Baseline'),
                  value: comparison.plans[0]?.economics.margin_pen ?? null,
                  color: chartColors.primary,
                },
                {
                  label: t('Escenario'),
                  value: scenario.plans[0]?.economics.margin_pen ?? null,
                  color: chartColors.water,
                },
              ]}
              formatValue={(value) =>
                value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0)
              }
            />
          </ChartCard>

          <SectionCard
            title={t('Resultado simulado')}
            subtitle={t('Tipo: {{type}}', { type: scenario.scenario_type })}
            testID={testIDs.scenarioResult}
          >
            <VStack className="gap-3">
              {scenario.plans.map((plan) => (
                <VStack key={plan.plan_id} className="gap-1 rounded-xl bg-muted/60 p-3">
                  <Text className="text-sm font-semibold text-foreground">{t(plan.label)}</Text>
                  <MetricRow
                    label={t('Déficit')}
                    value={formatNumber(plan.water.deficit_mm, 'mm')}
                  />
                  <MetricRow
                    label={t('Margen')}
                    value={formatMoney(plan.economics.margin_pen)}
                  />
                </VStack>
              ))}
            </VStack>
          </SectionCard>
        </>
      ) : (
        <Text className="text-center text-sm text-muted-foreground">
          {t('Elegí un preset para recalcular el escenario.')}
        </Text>
      )}
    </Screen>
  );
}
