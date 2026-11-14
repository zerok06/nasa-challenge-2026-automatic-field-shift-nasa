import React, { memo } from 'react';
import { router, useIsFocused } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppAlert } from '@/components/app/AppAlert';
import { AppButton } from '@/components/app/AppButton';
import { AppHeader } from '@/components/app/AppHeader';
import { MetricRow } from '@/components/app/Metric';
import { Screen } from '@/components/app/Screen';
import { SectionCard } from '@/components/app/SectionCard';
import { StateView } from '@/components/app/StateView';
import { StatusBadge } from '@/components/app/StatusBadge';
import { Card } from '@/components/ui/card';
import { Disclosure } from '@/components/app/Disclosure';
import { AndenBarChart, AndenLineChart } from '@/components/charts/AndenCharts';
import { ChartCard } from '@/components/charts/ChartCard';
import { chartColors } from '@/design-system/tokens';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { testIDs } from '@/design-system/testIDs';
import {
  formatCropSequence,
  formatFeasibility,
  formatMissing,
  formatMoney,
  formatNumber,
  formatSoilStatus,
} from '@/lib/format';
import { useComparison } from '@/providers/ComparisonProvider';
import { useParcel } from '@/providers/ParcelProvider';
import type { Plan } from '@/services/api';

const PlanCard = memo(function PlanCard({ plan, index }: { plan: Plan; index: number }) {
  const { t } = useTranslation();
  return (
    <Card
      className="gap-3 rounded-2xl border border-border bg-card p-4"
      testID={testIDs.comparisonPlan(index)}
    >
      <HStack className="items-start justify-between gap-3">
        <VStack className="flex-1 gap-1">
          <Text className="text-base font-semibold text-foreground">{t(plan.label)}</Text>
          <Text size="sm" className="text-primary">
            {formatCropSequence(plan.crop_sequence)}
          </Text>
        </VStack>
        <StatusBadge status={plan.status} />
      </HStack>

      <VStack className="gap-2">
        <MetricRow
          label={t('Riego bruto')}
          value={formatNumber(plan.water.gross_irrigation_mm, 'mm')}
        />
        <MetricRow label={t('Déficit')} value={formatNumber(plan.water.deficit_mm, 'mm')} />
        <MetricRow label={t('Factibilidad')} value={formatFeasibility(plan.water.feasibility)} />
        <MetricRow label={t('Margen')} value={formatMoney(plan.economics.margin_pen)} />
        <MetricRow label={t('Suelo')} value={formatSoilStatus(plan.soil.fertility_status)} />
      </VStack>

      {plan.missing_inputs.length > 0 ? (
        <AppAlert tone="warning">
          {t('Falta: {{missing}}', { missing: formatMissing(plan.missing_inputs) })}
        </AppAlert>
      ) : null}

      <Disclosure title={t('¿Por qué este plan?')}>
        <Text size="sm" className="text-muted-foreground">
          {plan.why_this_plan.length > 0
            ? plan.why_this_plan.join(' ')
            : t('Sin explicación adicional declarada.')}
        </Text>
      </Disclosure>
      <Disclosure title={t('Tradeoffs')}>
        <Text size="sm" className="text-muted-foreground">
          {plan.tradeoffs.length > 0
            ? plan.tradeoffs.join(' ')
            : t('Sin tradeoffs adicionales declarados.')}
        </Text>
      </Disclosure>
    </Card>
  );
});

export function ComparisonScreen() {
  const { t } = useTranslation();
  const { parcel } = useParcel();
  const { comparison, busy, error, createComparison } = useComparison();
  const isFocused = useIsFocused();

  const handleCreate = async () => {
    try {
      await createComparison();
    } catch {
      // The provider exposes the error through the alert below.
    }
  };

  return (
    <Screen
      key={`comparison-${isFocused ? 'focused' : 'blurred'}-${comparison?.comparison_id ?? 'empty'}`}
      header={
        <AppHeader
          subtitle={parcel?.name ?? t('Rotaciones')}
          isSimulated={parcel?.is_simulated}
          onSources={() => router.push('/sources')}
        />
      }
    >
      {error ? <AppAlert tone="error">{error}</AppAlert> : null}

      {!comparison ? (
        <SectionCard
          title={t('Comparador de rotaciones')}
          subtitle={t('Tres estrategias en el mismo horizonte: la actual y dos alternativas.')}
        >
          <Text className="text-sm leading-5 text-muted-foreground">
            {t(
              'El motor estima agua, suelo y margen. Si falta un dato, lo muestra como no disponible en lugar de inventarlo.',
            )}
          </Text>
          <AppButton
            testID={testIDs.comparisonCreate}
            loading={busy}
            onPress={handleCreate}
          >
            {t('Comparar ahora')}
          </AppButton>
        </SectionCard>
      ) : (
        <>
          <VStack className="gap-1">
            <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('Comparación')}
            </Text>
            <Text className="text-sm text-foreground">
              {comparison.analysis_period.start} → {comparison.analysis_period.end}
            </Text>
            <Text size="xs" className="text-muted-foreground">
              {t('Fuente: {{source}}', {
                source: comparison.source_snapshots.join(', ') || 'sin snapshot',
              })}
            </Text>
          </VStack>

          <ChartCard
            title={t('Margen por plan')}
            subtitle={t('PEN · periodo analizado')}
            summary={comparison.plans
              .map((plan) => `${plan.label}: ${formatMoney(plan.economics.margin_pen)}`)
              .join('; ')}
            columns={[t('Plan'), t('Margen')]}
            rows={comparison.plans.map((plan) => ({
              label: t(plan.label),
              values: [formatMoney(plan.economics.margin_pen)],
            }))}
            testID="comparison.chart.margin"
          >
            <AndenLineChart
              data={comparison.plans.map((plan, index) => ({
                label: index === 0 ? t('Actual') : plan.label.replace('Alternativa ', ''),
                value: plan.economics.margin_pen,
              }))}
              formatValue={(value) =>
                value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0)
              }
            />
          </ChartCard>

          <ChartCard
            title={t('Riego bruto por plan')}
            subtitle={t('mm · periodo analizado')}
            summary={comparison.plans
              .map((plan) => `${plan.label}: ${formatNumber(plan.water.gross_irrigation_mm, 'mm')}`)
              .join('; ')}
            columns={[t('Plan'), t('Riego bruto')]}
            rows={comparison.plans.map((plan) => ({
              label: t(plan.label),
              values: [formatNumber(plan.water.gross_irrigation_mm, 'mm')],
            }))}
            testID="comparison.chart.water"
          >
            <AndenBarChart
              data={comparison.plans.map((plan, index) => ({
                label: index === 0 ? t('Actual') : plan.label.replace('Alternativa ', ''),
                value: plan.water.gross_irrigation_mm,
                color:
                  index === 0
                    ? chartColors.primary
                    : index === 1
                      ? chartColors.secondary
                      : chartColors.tertiary,
              }))}
              formatValue={(value) => `${Math.round(value)}`}
            />
          </ChartCard>

          {comparison.plans.map((plan, index) => (
            <PlanCard key={plan.plan_id} plan={plan} index={index} />
          ))}

          <Text className="text-xs leading-4 text-muted-foreground">{comparison.disclaimer}</Text>

          <AppButton
            testID={testIDs.comparisonSimulate}
            tone="water"
            onPress={() => router.push('/scenario')}
          >
            {t('Simular cambios')}
          </AppButton>
        </>
      )}

      {!comparison && busy ? (
        <StateView
          loading
          title={t('Generando comparación')}
          description={t('El motor está calculando los planes.')}
        />
      ) : null}
    </Screen>
  );
}
