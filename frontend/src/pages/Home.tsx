/**
 * Inicio — web port of the native DashboardScreen.
 *
 * Image-first home: the parcel photo and the single next action come first,
 * then a scannable shortcut row, the saved campaign, the declared prices, the
 * parcel ficha and the NASA climate. Data and routes match the native app.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight,
  ClipboardList,
  CloudSun,
  Coins,
  Droplets,
  FileText,
  MessageCircle,
  SlidersHorizontal,
  Sprout,
} from 'lucide-react';
import { AppButton } from '../components/app/AppButton';
import { AppHeader } from '../components/app/AppHeader';
import { Badge } from '../components/app/Badge';
import { Chip, ChipBar } from '../components/app/Chip';
import { CropThumb } from '../components/app/CropThumb';
import { AppAlert, Disclosure } from '../components/app/Feedback';
import { ListRow } from '../components/app/ListRow';
import { MediaCard } from '../components/app/MediaCard';
import { MetricTile } from '../components/app/Metric';
import { NextStepCard } from '../components/app/NextStepCard';
import { ProgressRing } from '../components/app/ProgressRing';
import { Screen } from '../components/app/Screen';
import { SectionCard } from '../components/app/SectionCard';
import { SkeletonCard, SkeletonRow } from '../components/app/Skeleton';
import { colors } from '../design/tokens';
import { api } from '../lib/api';
import {
  formatCropSequence,
  formatDate,
  formatMissing,
  formatMoney,
  formatNumber,
} from '../lib/format';
import { selectNextStep, uncoveredMissingInputs } from '../lib/nextStep';
import { parcelCoverFor } from '../lib/parcelCovers';
import { profileProgress } from '../lib/profileStatus';
import { useOnline } from '../lib/useOnline';
import { useQueryCatalogCrops } from '../lib/useQueries';
import { useComparison } from '../providers/ComparisonProvider';
import { useParcel } from '../providers/ParcelProvider';
import { useProfile } from '../providers/ProfileProvider';
import type { Crop, Parcel } from '../lib/types';

type CropEconomics = {
  yield_kg_ha?: number | null;
  price_pen_kg?: number | null;
  costs_pen?: number | null;
};

function parcelLocation(parcel: Parcel): string {
  const coordinates = parcel.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return '';
  if (parcel.geometry.type === 'Point') {
    return `${Number(coordinates[1]).toFixed(4)}, ${Number(coordinates[0]).toFixed(4)}`;
  }
  if (parcel.geometry.type === 'Polygon' && Array.isArray(coordinates[0])) {
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

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const online = useOnline();
  const { parcel, parcels, context, indicators, loading, error, refresh, selectParcel } = useParcel();
  const { comparison, createComparison, busy } = useComparison();
  const { profile } = useProfile();
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  const cropsQuery = useQueryCatalogCrops();
  const savedPlansQuery = useQuery({
    queryKey: ['saved-plans', parcel?.id],
    queryFn: api.getSavedPlans,
    enabled: Boolean(parcel),
    retry: false,
  });

  const displayName =
    profile?.display_name && profile.display_name !== 'Agricultor' ? profile.display_name : null;
  const greeting = displayName ? t('Hola, {{name}}', { name: displayName }) : t('Hola');

  const handleDemo = async () => {
    setDemoBusy(true);
    setDemoError(null);
    try {
      const created = await api.createDemoParcel();
      selectParcel(created);
      await queryClient.invalidateQueries({ queryKey: ['parcels'] });
      await refresh();
    } catch (cause) {
      setDemoError(
        cause instanceof Error ? cause.message : t('No pudimos cargar los datos de ejemplo.'),
      );
    } finally {
      setDemoBusy(false);
    }
  };

  if (!parcel && loading) {
    return (
      <Screen header={<AppHeader subtitle={t('Inicio')} />}>
        <div
          role="status"
          aria-label={t('Cargando tu parcela')}
          className="space-y-3"
        >
          <SkeletonCard />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </Screen>
    );
  }

  if (!parcel) {
    return (
      <Screen header={<AppHeader subtitle={t('Inicio')} onSettings={() => navigate('/ajustes')} />}>
        {error ? <AppAlert tone="error">{error}</AppAlert> : null}
        {demoError ? <AppAlert tone="error">{demoError}</AppAlert> : null}

        <MediaCard
          image="/img/parcel-covers/field-1.jpg"
          imageAlt={t('Chacra agrícola en los Andes')}
          eyebrow={greeting}
          title={t('Bienvenido a Anden')}
          subtitle={t('Crea tu primera parcela para comparar qué sembrar con tus datos reales.')}
        >
          <AppButton size="lg" fullWidth onClick={() => navigate('/parcela')}>
            {t('Crear mi parcela')}
          </AppButton>
          <AppButton
            tone="outline"
            size="lg"
            fullWidth
            loading={demoBusy}
            onClick={handleDemo}
          >
            {t('Probar con datos de ejemplo')}
          </AppButton>
          <p className="text-sm leading-5 text-muted-foreground">
            {t('Carga una parcela de demostración con cultivos, agua y precios.')}
          </p>
        </MediaCard>

        <section className="space-y-2">
          <div className="space-y-0.5">
            <h2 className="text-lg font-bold text-foreground">{t('Cómo funciona')}</h2>
            <p className="text-sm text-muted-foreground">{t('Tres pasos, sin complicaciones')}</p>
          </div>
          <ListRow
            illustration="onboarding-location"
            title={t('1. Marca tu parcela')}
            subtitle={t('El punto donde está tu chacra.')}
          />
          <ListRow
            illustration="compare"
            title={t('2. Compara 3 planes')}
            subtitle={t('Con tu agua, tu suelo y tus precios.')}
          />
          <ListRow
            illustration="success"
            title={t('3. Guarda tu plan')}
            subtitle={t('La decisión que te sirva, a mano.')}
          />
        </section>

        <p className="text-center text-sm leading-5 text-muted-foreground">
          {t('Es una ayuda para decidir. No reemplaza la visita de un agrónomo.')}
        </p>
      </Screen>
    );
  }

  const firstIndicator = indicators?.indicators?.[0];
  const savedPlans = (savedPlansQuery.data ?? []).filter((plan) => plan.parcel_id === parcel.id);
  const latestPlan = savedPlans[0];
  const latestPlanMeta = latestPlan
    ? [
        latestPlan.created_at ? formatDate(latestPlan.created_at) : t('Guardado'),
        latestPlan.preferred ? formatCropSequence(latestPlan.preferred.crop_sequence) : null,
      ]
        .filter((part): part is string => Boolean(part))
        .join(' · ')
    : '';
  const fichaProgress = profileProgress(parcel, context);
  const location = parcelLocation(parcel);
  const economics = (parcel.preferences?.economics ?? {}) as Record<string, CropEconomics>;
  const cropMap = new Map<string, Crop>(
    (cropsQuery.data?.crops ?? []).map((crop) => [crop.id, crop]),
  );
  const priceRows = Object.entries(economics).filter(
    ([, value]) => value && (value.price_pen_kg != null || value.yield_kg_ha != null),
  );
  // The guided price flow walks the crops in the history; fall back to the
  // crops that already have declared economics when no history is available.
  const historyCropIds = [
    ...new Set((context?.history ?? []).map((row) => row.crop_id).filter((id): id is string => Boolean(id))),
  ];
  const priceCropIds = historyCropIds.length > 0 ? historyCropIds : Object.keys(economics);
  const completePrices = priceCropIds.filter((cropId) => {
    const value = economics[cropId];
    return value?.yield_kg_ha != null && value?.price_pen_kg != null && value?.costs_pen != null;
  }).length;
  const totalPriceCrops = priceCropIds.length;
  const pricesIncomplete = completePrices < totalPriceCrops;
  const priceLabel =
    priceRows.length > 0
      ? t('{{done}} de {{total}} cultivos con precios', {
          done: completePrices,
          total: totalPriceCrops,
        })
      : t('Sin precios declarados');
  const waterReady = context?.completeness.water === 'ready';
  const waterEntries = context?.water ?? [];
  const hasNoWater = Boolean(context) && waterEntries.length === 0;
  // The provider keeps the last comparison while the farmer switches parcels;
  // only this parcel's comparison drives Inicio's next step.
  const activeComparison = comparison?.parcel_id === parcel.id ? comparison : null;
  const nextStep = selectNextStep({
    parcel,
    context,
    comparison: activeComparison,
    savedPlanCount: savedPlans.length,
  });
  const uncoveredMissing = uncoveredMissingInputs(
    nextStep.id,
    context?.missing_inputs ?? [],
  );

  const openComparison = async () => {
    try {
      if (!activeComparison) await createComparison();
    } catch {
      // The Comparar screen owns the error message and the retry button.
    } finally {
      navigate('/comparar');
    }
  };

  // The hero follows the same next step until a comparison exists; after that
  // the comparison is the thing the farmer returns to.
  const handleHeroAction = () => {
    if (activeComparison || nextStep.path.startsWith('/comparar')) {
      void openComparison();
      return;
    }
    navigate(nextStep.path);
  };

  const handleNextStep = () => {
    if (nextStep.path.startsWith('/comparar')) {
      void openComparison();
      return;
    }
    navigate(nextStep.path);
  };

  return (
    <Screen
      header={
        <AppHeader
          subtitle={`${parcel.name} · ${parcel.district ?? t('Moquegua')}`}
          onSources={() => navigate('/fuentes')}
          onSettings={() => navigate('/ajustes')}
        />
      }
    >
      {error ? <AppAlert tone="error">{error}</AppAlert> : null}
      {!online ? (
        <AppAlert tone="info">
          {t(
            'Ahora no hay señal. Ves los datos guardados de tu parcela y puedes seguir revisando; se actualizarán cuando vuelvas a tener internet.',
          )}
        </AppAlert>
      ) : null}

      {parcels.length > 1 ? (
        <ChipBar label={t('Tus parcelas')}>
          {parcels.map((item) => (
            <Chip
              key={item.id}
              icon={Sprout}
              selected={item.id === parcel.id}
              onClick={() => selectParcel(item)}
            >
              {item.name}
            </Chip>
          ))}
        </ChipBar>
      ) : null}

      <MediaCard
        image={parcelCoverFor(parcel.id)}
        imageAlt={t('Foto ilustrativa de una chacra agrícola')}
        eyebrow={greeting}
        title={activeComparison ? t('Tu comparación está lista') : t('¿Qué sembrar?')}
        subtitle={
          activeComparison
            ? t('Revisa agua, suelo y ganancia en tus 3 planes.')
            : t('Compara con tu agua, tu suelo y tus precios.')
        }
        footer={
          <div className="space-y-1">
            <div className="flex flex-wrap gap-2">
              <Badge tone={waterReady ? 'success' : 'warning'} icon={Droplets}>
                {waterReady ? t('Agua lista') : t('Agua pendiente')}
              </Badge>
              <Badge tone="soft" icon={ClipboardList}>
                {t('Ficha {{progress}}%', { progress: fichaProgress })}
              </Badge>
              <Badge
                tone={priceRows.length > 0 && !pricesIncomplete ? 'success' : 'warning'}
                icon={Coins}
              >
                {priceLabel}
              </Badge>
            </div>
            {hasNoWater ? (
              <button
                type="button"
                onClick={() => navigate('/parcela/ficha')}
                className="mx-auto flex min-h-12 items-center justify-center gap-1 rounded-full px-3 text-sm font-semibold text-water hover:bg-water/10"
              >
                <Droplets size={16} aria-hidden="true" />
                {t('Completar agua')}
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        }
      >
        <AppButton size="lg" fullWidth loading={busy} onClick={handleHeroAction}>
          {activeComparison ? t('Ver comparación') : t(nextStep.cta)}
        </AppButton>
      </MediaCard>

      <NextStepCard step={nextStep} onAction={handleNextStep} />

      {uncoveredMissing.length > 0 ? (
        <AppAlert tone="warning">
          {t(
            'Faltan datos: {{missing}}. Los números que dependen de ellos se muestran como no disponibles.',
            { missing: formatMissing(uncoveredMissing) },
          )}
        </AppAlert>
      ) : null}

      <section id="que-necesitas" className="scroll-mt-24 space-y-2">
        <h2 className="text-lg font-bold text-foreground">{t('¿Qué necesitas?')}</h2>
        <ChipBar label={t('¿Qué necesitas?')}>
          <Chip
            icon={Coins}
            onClick={() =>
              navigate(pricesIncomplete ? '/parcela/economia?guiado=1' : '/parcela/economia')
            }
          >
            {t('Precios')}
          </Chip>
          <Chip icon={Droplets} onClick={() => navigate('/parcela/riego')}>
            {t('Riego')}
          </Chip>
          <Chip icon={SlidersHorizontal} onClick={() => navigate('/comparar')}>
            {t('Probar un cambio')}
          </Chip>
          <Chip icon={MessageCircle} onClick={() => navigate('/preguntar')}>
            {t('Preguntar')}
          </Chip>
          <Chip icon={ClipboardList} onClick={() => navigate('/parcela/ficha')}>
            {t('Ficha')}
          </Chip>
        </ChipBar>
      </section>

      {latestPlan ? (
        <section className="space-y-2">
          <div className="space-y-0.5">
            <h2 className="text-lg font-bold text-foreground">{t('Tu campaña')}</h2>
            <p className="text-sm text-muted-foreground">{t('La decisión que guardaste')}</p>
          </div>
          <ListRow
            illustration="success"
            title={latestPlan.name}
            subtitle={latestPlanMeta}
            trailing={
              <AppButton tone="secondary" onClick={() => navigate('/comparar')}>
                {t('Revisar plan')}
              </AppButton>
            }
          />
        </section>
      ) : null}

      <SectionCard
        title={t('Tus precios')}
        subtitle={t('Lo que declaraste para calcular tu margen')}
        action={
          <AppButton
            tone="ghost"
            onClick={() =>
              navigate(pricesIncomplete ? '/parcela/economia?guiado=1' : '/parcela/economia')
            }
          >
            {pricesIncomplete ? t('Completar') : t('Editar')}
          </AppButton>
        }
      >
        {priceRows.length === 0 ? (
          <p className="text-sm leading-5 text-muted-foreground">
            {t('Declara el precio y el rendimiento de tus cultivos para ver tu margen.')}
          </p>
        ) : (
          <>
            {priceRows.slice(0, 3).map(([cropId, value]) => (
              <div
                key={cropId}
                className="flex min-h-12 items-center gap-3 rounded-2xl bg-primary-50 px-3 py-2"
              >
                <CropThumb cropId={cropId} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-foreground">
                    {cropMap.get(cropId)?.local_name ?? cropId}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {value.price_pen_kg != null
                      ? `${formatMoney(value.price_pen_kg)} / kg`
                      : t('Falta precio')}
                  </p>
                </div>
                {value.yield_kg_ha != null ? (
                  <p className="shrink-0 text-right text-sm font-semibold text-foreground">
                    {formatNumber(value.yield_kg_ha, 'kg/ha', 0)}
                  </p>
                ) : (
                  <p className="shrink-0 text-right text-sm text-warning">
                    {t('Falta rendimiento')}
                  </p>
                )}
              </div>
            ))}
            {priceRows.length > 3 ? (
              <p className="px-1 text-sm text-muted-foreground">
                {t('y {{count}} más', { count: priceRows.length - 3 })}
              </p>
            ) : null}
          </>
        )}
      </SectionCard>

      <SectionCard
        title={
          <span className="flex flex-wrap items-center gap-2">
            {t('Tu parcela')}
            {parcel.is_simulated ? <Badge tone="warning">{t('DEMO')}</Badge> : null}
          </span>
        }
        subtitle={`${parcel.name} · ${parcel.district ?? t('Moquegua')}`}
      >
        <div className="flex items-center gap-4">
          <ProgressRing value={fichaProgress} size={64} label={t('Ficha de tu parcela')} />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm leading-5 text-muted-foreground">
              {parcel.area_ha
                ? formatNumber(parcel.area_ha, t('ha'), 2)
                : t('Superficie no disponible')}
              {location ? ` · ${location}` : ''}
            </p>
            <p className="text-sm leading-5 text-muted-foreground">
              {fichaProgress === 100
                ? t('Tu ficha está completa.')
                : t('Completa tu ficha para que los números sean más precisos.')}
            </p>
          </div>
        </div>
        <AppButton tone="outline" fullWidth onClick={() => navigate('/parcela/ficha')}>
          {fichaProgress === 100 ? t('Revisar ficha') : t('Completar ficha')}
        </AppButton>
      </SectionCard>

      {firstIndicator ? (
        <SectionCard title={t('Clima de tu zona')} subtitle={t('Datos estimados por NASA')}>
          <div className="flex gap-4">
            <MetricTile
              label={t('Lluvia')}
              value={formatNumber(firstIndicator.precip_mm, 'mm', 1)}
              tone="water"
              icon={<CloudSun size={18} className="text-water" aria-hidden="true" />}
            />
            <MetricTile
              label={t('Agua que evapora')}
              value={formatNumber(firstIndicator.eto_mm, 'mm', 1)}
              tone="primary"
              icon={<Sprout size={18} style={{ color: colors.primary }} aria-hidden="true" />}
            />
          </div>
          <Disclosure title={t('¿Qué significan estos datos?')}>
            <p className="text-sm leading-5 text-muted-foreground">
              {t(
                'La lluvia es el agua que cae en tu zona. La ETo es el agua que el sol y el viento hacen evaporar. Son datos estimados de NASA, no una medición de tu parcela.',
              )}
            </p>
          </Disclosure>
          <AppButton tone="outline" onClick={() => navigate('/fuentes')}>
            {t('Ver de dónde vienen')}
          </AppButton>
        </SectionCard>
      ) : null}

      <ListRow
        icon={FileText}
        tone="water"
        title={t('Fuentes y límites')}
        subtitle={t('De dónde vienen los datos y qué no podemos afirmar')}
        onClick={() => navigate('/fuentes')}
      />

      <p className="text-center text-sm leading-5 text-muted-foreground">
        {t('Es una ayuda para decidir. No reemplaza la visita de un agrónomo.')}
      </p>
    </Screen>
  );
}
