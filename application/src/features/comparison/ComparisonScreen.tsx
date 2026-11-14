import React, { memo } from 'react';
import { router, useIsFocused } from 'expo-router';

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
  return (
    <Card
      className="gap-3 rounded-2xl border border-border bg-card p-4"
      testID={testIDs.comparisonPlan(index)}
    >
      <HStack className="items-start justify-between gap-3">
        <VStack className="flex-1 gap-1">
          <Text className="text-base font-semibold text-foreground">{plan.label}</Text>
          <Text size="sm" className="text-primary">
            {formatCropSequence(plan.crop_sequence)}
          </Text>
        </VStack>
        <StatusBadge status={plan.status} />
      </HStack>

      <VStack className="gap-2">
        <MetricRow label="Riego bruto" value={formatNumber(plan.water.gross_irrigation_mm, 'mm')} />
        <MetricRow label="Déficit" value={formatNumber(plan.water.deficit_mm, 'mm')} />
        <MetricRow label="Factibilidad" value={formatFeasibility(plan.water.feasibility)} />
        <MetricRow label="Margen" value={formatMoney(plan.economics.margin_pen)} />
        <MetricRow label="Suelo" value={formatSoilStatus(plan.soil.fertility_status)} />
      </VStack>

      {plan.missing_inputs.length > 0 ? (
        <AppAlert tone="warning">Falta: {formatMissing(plan.missing_inputs)}</AppAlert>
      ) : null}

      <Disclosure title="¿Por qué este plan?">
        <Text size="sm" className="text-muted-foreground">
          {plan.why_this_plan.length > 0
            ? plan.why_this_plan.join(' ')
            : 'Sin explicación adicional declarada.'}
        </Text>
      </Disclosure>
      <Disclosure title="Tradeoffs">
        <Text size="sm" className="text-muted-foreground">
          {plan.tradeoffs.length > 0
            ? plan.tradeoffs.join(' ')
            : 'Sin tradeoffs adicionales declarados.'}
        </Text>
      </Disclosure>
    </Card>
  );
});

export function ComparisonScreen() {
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
          subtitle={parcel?.name ?? 'Rotaciones'}
          isSimulated={parcel?.is_simulated}
          onSources={() => router.push('/sources')}
        />
      }
    >
      {error ? <AppAlert tone="error">{error}</AppAlert> : null}

      {!comparison ? (
        <SectionCard
          title="Comparador de rotaciones"
          subtitle="Tres estrategias en el mismo horizonte: la actual y dos alternativas."
        >
          <Text className="text-sm leading-5 text-muted-foreground">
            El motor estima agua, suelo y margen. Si falta un dato, lo muestra como no disponible
            en lugar de inventarlo.
          </Text>
          <AppButton
            testID={testIDs.comparisonCreate}
            loading={busy}
            onPress={handleCreate}
          >
            Comparar ahora
          </AppButton>
        </SectionCard>
      ) : (
        <>
          <VStack className="gap-1">
            <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Comparación
            </Text>
            <Text className="text-sm text-foreground">
              {comparison.analysis_period.start} → {comparison.analysis_period.end}
            </Text>
            <Text size="xs" className="text-muted-foreground">
              Fuente: {comparison.source_snapshots.join(', ') || 'sin snapshot'}
            </Text>
          </VStack>

          {comparison.plans.map((plan, index) => (
            <PlanCard key={plan.plan_id} plan={plan} index={index} />
          ))}

          <Text className="text-xs leading-4 text-muted-foreground">{comparison.disclaimer}</Text>

          <AppButton
            testID={testIDs.comparisonSimulate}
            tone="water"
            onPress={() => router.push('/scenario')}
          >
            Simular cambios
          </AppButton>
        </>
      )}

      {!comparison && busy ? (
        <StateView loading title="Generando comparación" description="El motor está calculando los planes." />
      ) : null}
    </Screen>
  );
}
