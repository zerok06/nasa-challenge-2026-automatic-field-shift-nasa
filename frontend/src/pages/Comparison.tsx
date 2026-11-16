/**
 * Comparar — pick a plan, read its detail, test a change, save it.
 *
 * Plans no longer scroll horizontally: a segmented control (Actual /
 * Alternativa B / Alternativa C) sits at the top and only the selected plan's
 * card is rendered underneath, photo included. The scenario card always talks
 * about that same plan (matched by `plan_id`) and uses hypothetical wording.
 * Feedback is asked once, after the comparison and before the disclaimer.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Banknote, Droplets } from 'lucide-react';
import { AppButton } from '../components/app/AppButton';
import { AppHeader } from '../components/app/AppHeader';
import { Badge } from '../components/app/Badge';
import { HeroCard } from '../components/app/HeroCard';
import { SectionCard } from '../components/app/SectionCard';
import { MetricRow, MetricTile } from '../components/app/Metric';
import { AppAlert, Disclosure, StatusBadge } from '../components/app/Feedback';
import { StateView } from '../components/app/StateView';
import { SkeletonCard } from '../components/app/Skeleton';
import { StickyActionBar } from '../components/app/StickyActionBar';
import { MediaCard } from '../components/app/MediaCard';
import { FeedbackCard } from '../components/app/FeedbackCard';
import { PlanTabs, planPanelId, planTabId, planTabLabelKey } from '../components/app/PlanCarousel';
import { BarChart, ChartCard } from '../components/app/Charts';
import { Screen } from '../components/app/Screen';
import { chartColors, statusMeta } from '../design/tokens';
import {
  formatCropSequence,
  formatDate,
  formatFeasibility,
  formatMissing,
  formatMoney,
  formatNumber,
} from '../lib/format';
import { useOnline } from '../lib/useOnline';
import { useComparison } from '../providers/ComparisonProvider';
import { useParcel } from '../providers/ParcelProvider';
import type { Plan } from '../lib/types';

const PLAN_IMAGES = [
  '/img/parcel-covers/field-1.jpg',
  '/img/parcel-covers/field-2.jpg',
  '/img/parcel-covers/field-3.jpg',
] as const;

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export default function Comparison() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const online = useOnline();
  const { parcel } = useParcel();
  const {
    comparison,
    scenario,
    comparisonOrigin,
    activePlanId,
    setActivePlanId,
    stale,
    busy,
    error,
    createComparison,
    simulate,
    resetScenario,
    scenarioOrigin,
  } = useComparison();

  const autoRefreshAttempted = useRef(false);
  const plans = comparison?.plans ?? [];
  const foundIndex = plans.findIndex((plan) => plan.plan_id === activePlanId);
  const activeIndex = foundIndex >= 0 ? foundIndex : 0;
  const activePlan: Plan | undefined = plans[activeIndex];

  const scenarioPlans = scenario?.plans ?? [];
  const scenarioIndex = scenarioPlans.findIndex(
    (plan) => plan.plan_id === activePlan?.plan_id,
  );
  const scenarioPlan =
    scenarioIndex >= 0 ? scenarioPlans[scenarioIndex] : scenarioPlans[activeIndex];

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
            <AppButton fullWidth onClick={() => navigate('/parcela')}>
              {t('Crear mi parcela')}
            </AppButton>
          }
        />
      </Screen>
    );
  }

  const planCount = plans.length;
  const planIntro =
    planCount >= 3
      ? t('Tres caminos para la misma parcela. Revisa el que más te sirva.')
      : planCount === 2
        ? t('Tu plan actual y una alternativa. Completa más datos para ver más opciones.')
        : t('Solo tu plan actual por ahora. Completa datos para comparar alternativas.');
  const hasMargins = plans.some((plan) => plan.economics.margin_pen !== null);

  const scrollToScenario = () => {
    document.getElementById('probar')?.scrollIntoView?.({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  return (
    <Screen
      header={
        <AppHeader subtitle={parcel.name} onSources={() => navigate('/fuentes')} />
      }
    >
      {error ? <AppAlert tone="error">{error}</AppAlert> : null}
      {error && stale && comparison && !busy ? (
        <AppButton
          fullWidth
          onClick={() => {
            autoRefreshAttempted.current = false;
            void handleCreate();
          }}
        >
          {t('Reintentar actualización')}
        </AppButton>
      ) : null}
      {comparisonOrigin === 'bundle' ? null : !online && !comparison ? (
        <AppAlert tone="info">
          {t('Sin conexión: usando los datos guardados de esta parcela.')}
        </AppAlert>
      ) : null}
      {plans[0]?.kind === 'example' ? (
        <AppAlert tone="warning">
          {t(
            'No registraste tu historial. El primer plan es una rotación de ejemplo, no tu plan actual.',
          )}
        </AppAlert>
      ) : null}

      {!comparison ? (
        <>
          <HeroCard
            eyebrow={t('Antes de sembrar')}
            title={t('Compara 3 planes para tu parcela')}
            description={t(
              'Verás cuánta agua falta, una ganancia estimada y si el agua alcanza. Son supuestos, no una promesa. Si falta un dato, lo decimos.',
            )}
            illustration="compare"
          >
            <AppButton
              tone="surface"
              size="lg"
              fullWidth
              loading={busy}
              onClick={() => void handleCreate()}
            >
              {t('Comparar ahora')}
            </AppButton>
          </HeroCard>

          {busy ? (
            <div className="space-y-3" role="status" aria-label={t('Calculando tus planes')}>
              <p className="text-sm font-medium leading-5 text-muted-foreground">
                {t('Estamos revisando agua, suelo y ganancia.')}
              </p>
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : null}
        </>
      ) : (
        <>
          <section className="space-y-2">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold leading-8 text-foreground">
                  {t('Tu comparación')}
                </h1>
                <p className="text-sm leading-5 text-muted-foreground">
                  {formatDate(comparison.analysis_period.start)} →{' '}
                  {formatDate(comparison.analysis_period.end)}
                </p>
              </div>
              <Badge tone="soft">
                {plans.length === 1
                  ? t('1 plan')
                  : t('{{total}} planes', { total: plans.length })}
              </Badge>
            </div>
            <p className="text-sm leading-5 text-muted-foreground">{planIntro}</p>
            {comparison.pending_plans?.length ? (
              <p className="text-sm leading-5 text-muted-foreground">
                {t(
                  'Hay más combinaciones posibles. Mostramos tu plan actual y dos alternativas para no complicarte.',
                )}
              </p>
            ) : null}
            <PlanTabs
              plans={plans}
              activePlanId={activePlan?.plan_id ?? null}
              onSelect={setActivePlanId}
            />
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">{t('Detalle del plan')}</h2>
            {activePlan ? <PlanDetail plan={activePlan} index={activeIndex} /> : null}
          </section>

          {hasMargins ? (
            <ChartCard
              title={t('Ganancia por plan')}
              subtitle={t('Soles estimados para el periodo, según los supuestos actuales')}
              columns={[t('Plan'), t('Ganancia')]}
              rows={plans.map((plan, index) => ({
                label: t(planTabLabelKey(plan, index)),
                values: [formatMoney(plan.economics.margin_pen)],
              }))}
            >
              <BarChart
                data={plans.map((plan, index) => ({
                  label: t(planTabLabelKey(plan, index)),
                  value: plan.economics.margin_pen,
                  color:
                    index === 0
                      ? chartColors.primary
                      : index === 1
                        ? chartColors.secondary
                        : chartColors.tertiary,
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
            </SectionCard>
          )}

          <ScenarioCard
            plan={activePlan}
            planIndex={activeIndex}
            scenarioPlan={scenarioPlan}
            hasScenario={Boolean(scenario)}
            busy={busy}
            offlineEstimate={scenarioOrigin === 'offline_estimate'}
            onSimulate={simulate}
            onReset={resetScenario}
          />

          <FeedbackCard
            title={t('¿Te sirvió esta comparación?')}
            description={t(
              'Una respuesta corta nos ayuda a entender si la app se entiende. Sin conexión, queda guardada en el teléfono.',
            )}
            parcelId={parcel.id}
            kind="comparison"
            context={{
              screen: 'comparison',
              comparison_id: comparison.comparison_id,
              plan_id: activePlan?.plan_id ?? null,
              locale: i18n.language,
            }}
          />

          <div className="space-y-2 rounded-2xl border border-border bg-primary-50/60 p-4">
            <p className="text-sm leading-5 text-muted-foreground">{comparison.disclaimer}</p>
            <p className="text-sm leading-5 text-muted-foreground">
              {t('Es una ayuda para decidir. No reemplaza la visita de un agrónomo.')}
            </p>
            <p className="text-sm leading-5 text-muted-foreground">
              <span className="font-semibold text-foreground">{t('Fuente:')}</span>{' '}
              {comparison.source_snapshots.join(', ') || t('Sin datos de origen')}
            </p>
          </div>
        </>
      )}

      {comparison ? (
        <StickyActionBar
          primary={
            <AppButton fullWidth size="lg" onClick={() => navigate('/comparar/guardar')}>
              {t('Elegir y guardar mi plan')}
            </AppButton>
          }
          secondary={
            <AppButton tone="ghost" fullWidth onClick={scrollToScenario}>
              {t('Probar un cambio')}
            </AppButton>
          }
          hint={
            stale
              ? t('Actualizando con los cambios de tu ficha…')
              : t('Se actualiza sola cuando cambias tu ficha.')
          }
        />
      ) : null}
    </Screen>
  );
}

function PlanDetail({ plan, index }: { plan: Plan; index: number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const marginMissing = plan.economics.margin_pen === null;
  const economicsMissing = plan.economics.missing_inputs ?? [];
  const waterMissing = plan.water.available_mm === null;
  const otherMissing = plan.missing_inputs.filter(
    (value) =>
      value !== 'crop_economics' &&
      !value.startsWith('economics.') &&
      !(waterMissing && value.startsWith('water_')),
  );
  const crops = formatCropSequence(plan.crop_sequence) || t('Rotación de cultivos');
  const eyebrow = t(planTabLabelKey(plan, index));
  const deficit =
    plan.water.deficit_mm === null
      ? t('Falta dato')
      : plan.water.deficit_mm <= 0
        ? t('No falta')
        : formatNumber(plan.water.deficit_mm, 'mm', 0);
  const margin = marginMissing ? t('Falta dato') : formatMoney(plan.economics.margin_pen);
  const statusLabel = t(statusMeta[plan.status]?.label ?? plan.status);

  return (
    <div
      role="tabpanel"
      id={planPanelId(index)}
      aria-labelledby={planTabId(index)}
      className="rounded-3xl"
    >
      <MediaCard image={PLAN_IMAGES[index % PLAN_IMAGES.length]} imageAlt={crops} eyebrow={eyebrow} title={crops}>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={plan.status} label={statusLabel} />
          {plan.kind === 'example' ? <Badge tone="soft">{t('Ejemplo')}</Badge> : null}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <MetricTile
            label={t('Agua que falta')}
            value={deficit}
            tone="water"
            icon={<Droplets size={16} className="text-water" aria-hidden="true" />}
          />
          <MetricTile
            label={t('Ganancia estimada')}
            value={margin}
            tone="primary"
            icon={<Banknote size={16} className="text-primary" aria-hidden="true" />}
          />
        </div>

        <MetricRow
          label={t('¿Alcanza el agua?')}
          value={formatFeasibility(plan.water.feasibility)}
          valueClassName={plan.water.feasibility === 'deficit' ? 'text-warning' : ''}
        />

        {waterMissing ? (
          <div className="space-y-2 rounded-xl border border-water/30 bg-water/5 p-3">
            <p className="text-sm leading-5 text-muted-foreground">
              {t(
                'Aún no tenemos el agua de tu parcela. Puedes completar ese dato para revisar mejor este plan.',
              )}
            </p>
            <AppButton
              tone="secondary"
              fullWidth
              onClick={() => navigate('/parcela/ficha')}
            >
              {t('Completar agua ahora')}
            </AppButton>
          </div>
        ) : null}

        {marginMissing ? (
          <div className="space-y-2 rounded-xl border border-warning/30 bg-warning/5 p-3">
            <p className="text-sm font-semibold text-warning">
              {t('Todavía no podemos estimar la ganancia')}
            </p>
            <p className="text-sm leading-5 text-muted-foreground">
              {economicsMissing.length > 0
                ? t('Falta: {{missing}}.', { missing: formatMissing(economicsMissing, 4) })
                : t('Falta el precio, el rendimiento o el costo de algún cultivo.')}
            </p>
            <AppButton
              tone="secondary"
              fullWidth
              onClick={() => navigate('/parcela/economia?guiado=1')}
            >
              {t('Agregar precios y costos')}
            </AppButton>
          </div>
        ) : null}

        {otherMissing.length > 0 ? (
          <AppAlert tone="warning">
            {t('Falta: {{missing}}', { missing: formatMissing(otherMissing) })}
          </AppAlert>
        ) : null}

        <Disclosure title={t('¿Por qué este plan?')}>
          <p className="text-sm leading-5 text-muted-foreground">
            {plan.why_this_plan.length > 0
              ? plan.why_this_plan.join(' ')
              : t('No hay una explicación adicional.')}
          </p>
        </Disclosure>
        <Disclosure title={t('Ventajas y límites de este plan')}>
          <p className="text-sm leading-5 text-muted-foreground">
            {plan.tradeoffs.length > 0
              ? plan.tradeoffs.join(' ')
              : t('No hay más ventajas o desventajas declaradas.')}
          </p>
        </Disclosure>
        {plan.water.assumptions.length > 0 ? (
          <Disclosure title={t('Supuestos de esta estimación')}>
            <ul className="list-disc space-y-1 pl-4 text-sm leading-5 text-muted-foreground">
              {plan.water.assumptions.map((assumption, assumptionIndex) => (
                <li key={`${assumptionIndex}-${assumption}`}>{assumption}</li>
              ))}
            </ul>
          </Disclosure>
        ) : null}
      </MediaCard>
    </div>
  );
}

function ScenarioCard({
  plan,
  planIndex,
  scenarioPlan,
  hasScenario,
  busy,
  offlineEstimate,
  onSimulate,
  onReset,
}: {
  plan: Plan | undefined;
  planIndex: number;
  scenarioPlan: Plan | undefined;
  hasScenario: boolean;
  busy: boolean;
  offlineEstimate: boolean;
  onSimulate: (water: number, price: number) => Promise<unknown>;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  const [water, setWater] = useState(100);
  const [price, setPrice] = useState(100);
  const unchanged = water === 100 && price === 100;
  const planName = plan ? t(planTabLabelKey(plan, planIndex)) : t('tu plan');
  const baselineMargin =
    plan && plan.economics.margin_pen !== null
      ? formatMoney(plan.economics.margin_pen)
      : t('Falta dato');
  const scenarioMargin =
    scenarioPlan && scenarioPlan.economics.margin_pen !== null
      ? formatMoney(scenarioPlan.economics.margin_pen)
      : t('Falta dato');
  const scenarioDeficit =
    scenarioPlan && scenarioPlan.water.deficit_mm !== null
      ? scenarioPlan.water.deficit_mm <= 0
        ? t('No falta')
        : formatNumber(scenarioPlan.water.deficit_mm, 'mm', 0)
      : t('Falta dato');

  return (
    <div id="probar" className="scroll-mt-24">
      <SectionCard
        title={t('Con este cambio estimarías…')}
        subtitle={t('Es una prueba con tus datos actuales')}
      >
        <p className="text-sm leading-5 text-muted-foreground">
          {t('Se aplica a {{plan}}. Tu plan guardado no cambia.', { plan: planName })}
        </p>

        <label className="block space-y-1">
          <span className="flex justify-between text-sm font-medium text-foreground">
            <span>{t('Agua disponible (%)')}</span>
            <span>{water}%</span>
          </span>
          <input
            type="range"
            min={50}
            max={120}
            step={5}
            value={water}
            onChange={(event) => setWater(Number(event.target.value))}
            className="h-12 w-full accent-primary"
            aria-label={t('Agua disponible (%)')}
          />
        </label>
        <label className="block space-y-1">
          <span className="flex justify-between text-sm font-medium text-foreground">
            <span>{t('Precio de venta (%)')}</span>
            <span>{price}%</span>
          </span>
          <input
            type="range"
            min={50}
            max={130}
            step={5}
            value={price}
            onChange={(event) => setPrice(Number(event.target.value))}
            className="h-12 w-full accent-primary"
            aria-label={t('Precio de venta (%)')}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <AppButton
            size="sm"
            loading={busy}
            disabled={unchanged || !plan}
            onClick={() => void onSimulate(water / 100, price / 100)}
          >
            {t('Ver esta estimación')}
          </AppButton>
          <AppButton
            size="sm"
            tone="ghost"
            disabled={unchanged && !hasScenario}
            onClick={() => {
              setWater(100);
              setPrice(100);
              onReset();
            }}
          >
            {t('Restablecer')}
          </AppButton>
        </div>

        {unchanged ? (
          <p className="text-sm leading-5 text-muted-foreground">
            {t('Mueve el agua o el precio para probar un cambio. 100% conserva el dato actual.')}
          </p>
        ) : null}

        {offlineEstimate ? (
          <AppAlert tone="info">
            {t('Estimación sin internet. No reemplaza el cálculo del servidor.')}
          </AppAlert>
        ) : null}

        {hasScenario && scenarioPlan ? (
          <div
            aria-live="polite"
            className="space-y-2 rounded-xl border border-border bg-primary-50 p-3"
          >
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              {t('Estimación para {{plan}}', { plan: planName })}
            </p>
            <MetricRow label={t('Ahora, sin el cambio')} value={baselineMargin} />
            <MetricRow
              label={t('Con este cambio estimarías')}
              value={scenarioMargin}
              valueClassName="text-primary"
            />
            <MetricRow
              label={t('Agua que falta con el cambio')}
              value={scenarioDeficit}
            />
            <p className="text-xs leading-4 text-muted-foreground">
              {t(
                'Es una prueba con tus datos actuales. Tu plan guardado no se modifica y no reemplaza a un agrónomo.',
              )}
            </p>
          </div>
        ) : null}

        <Disclosure title={t('¿Qué se recalcula?')}>
          <p className="text-sm leading-5 text-muted-foreground">
            {t(
              'Solo cambian el agua disponible y el precio. El clima, los cultivos y el suelo se mantienen como en tu comparación.',
            )}
          </p>
        </Disclosure>
      </SectionCard>
    </div>
  );
}
