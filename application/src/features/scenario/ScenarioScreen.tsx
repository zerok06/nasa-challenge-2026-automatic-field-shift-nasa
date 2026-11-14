import React from 'react';
import { router } from 'expo-router';
import { FlaskConical } from 'lucide-react-native';

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
import { testIDs } from '@/design-system/testIDs';
import { formatMoney, formatNumber } from '@/lib/format';
import { useComparison } from '@/providers/ComparisonProvider';

export function ScenarioScreen() {
  const { comparison, scenario, busy, error, simulate, resetScenario } = useComparison();

  if (!comparison) {
    return (
      <Screen
        edges={['top', 'bottom']}
        header={
          <AppHeader
            title="ESCENARIOS"
            subtitle="Laboratorio de escenarios"
            onBack={() => router.back()}
          />
        }
      >
        <StateView
          icon={FlaskConical}
          title="Primero generá una comparación"
          description="El simulador necesita un baseline para comparar los cambios."
          action={<AppButton onPress={() => router.back()}>Volver</AppButton>}
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
          title="ESCENARIOS"
          subtitle="Laboratorio de escenarios"
          onBack={() => router.back()}
        />
      }
    >
      {error ? <AppAlert tone="error">{error}</AppAlert> : null}

      <SectionCard
        title="Cambiá una variable a la vez"
        subtitle="El baseline no se modifica; el resultado es hipotético."
      >
        <HStack className="flex-wrap gap-2">
          <AppButton
            testID={testIDs.scenarioWaterPreset20}
            tone="water"
            size="sm"
            isDisabled={busy}
            onPress={() => simulate(0.8, 1)}
          >
            Agua −20%
          </AppButton>
          <AppButton
            testID={testIDs.scenarioPricePreset15}
            tone="earth"
            size="sm"
            isDisabled={busy}
            onPress={() => simulate(1, 0.85)}
          >
            Precio −15%
          </AppButton>
          <AppButton
            testID={testIDs.scenarioReset}
            tone="outline"
            size="sm"
            isDisabled={busy}
            onPress={handleReset}
          >
            Restablecer
          </AppButton>
        </HStack>
        {busy ? (
          <HStack className="items-center gap-2 pt-1">
            <Spinner size="small" />
            <Text size="sm" className="text-muted-foreground">
              Recalculando escenario…
            </Text>
          </HStack>
        ) : null}
      </SectionCard>

      <AppAlert tone="info">
        Solo cambian las métricas derivadas de agua y precio. ETc, lluvia y coeficientes de cultivo
        no se recalculan en el escenario.
      </AppAlert>

      {scenario ? (
        <SectionCard
          title="Resultado simulado"
          subtitle={`Tipo: ${scenario.scenario_type}`}
          testID={testIDs.scenarioResult}
        >
          <VStack className="gap-3">
            {scenario.plans.map((plan) => (
              <VStack key={plan.plan_id} className="gap-1 rounded-xl bg-muted/60 p-3">
                <Text className="text-sm font-semibold text-foreground">{plan.label}</Text>
                <MetricRow
                  label="Déficit"
                  value={formatNumber(plan.water.deficit_mm, 'mm')}
                />
                <MetricRow
                  label="Margen"
                  value={formatMoney(plan.economics.margin_pen)}
                />
              </VStack>
            ))}
          </VStack>
        </SectionCard>
      ) : (
        <Text className="text-center text-sm text-muted-foreground">
          Elegí un preset para recalcular el escenario.
        </Text>
      )}
    </Screen>
  );
}
