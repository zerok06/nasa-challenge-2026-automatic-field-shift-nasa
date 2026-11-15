import React from 'react';
import { router } from 'expo-router';
import { Banknote, Droplets, RotateCcw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { ActionCard } from '@/components/app/ActionCard';
import { AppAlert } from '@/components/app/AppAlert';
import { AppButton } from '@/components/app/AppButton';
import { AppHeader } from '@/components/app/AppHeader';
import { Disclosure } from '@/components/app/Disclosure';
import { HeroCard } from '@/components/app/HeroCard';
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

function deltaText(value: number | null, kind: 'money' | 'water'): string | null {
  if (value === null) return null;
  if (Math.abs(value) < 0.005) return null;
  return kind === 'money' ? formatMoney(Math.abs(value)) : formatNumber(Math.abs(value), 'mm', 0);
}

export function ScenarioScreen() {
  const { t } = useTranslation();
  const { comparison, scenario, scenarioOrigin, busy, error, simulate, resetScenario } =
    useComparison();

  if (!comparison) {
    return (
      <Screen
        edges={['top', 'bottom']}
        header={
          <AppHeader
            title={t('PROBAR UN CAMBIO')}
            subtitle={t('Antes de decidir')}
            onBack={() => router.back()}
          />
        }
      >
        <StateView
          illustration="scenario"
          title={t('Primero compara tus planes')}
          description={t('Para probar un cambio necesitamos tu plan actual.')}
          action={<AppButton onPress={() => router.push('/comparison')}>{t('Ir a comparar')}</AppButton>}
        />
      </Screen>
    );
  }

  const baseline = comparison.plans[0];
  const result = scenario?.plans[0];
  const baselineMargin = baseline?.economics.margin_pen ?? null;
  const resultMargin = result?.economics.margin_pen ?? null;
  const baselineDeficit = baseline?.water.deficit_mm ?? null;
  const resultDeficit = result?.water.deficit_mm ?? null;
  const marginDelta =
    baselineMargin !== null && resultMargin !== null ? resultMargin - baselineMargin : null;
  const deficitDelta =
    baselineDeficit !== null && resultDeficit !== null ? resultDeficit - baselineDeficit : null;

  const headline = !result
    ? t('Elige un cambio para empezar')
    : marginDelta !== null && marginDelta !== 0
      ? marginDelta > 0
        ? t('Ganarías {{value}} más', { value: deltaText(marginDelta, 'money') })
        : t('Ganarías {{value}} menos', { value: deltaText(marginDelta, 'money') })
      : deficitDelta !== null && deficitDelta !== 0
        ? deficitDelta > 0
          ? t('Te faltarían {{value}} más de agua', { value: deltaText(deficitDelta, 'water') })
          : t('Te faltarían {{value}} menos de agua', { value: deltaText(deficitDelta, 'water') })
        : t('El resultado sería muy parecido');

  return (
    <Screen
      edges={['top', 'bottom']}
      header={
        <AppHeader
          title={t('PROBAR UN CAMBIO')}
          subtitle={t('Antes de decidir')}
          onBack={() => router.back()}
        />
      }
      footer={
        <AppButton
          tone="ghost"
          onPress={() => {
            resetScenario();
            router.back();
          }}
        >
          {t('Volver a la comparación')}
        </AppButton>
      }
    >
      {error ? <AppAlert tone="error">{error}</AppAlert> : null}
      {scenarioOrigin === 'offline_estimate' ? (
        <AppAlert tone="info">
          {t('Estimación sin internet. No reemplaza el cálculo del servidor.')}
        </AppAlert>
      ) : null}

      <HeroCard
        eyebrow={t('Tu plan actual')}
        title={headline}
        description={t('El plan actual no se modifica. Esto es solo una prueba.')}
        illustration="scenario"
        testID={testIDs.scenarioResult}
      />

      <VStack className="gap-3">
        <ActionCard
          icon={Droplets}
          title={t('Tengo 20% menos agua')}
          subtitle={t('Mira si el agua te alcanza')}
          tone="water"
          onPress={() => void simulate(0.8, 1)}
          testID={testIDs.scenarioWaterPreset20}
        />
        <ActionCard
          icon={Banknote}
          title={t('El precio baja 15%')}
          subtitle={t('Mira cómo cambia tu ganancia')}
          tone="earth"
          onPress={() => void simulate(1, 0.85)}
          testID={testIDs.scenarioPricePreset15}
        />
        {scenario ? (
          <ActionCard
            icon={RotateCcw}
            title={t('Volver a mi plan')}
            subtitle={t('Quitar la prueba')}
            onPress={() => resetScenario()}
            testID={testIDs.scenarioReset}
          />
        ) : null}
      </VStack>

      {busy ? (
        <HStack className="items-center gap-2">
          <Spinner size="small" />
          <Text className="text-sm text-muted-foreground">{t('Calculando el cambio…')}</Text>
        </HStack>
      ) : null}

      {result && baseline ? (
        <SectionCard
          title={t('Resultado de la prueba')}
          subtitle={t('Comparado con tu plan actual')}
        >
          <VStack className="gap-2">
            <MetricRow
              label={t('Ganancia con tu plan actual')}
              value={formatMoney(baseline.economics.margin_pen)}
            />
            <MetricRow
              label={t('Ganancia con el cambio')}
              value={formatMoney(result.economics.margin_pen)}
              valueClassName="text-primary"
            />
            <MetricRow
              label={t('Agua que falta con el cambio')}
              value={formatNumber(result.water.deficit_mm, 'mm', 0)}
              valueClassName="text-water"
            />
          </VStack>
          <Disclosure title={t('¿Qué se recalcula?')}>
            <Text className="text-sm leading-5 text-muted-foreground">
              {t(
                'Solo cambian el agua disponible y el precio. El clima, los cultivos y el suelo se mantienen como en tu comparación.',
              )}
            </Text>
          </Disclosure>
        </SectionCard>
      ) : null}
    </Screen>
  );
}
