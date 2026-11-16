import React, { memo, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppAlert } from '@/components/app/AppAlert';
import { AppButton } from '@/components/app/AppButton';
import { AppHeader } from '@/components/app/AppHeader';
import { Disclosure } from '@/components/app/Disclosure';
import { HeroCard } from '@/components/app/HeroCard';
import { MetricRow, MetricTile } from '@/components/app/Metric';
import { Screen } from '@/components/app/Screen';
import { SectionCard } from '@/components/app/SectionCard';
import { StateView } from '@/components/app/StateView';
import { StatusBadge } from '@/components/app/StatusBadge';
import { AndenBarChart, useChartPalette } from '@/components/charts/AndenCharts';
import { ChartCard } from '@/components/charts/ChartCard';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { testIDs } from '@/design-system/testIDs';
import { PlanSelector } from '@/features/comparison/PlanSelector';
import {
  formatCropSequence,
  formatDate,
  formatFeasibility,
  formatMissing,
  formatMoney,
  formatNumber,
} from '@/lib/format';
import { useAgentSheet } from '@/providers/AgentSheetProvider';
import { useComparison } from '@/providers/ComparisonProvider';
import { useOffline } from '@/providers/OfflineProvider';
import { useParcel } from '@/providers/ParcelProvider';
import { sendFeedback, type Plan } from '@/services/api';
import { clearPendingFeedback, enqueueFeedback, loadPendingFeedback } from '@/offline/feedback';

function FeedbackPrompt({ parcelId, online }: { parcelId: string; online: boolean }) {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const [queued, setQueued] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!online) return;
    let mounted = true;
    void (async () => {
      const pending = await loadPendingFeedback();
      if (!mounted || pending.length === 0) return;
      try {
        for (const item of pending) {
          await sendFeedback({
            parcelId: item.parcelId,
            kind: item.kind,
            rating: item.rating,
            comment: item.comment,
            context: item.context,
          });
        }
        await clearPendingFeedback();
      } catch {
        // Keep the queue for the next online window.
      }
    })();
    return () => {
      mounted = false;
    };
  }, [online]);

  const submit = async (rating: number) => {
    if (busy) return;
    setBusy(true);
    try {
      if (!online) {
        await enqueueFeedback({
          parcelId,
          kind: 'comparison',
          rating,
          context: { screen: 'comparison' },
          queuedAt: new Date().toISOString(),
        });
        setQueued(true);
        return;
      }
      await sendFeedback({
        parcelId,
        kind: 'comparison',
        rating,
        context: { screen: 'comparison' },
      });
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  const options = [
    { label: t('Sí, me ayudó'), rating: 5, testID: testIDs.comparisonFeedbackHelpful },
    { label: t('No me ayudó'), rating: 2, testID: testIDs.comparisonFeedbackNotHelpful },
    { label: t('No entendí'), rating: 1, testID: testIDs.comparisonFeedbackConfusing },
  ];

  return (
    <SectionCard title={t('¿Te sirvió esta comparación?')} testID={testIDs.comparisonFeedback}>
      {sent || queued ? (
        <Text className="text-sm leading-5 text-muted-foreground">
          {sent
            ? t('Gracias. Tu respuesta nos ayuda a mejorar Anden.')
            : t('Guardada en el teléfono. Se enviará cuando tengas señal.')}
        </Text>
      ) : (
        <>
          <Text className="text-sm leading-5 text-muted-foreground">
            {t('Una respuesta corta nos ayuda a entender si la app se entiende. Sin conexión, se guarda en el teléfono.')}
          </Text>
          <HStack className="flex-wrap gap-2">
            {options.map((option) => (
              <Pressable
                key={option.rating}
                testID={option.testID}
                disabled={busy}
                onPress={() => void submit(option.rating)}
                accessibilityRole="button"
                className="min-h-11 rounded-full border border-border bg-card px-3 py-2"
              >
                <Text className="text-sm font-semibold text-foreground">{option.label}</Text>
              </Pressable>
            ))}
          </HStack>
        </>
      )}
    </SectionCard>
  );
}

const PlanCard = memo(function PlanCard({ plan, index }: { plan: Plan; index: number }) {
  const { t } = useTranslation();
  const { open: openAgent } = useAgentSheet();
  const isCurrent = index === 0;
  const isExample = plan.kind === 'example';
  const marginMissing = plan.economics.margin_pen === null;
  const economicsMissing = plan.economics.missing_inputs ?? [];
  const otherMissing = plan.missing_inputs.filter(
    (value) => value !== 'crop_economics' && !value.startsWith('economics.'),
  );

  return (
    <SectionCard
      title={
        isExample
          ? t('Plan de ejemplo')
          : isCurrent
            ? t('Tu plan actual')
            : t(plan.label)
      }
      subtitle={formatCropSequence(plan.crop_sequence)}
      action={<StatusBadge status={plan.status} />}
      testID={testIDs.comparisonPlan(index)}
    >
      <VStack className="gap-2">
        <HStack className="gap-3">
          <MetricTile
            label={t('Agua que falta')}
            value={
              plan.water.deficit_mm !== null && plan.water.deficit_mm <= 0
                ? t('No falta')
                : formatNumber(plan.water.deficit_mm, 'mm', 0)
            }
            tone="water"
          />
          <MetricTile
            label={t('Ganancia estimada')}
            value={marginMissing ? t('Falta dato') : formatMoney(plan.economics.margin_pen)}
            tone="primary"
          />
        </HStack>

        {marginMissing ? (
          <VStack className="gap-2 rounded-xl border border-warning/40 bg-warning/5 p-3">
            <Text className="text-sm font-semibold text-warning">
              {t('Todavía no podemos estimar la ganancia')}
            </Text>
            <Text className="text-sm leading-5 text-muted-foreground">
              {economicsMissing.length > 0
                ? t('Falta: {{missing}}.', { missing: formatMissing(economicsMissing, 4) })
                : t('Falta el precio, el rendimiento o el costo de algún cultivo.')}
            </Text>
            <HStack className="flex-wrap gap-2">
              <AppButton
                size="sm"
                tone="outline"
                onPress={() => router.push('/parcel-economics')}
              >
                {t('Agregar precios y costos')}
              </AppButton>
              <AppButton
                size="sm"
                tone="ghost"
                onPress={() =>
                  openAgent(
                    '¿Por qué no se calcula la ganancia estimada de mi plan? Explícame qué dato falta.',
                  )
                }
              >
                {t('Preguntar por qué')}
              </AppButton>
            </HStack>
          </VStack>
        ) : null}
        <MetricRow
          label={t('¿Alcanza el agua?')}
          value={formatFeasibility(plan.water.feasibility)}
          valueClassName={
            plan.water.feasibility === 'deficit' ? 'text-warning' : undefined
          }
        />
        {plan.water.available_mm === null ? (
          <VStack className="gap-2 rounded-xl border border-water/30 bg-water/5 p-3">
            <Text className="text-sm leading-5 text-muted-foreground">
              {t('Aún no tenemos el agua de tu parcela. Puedes completar ese dato para revisar mejor este plan.')}
            </Text>
            <AppButton tone="outline" size="sm" onPress={() => router.push('/parcel-profile?step=water')}>
              {t('Completar agua ahora')}
            </AppButton>
          </VStack>
        ) : null}
      </VStack>

      {otherMissing.length > 0 ? (
        <Text className="text-sm leading-5 text-warning">
          {t('Falta: {{missing}}', { missing: formatMissing(otherMissing) })}
        </Text>
      ) : null}

      <Disclosure title={t('¿Por qué este plan?')}>
        <Text className="text-sm leading-5 text-muted-foreground">
          {plan.why_this_plan.length > 0
            ? plan.why_this_plan.join(' ')
            : t('No hay una explicación adicional.')}
        </Text>
      </Disclosure>
      <Disclosure title={t('Lo que ganas y lo que pierdes')}>
        <Text className="text-sm leading-5 text-muted-foreground">
          {plan.tradeoffs.length > 0
            ? plan.tradeoffs.join(' ')
            : t('No hay más ventajas o desventajas declaradas.')}
        </Text>
      </Disclosure>
    </SectionCard>
  );
});

export function ComparisonScreen() {
  const { t } = useTranslation();
  const palette = useChartPalette();
  const { parcel } = useParcel();
  const { online } = useOffline();
  const {
    comparison,
    comparisonOrigin,
    activePlanId,
    setActivePlanId,
    stale,
    busy,
    error,
    createComparison,
  } = useComparison();
  const hasMargins = Boolean(
    comparison?.plans.some((plan) => plan.economics.margin_pen !== null),
  );
  const autoRefreshAttempted = useRef(false);
  const activePlan = comparison?.plans.find((plan) => plan.plan_id === activePlanId) ?? comparison?.plans[0];

  const handleCreate = async () => {
    try {
      await createComparison();
    } catch {
      // The provider exposes the error through the alert below.
    }
  };

  useEffect(() => {
    if (!stale) {
      autoRefreshAttempted.current = false;
      return;
    }
    if (!parcel || !comparison || busy || autoRefreshAttempted.current) return;
    autoRefreshAttempted.current = true;
    void handleCreate();
    // handleCreate intentionally only depends on the provider callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, comparison, parcel, stale]);

  if (!parcel) {
    return (
      <Screen header={<AppHeader subtitle={t('Comparar')} />}>
        <StateView
          illustration="empty"
          title={t('Primero crea tu parcela')}
          description={t('Necesitamos tu ubicación y superficie para comparar planes.')}
          action={
            <AppButton onPress={() => router.push('/parcel-new')}>
              {t('Crear mi parcela')}
            </AppButton>
          }
        />
      </Screen>
    );
  }

  return (
    <Screen
      header={
        <AppHeader
          subtitle={parcel?.name ?? t('Comparar')}
          onSources={() => router.push('/sources')}
        />
      }
      footer={
        comparison ? (
          <>
            <AppButton onPress={() => router.push('/plan-save')}>
              {t('Elegir y guardar mi plan')}
            </AppButton>
            <AppButton
              testID={testIDs.comparisonSimulate}
              tone="outline"
              onPress={() => router.push('/scenario')}
            >
              {t('Probar un cambio')}
            </AppButton>
            <Text className="text-center text-sm leading-5 text-muted-foreground">
              {stale
                ? t('Actualizando con los cambios de tu ficha…')
                : t('Se actualiza sola cuando cambias tu ficha.')}
            </Text>
          </>
        ) : undefined
      }
    >
      {error ? <AppAlert tone="error">{error}</AppAlert> : null}
      {error && stale && comparison && !busy ? (
        <AppButton
          onPress={() => {
            autoRefreshAttempted.current = false;
            void handleCreate();
          }}
        >
          {t('Reintentar actualización')}
        </AppButton>
      ) : null}
      {comparisonOrigin === 'bundle' || (!online && comparison) ? (
        <AppAlert tone="info">
          {t('Sin conexión: usando los datos guardados de esta parcela.')}
        </AppAlert>
      ) : null}
      {comparison?.plans[0]?.kind === 'example' ? (
        <AppAlert tone="warning">
          {t(
            'No registraste tu historial. La primera fila es una rotación de ejemplo, no tu plan actual.',
          )}
        </AppAlert>
      ) : null}

      {!comparison ? (
        <>
          <HeroCard
            eyebrow={t('Antes de sembrar')}
            title={t('Compara 3 planes para tu parcela')}
            description={t(
              'Verás cuánta agua falta, cuánto podrías ganar y si el agua alcanza. Si falta un dato, lo decimos.',
            )}
            illustration="compare"
          >
            <AppButton
              testID={testIDs.comparisonCreate}
              loading={busy}
              tone="surface"
              className="min-h-14"
              onPress={() => void handleCreate()}
            >
              {t('Comparar ahora')}
            </AppButton>
          </HeroCard>
          {busy ? (
            <StateView
              loading
              title={t('Calculando tus planes')}
              description={t('Estamos revisando agua, suelo y ganancia.')}
            />
          ) : null}
        </>
      ) : (
        <>
          <SectionCard
            title={t('Tu comparación')}
            subtitle={`${formatDate(comparison.analysis_period.start)} → ${formatDate(comparison.analysis_period.end)}`}
            testID={testIDs.comparisonSummary}
          >
            {comparison.plans.length >= 3 ? (
              <Text className="text-sm leading-5 text-muted-foreground">
                {t('Tres caminos para la misma parcela. Revisa el que más te sirva.')}
              </Text>
            ) : comparison.plans.length === 2 ? (
              <Text className="text-sm leading-5 text-muted-foreground">
                {t('Tu plan actual y una alternativa. Completa más datos para ver más opciones.')}
              </Text>
            ) : comparison.plans.length === 1 ? (
              <Text className="text-sm leading-5 text-muted-foreground">
                {t('Solo tu plan actual por ahora. Completa datos para comparar alternativas.')}
              </Text>
            ) : null}
            {comparison.pending_plans?.length ? (
              <Text className="text-sm leading-5 text-warning">
                {t('{{count}} alternativas pendientes por falta de datos.', {
                  count: comparison.pending_plans.length,
                })}
              </Text>
            ) : null}
          </SectionCard>

          <PlanSelector
            plans={comparison.plans}
            selectedPlanId={activePlan?.plan_id ?? ''}
            onSelect={setActivePlanId}
          />
          {activePlan ? (
            <PlanCard
              key={activePlan.plan_id}
              plan={activePlan}
              index={comparison.plans.findIndex((plan) => plan.plan_id === activePlan.plan_id)}
            />
          ) : null}

          {hasMargins ? (
            <ChartCard
              title={t('Ganancia por plan')}
              subtitle={t('Soles estimados para el periodo')}
              summary={comparison.plans
                .map((plan) => `${plan.label}: ${formatMoney(plan.economics.margin_pen)}`)
                .join('; ')}
              columns={[t('Plan'), t('Ganancia')]}
              rows={comparison.plans.map((plan, index) => ({
                label:
                  plan.kind === 'example'
                    ? t('Plan de ejemplo')
                    : plan.kind === 'existing'
                      ? t('Tu plan actual')
                      : t(plan.label),
                values: [formatMoney(plan.economics.margin_pen)],
              }))}
              testID="comparison.chart.margin"
            >
              <AndenBarChart
                data={comparison.plans.map((plan, index) => ({
                  label:
                    plan.kind === 'example'
                      ? t('Ejemplo')
                      : plan.kind === 'existing'
                        ? t('Actual')
                        : plan.label.replace('Alternativa ', ''),
                  value: plan.economics.margin_pen,
                  color:
                    index === 0
                      ? palette.primary
                      : index === 1
                        ? palette.secondary
                        : palette.tertiary,
                }))}
                formatValue={(value) =>
                  value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0)
                }
              />
            </ChartCard>
          ) : (
            <SectionCard
              title={t('Ganancia por plan')}
              subtitle={t('Todavía no hay margen para comparar')}
            >
              <AppAlert tone="warning">
                {t(
                  'Para calcular la ganancia necesitamos el precio, el rendimiento y el costo de los cultivos de cada plan.',
                )}
              </AppAlert>
              <AppButton tone="outline" onPress={() => router.push('/parcel-economics')}>
                {t('Agregar precios y costos')}
              </AppButton>
            </SectionCard>
          )}

          <FeedbackPrompt parcelId={parcel.id} online={online} />

          <Text className="text-sm leading-5 text-muted-foreground">
            {comparison.disclaimer}
          </Text>
          <HStack className="items-center gap-2">
            <Text className="text-sm text-muted-foreground">{t('Fuente:')}</Text>
            <Text className="text-sm text-foreground">
              {comparison.source_snapshots.join(', ') || t('Sin datos de origen')}
            </Text>
          </HStack>
        </>
      )}
    </Screen>
  );
}
