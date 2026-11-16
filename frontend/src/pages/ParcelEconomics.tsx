/**
 * Precios y costos — web port of the native parcel-economics screen.
 *
 * Spec 035 catalog auto-fill: the backend returns the best editable reference
 * per crop (`crop.price_reference`, district → province → regional →
 * historical). The farmer can override it and the crop shows a "Modificado"
 * badge only after they actually change the canonical value.
 *
 * Farmers sell in arrobas and sacos, so the inputs are local while the saved
 * values stay canonical (kg/ha and S/ per kg). `?crop=<id>` opens guided mode
 * on that crop with its catalog price already filled and editable.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppButton } from '../components/app/AppButton';
import { AppHeader } from '../components/app/AppHeader';
import { SectionCard } from '../components/app/SectionCard';
import { AppAlert, Disclosure } from '../components/app/Feedback';
import { NumberField, SelectField } from '../components/app/FormField';
import { CropThumb } from '../components/app/CropThumb';
import { Chip, ChipBar } from '../components/app/Chip';
import { Badge } from '../components/app/Badge';
import { StepProgress } from '../components/app/StepProgress';
import { StickyActionBar } from '../components/app/StickyActionBar';
import { Illustration } from '../components/illustrations/Illustration';
import { Screen } from '../components/app/Screen';
import { StateView } from '../components/app/StateView';
import { ApiError, api } from '../lib/api';
import { catalogPriceFor } from '../lib/catalog';
import { formatMissing, formatMoney, formatNumber } from '../lib/format';
import { enqueue } from '../lib/outbox';
import { useOnline } from '../lib/useOnline';
import { useQueryCatalogCrops } from '../lib/useQueries';
import {
  DEFAULT_SACO_KG,
  SACO_KG_OPTIONS,
  kgHaFrom,
  parseDecimal,
  penKgFrom,
  roundNumber,
  sacoKgValue,
  type PriceUnit,
  type YieldUnit,
} from '../lib/units';
import { useParcel } from '../providers/ParcelProvider';
import { useToast } from '../providers/ToastProvider';
import type { CatalogPriceReference, Crop } from '../lib/types';

type Draft = {
  yield: string;
  yieldUnit: YieldUnit;
  price: string;
  priceUnit: PriceUnit;
  sacoKg: string;
  costs: string;
  jornales: string;
  jornalPen: string;
};

type CropEconomics = {
  yield_kg_ha?: number | null;
  price_pen_kg?: number | null;
  costs_pen?: number | null;
  price_source?: string;
  price_confirmed?: boolean;
  price_reference?: Record<string, unknown>;
  marketable_share?: number | null;
};

/** Backend reference and legacy catalog row normalized to one shape. */
type PriceReference = {
  value: number;
  year: number | null;
  place: string | null;
  scope: string;
  sourceId: string | null;
  isLocal: boolean;
};

function emptyDraft(): Draft {
  return {
    yield: '',
    yieldUnit: 'kg_ha',
    price: '',
    priceUnit: 'pen_kg',
    sacoKg: String(DEFAULT_SACO_KG),
    costs: '',
    jornales: '',
    jornalPen: '',
  };
}

function sameValue(a: number | null, b: number | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return Math.abs(a - b) < 1e-6;
}

/**
 * Prefer the reference computed by the backend (`district → province →
 * regional → historical`). `prices_chacra_2025` stays as the offline/older
 * payload fallback so a cached catalog still pre-fills something honest.
 */
function resolvePriceReference(
  crop: Crop,
  prices: CatalogPriceReference[],
  district: string | null,
): PriceReference | null {
  const backend = crop.price_reference;
  if (backend && Number.isFinite(backend.price_pen_kg) && backend.price_pen_kg > 0) {
    return {
      value: backend.price_pen_kg,
      year: backend.year ?? null,
      place: backend.place ?? null,
      scope: backend.scope ?? 'district',
      sourceId: backend.source_id ?? null,
      isLocal: backend.is_local ?? false,
    };
  }

  const legacy = catalogPriceFor(crop, prices, district);
  if (!legacy) return null;
  return {
    value: legacy.precio_chacra.valor,
    year: legacy.periodo,
    place: legacy.distrito ?? legacy.provincia ?? legacy.departamento ?? null,
    scope: legacy.nivel,
    sourceId: legacy.fuente_id,
    isLocal: Boolean(legacy.distrito && legacy.distrito === district),
  };
}

/** A network/server failure is worth replaying; a 4xx is not. */
function shouldQueue(cause: unknown): boolean {
  if (!(cause instanceof ApiError)) return true;
  return cause.status >= 500 || cause.status === 408 || cause.status === 429;
}

function saveErrorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof ApiError && typeof cause.message === 'string' && cause.message.trim()) {
    return cause.message;
  }
  return fallback;
}

export default function ParcelEconomics() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const online = useOnline();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { parcel, context, refresh } = useParcel();
  const cropsQuery = useQueryCatalogCrops(parcel?.district ?? null);
  const historyQuery = useQuery({
    queryKey: ['crop-history', parcel?.id],
    queryFn: () => api.getCropHistory(parcel!.id),
    enabled: Boolean(parcel),
    retry: false,
  });

  const crops = cropsQuery.data?.crops ?? [];
  const prices = cropsQuery.data?.prices_chacra_2025 ?? [];
  const cropParam = searchParams.get('crop');

  const rows = useMemo(() => {
    const economics = (parcel?.preferences?.economics ?? {}) as Record<string, CropEconomics>;
    const historyIds = [...new Set((historyQuery.data ?? []).map((row) => row.crop_id))]
      .filter((id): id is string => Boolean(id));
    const fallbackIds = Object.keys(economics);
    const ids = historyIds.length > 0 ? [...historyIds] : [...fallbackIds];
    // The agent can deep-link one crop even before the farmer records history.
    // Accept the backend id and, defensively, the Spanish catalog id.
    const linkedCrop = cropParam
      ? crops.find(
          (crop) => crop.id === cropParam || crop.catalog_id === cropParam,
        )
      : undefined;
    if (linkedCrop && !ids.includes(linkedCrop.id)) ids.unshift(linkedCrop.id);
    return ids
      .map((cropId) => crops.find((crop) => crop.id === cropId))
      .filter((crop): crop is Crop => Boolean(crop));
  }, [crops, cropParam, historyQuery.data, parcel]);

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savedDrafts, setSavedDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [appliedCropParam, setAppliedCropParam] = useState<string | null>(null);
  const guided = searchParams.get('guiado') === '1';

  // Seed the drafts from the saved preferences (once rows are known). Crops
  // added later only get their own seed, so farmer edits are never overwritten.
  useEffect(() => {
    if (rows.length === 0) return;
    const economics = (parcel?.preferences?.economics ?? {}) as Record<string, CropEconomics>;
    const seedFor = (crop: Crop): Draft => {
      const saved = economics[crop.id];
      const reference = resolvePriceReference(crop, prices, parcel?.district ?? null);
      return {
        ...emptyDraft(),
        yield: saved?.yield_kg_ha != null ? String(saved.yield_kg_ha) : '',
        price:
          saved?.price_pen_kg != null
            ? String(saved.price_pen_kg)
            : reference
              ? String(reference.value)
              : '',
        costs: saved?.costs_pen != null ? String(saved.costs_pen) : '',
      };
    };
    setDrafts((current) => {
      const next = { ...current };
      let changed = false;
      for (const crop of rows) {
        if (!(crop.id in next)) {
          next[crop.id] = seedFor(crop);
          changed = true;
        }
      }
      return changed ? next : current;
    });
    setSavedDrafts((current) => {
      const next = { ...current };
      let changed = false;
      for (const crop of rows) {
        if (!(crop.id in next)) {
          next[crop.id] = seedFor(crop);
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [parcel, prices, rows]);

  // `?crop=onion` means: open guided mode on that crop. The prefill itself is
  // done by the seeding effect above, so the row is not "Modificado" until the
  // farmer edits it.
  useEffect(() => {
    if (!cropParam || appliedCropParam === cropParam) return;
    const index = rows.findIndex(
      (crop) => crop.id === cropParam || crop.catalog_id === cropParam,
    );
    if (index < 0) return;
    setStep(index);
    setAppliedCropParam(cropParam);
    if (searchParams.get('guiado') !== '1') {
      const params = new URLSearchParams(searchParams);
      params.set('guiado', '1');
      setSearchParams(params, { replace: true });
    }
  }, [appliedCropParam, cropParam, rows, searchParams, setSearchParams]);

  const setDraft = (cropId: string, patch: Partial<Draft>) => {
    setDrafts((current) => {
      const base = current[cropId] ?? emptyDraft();
      return { ...current, [cropId]: { ...base, ...patch } };
    });
  };

  const setGuided = (next: boolean) => {
    const params = new URLSearchParams(searchParams);
    if (next) params.set('guiado', '1');
    else params.delete('guiado');
    setSearchParams(params, { replace: true });
    if (next && step > rows.length - 1) setStep(0);
  };

  const total = rows.length;
  const currentIndex = total === 0 ? 0 : Math.min(Math.max(step, 0), total - 1);
  const currentCrop = total > 0 ? rows[currentIndex] : undefined;
  const isLastStep = currentIndex >= total - 1;

  const handleSave = async () => {
    if (!parcel) return;

    // Convert and validate before touching the network, so a bad local unit
    // never becomes a broken canonical value in the outbox.
    const economics: Record<string, CropEconomics> = {};
    for (const crop of rows) {
      const draft = drafts[crop.id];
      if (!draft) continue;
      const usesSack =
        draft.yieldUnit === 'sacos_ha' || draft.priceUnit === 'pen_saco';
      if (usesSack && sacoKgValue(draft.sacoKg) === null) {
        toast.error(t('El saco debe pesar más de 0 kg.'));
        return;
      }
      const kgHa = kgHaFrom(draft.yield, draft.yieldUnit, draft.sacoKg);
      if (draft.yield.trim() && kgHa === null) {
        toast.error(
          t('El rendimiento debe ser un número válido. Usa coma o punto, por ejemplo 12000.'),
        );
        return;
      }
      if (kgHa !== null && kgHa < 0) {
        toast.error(t('El rendimiento no puede ser negativo.'));
        return;
      }
      const penKg = penKgFrom(draft.price, draft.priceUnit, draft.sacoKg);
      if (draft.price.trim() && penKg === null) {
        toast.error(
          t('El precio debe ser un número válido. Usa coma o punto, por ejemplo 1,20.'),
        );
        return;
      }
      if (penKg !== null && penKg < 0) {
        toast.error(t('El precio no puede ser negativo.'));
        return;
      }
      const costs = parseDecimal(draft.costs);
      if (draft.costs.trim() && costs === null) {
        toast.error(
          t('El costo total debe ser un número válido. Usa coma o punto, por ejemplo 9000.'),
        );
        return;
      }
      if (costs !== null && costs < 0) {
        toast.error(t('El costo total no puede ser negativo.'));
        return;
      }

      const reference = resolvePriceReference(crop, prices, parcel.district ?? null);
      const edited = penKg !== null && reference !== null && !sameValue(penKg, reference.value);
      economics[crop.id] = {
        yield_kg_ha: kgHa,
        price_pen_kg: penKg,
        costs_pen: costs,
        price_source:
          penKg === null
            ? undefined
            : edited
              ? 'farmer'
              : reference
                ? 'catalog_reference'
                : 'farmer',
        price_confirmed: penKg !== null,
        price_reference: reference
          ? {
              crop_id: crop.catalog_id ?? crop.id,
              district: reference.place,
              period: reference.year,
              value: reference.value,
              source: reference.sourceId,
              scope: reference.scope,
              is_local: reference.isLocal,
            }
          : undefined,
        marketable_share: 1.0,
      };
    }

    setSaving(true);

    const preferences = { ...(parcel.preferences ?? {}), economics };
    const body = { preferences };
    const path = `/api/v1/parcels/${parcel.id}`;

    const queueForLater = async () => {
      await enqueue(path, 'PATCH', body);
      setSavedDrafts(drafts);
      toast.info(t('Guardada en el teléfono. Se enviará cuando tengas señal.'));
    };

    try {
      if (!online) {
        await queueForLater();
        return;
      }
      try {
        await api.updateParcelPreferences(parcel.id, preferences as never);
      } catch (cause) {
        if (!shouldQueue(cause)) throw cause;
        await queueForLater();
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['parcels'] }),
        refresh(),
      ]);
      setSavedDrafts(drafts);
      toast.success(t('Precios guardados. Tu comparación se actualizará con estos datos.'));
    } catch (cause) {
      toast.error(saveErrorMessage(cause, t('No pudimos guardar los precios.')));
    } finally {
      setSaving(false);
    }
  };

  if (!parcel) {
    return (
      <Screen header={<AppHeader subtitle={t('Precios y costos')} onBack={() => navigate('/parcela')} />}>
        <AppAlert tone="info">{t('Primero crea tu parcela')}</AppAlert>
      </Screen>
    );
  }

  if (cropsQuery.isLoading || historyQuery.isLoading) {
    return (
      <Screen header={<AppHeader subtitle={t('Precios y costos')} onBack={() => navigate('/parcela')} />}>
        <StateView
          loading
          title={t('Cargando tus cultivos')}
          description={t('Leyendo tus datos.')}
        />
      </Screen>
    );
  }

  const yieldUnitOptions: { value: YieldUnit; label: string }[] = [
    { value: 'kg_ha', label: t('kg por ha') },
    { value: 'arrobas_ha', label: t('arrobas por ha') },
    { value: 'sacos_ha', label: t('sacos por ha') },
  ];
  const priceUnitOptions: { value: PriceUnit; label: string }[] = [
    { value: 'pen_kg', label: t('S/ por kg') },
    { value: 'pen_arroba', label: t('S/ por arroba') },
    { value: 'pen_saco', label: t('S/ por saco') },
  ];

  const renderCrop = (crop: Crop) => {
    const draft = drafts[crop.id] ?? emptyDraft();
    const saved = savedDrafts[crop.id];
    const reference = resolvePriceReference(crop, prices, parcel.district ?? null);
    const kgHa = kgHaFrom(draft.yield, draft.yieldUnit, draft.sacoKg);
    const penKg = penKgFrom(draft.price, draft.priceUnit, draft.sacoKg);
    const dirty = Boolean(
      saved &&
        (!sameValue(kgHa, kgHaFrom(saved.yield, saved.yieldUnit, saved.sacoKg)) ||
          !sameValue(penKg, penKgFrom(saved.price, saved.priceUnit, saved.sacoKg)) ||
          !sameValue(parseDecimal(draft.costs), parseDecimal(saved.costs))),
    );
    const modifiedFromCatalog =
      penKg !== null && reference !== null && !sameValue(penKg, reference.value);
    const sackNeeded =
      draft.yieldUnit === 'sacos_ha' || draft.priceUnit === 'pen_saco';
    const jornales = parseDecimal(draft.jornales);
    const jornalRate = parseDecimal(draft.jornalPen);
    const jornalTotal =
      jornales !== null && jornalRate !== null && jornales >= 0 && jornalRate >= 0
        ? roundNumber(jornales * jornalRate, 2)
        : null;

    const referenceSubtitle = reference
      ? reference.year
        ? t('Precio propuesto (editable): S/ {{value}} / kg · {{place}} {{year}}', {
            value: reference.value.toFixed(2),
            place: reference.place ?? t('Catálogo'),
            year: reference.year,
          })
        : t('Precio propuesto (editable): S/ {{value}} / kg · {{place}}', {
            value: reference.value.toFixed(2),
            place: reference.place ?? t('Catálogo'),
          })
      : t('Sin referencia de catálogo: ingresa tu precio');

    return (
      <SectionCard
        key={crop.id}
        title={
          <span className="flex items-center gap-2">
            <CropThumb cropId={crop.id} size={40} />
            <span className="min-w-0 truncate">{crop.local_name}</span>
            {dirty ? <Badge tone="warning">{t('Modificado')}</Badge> : null}
          </span>
        }
        subtitle={referenceSubtitle}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField<YieldUnit>
            label={t('¿En qué unidad cosechas?')}
            value={draft.yieldUnit}
            onValueChange={(yieldUnit) => setDraft(crop.id, { yieldUnit })}
            options={yieldUnitOptions}
          />
          <SelectField<PriceUnit>
            label={t('¿En qué unidad vendes?')}
            value={draft.priceUnit}
            onValueChange={(priceUnit) => setDraft(crop.id, { priceUnit })}
            options={priceUnitOptions}
          />
        </div>

        {sackNeeded ? (
          <SelectField
            label={t('Tamaño del saco')}
            value={draft.sacoKg}
            onValueChange={(sacoKg) => setDraft(crop.id, { sacoKg })}
            options={SACO_KG_OPTIONS.map((kg) => ({
              value: String(kg),
              label: t('Saco de {{kg}} kg', { kg }),
            }))}
            hint={t('50 kg es el saco local habitual; elige 100 kg si el tuyo es más grande.')}
          />
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <NumberField
            label={t('Rendimiento por hectárea')}
            value={draft.yield}
            onValueChange={(next) => setDraft(crop.id, { yield: next })}
            placeholder={
              draft.yieldUnit === 'kg_ha'
                ? t('Ej. 12000')
                : draft.yieldUnit === 'arrobas_ha'
                  ? t('Ej. 1000')
                  : t('Ej. 240')
            }
            suffix={
              draft.yieldUnit === 'kg_ha'
                ? 'kg/ha'
                : draft.yieldUnit === 'arrobas_ha'
                  ? t('arrobas/ha')
                  : t('sacos/ha')
            }
          />
          <NumberField
            label={
              reference ? t('Precio propuesto (editable)') : t('Precio de venta')
            }
            value={draft.price}
            onValueChange={(next) => setDraft(crop.id, { price: next })}
            placeholder={
              draft.priceUnit === 'pen_kg'
                ? t('Ej. 1.20')
                : draft.priceUnit === 'pen_arroba'
                  ? t('Ej. 14')
                  : t('Ej. 60')
            }
            suffix={
              draft.priceUnit === 'pen_kg'
                ? 'S/ kg'
                : draft.priceUnit === 'pen_arroba'
                  ? 'S/ arroba'
                  : 'S/ saco'
            }
          />
          <NumberField
            label={t('Costo total de producción (S/)')}
            value={draft.costs}
            onValueChange={(next) => setDraft(crop.id, { costs: next })}
            placeholder={t('Ej. 9000')}
            suffix="S/"
          />
        </div>

        {kgHa !== null || penKg !== null ? (
          <p className="text-sm leading-5 text-muted-foreground">
            {t('≈ {{yield}} · {{price}}', {
              yield:
                kgHa !== null ? formatNumber(kgHa, 'kg/ha', 0) : t('rendimiento pendiente'),
              price:
                penKg !== null
                  ? t('S/ {{value}} por kg', { value: penKg.toFixed(2) })
                  : t('precio pendiente'),
            })}
          </p>
        ) : null}

        {reference && modifiedFromCatalog ? (
          <AppButton
            tone="outline"
            icon={Banknote}
            onClick={() =>
              setDraft(crop.id, {
                price: String(reference.value),
                priceUnit: 'pen_kg',
              })
            }
          >
            {t('Usar precio del catálogo')}
          </AppButton>
        ) : null}

        <Disclosure title={t('¿Jornales? Jornales × S/ jornal')}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberField
              label={t('Número de jornales')}
              value={draft.jornales}
              onValueChange={(next) => setDraft(crop.id, { jornales: next })}
              placeholder={t('Ej. 40')}
            />
            <NumberField
              label={t('Pago por jornal (S/)')}
              value={draft.jornalPen}
              onValueChange={(next) => setDraft(crop.id, { jornalPen: next })}
              placeholder={t('Ej. 50')}
              suffix="S/"
            />
          </div>
          <p className="text-sm leading-5 text-muted-foreground">
            {jornalTotal !== null
              ? t('{{jornales}} jornales × S/ {{rate}} = {{total}}', {
                  jornales,
                  rate: formatNumber(jornalRate, '', 2),
                  total: formatMoney(jornalTotal),
                })
              : t('Escribe los jornales y el pago por jornal para calcular el total.')}
          </p>
          <AppButton
            tone="outline"
            fullWidth
            disabled={jornalTotal === null}
            onClick={() => {
              if (jornalTotal !== null) {
                setDraft(crop.id, { costs: String(jornalTotal) });
              }
            }}
          >
            {t('Usar este total en el costo')}
          </AppButton>
          <p className="text-sm leading-5 text-muted-foreground">
            {t('Solo llena el costo total: los jornales no se guardan por separado.')}
          </p>
        </Disclosure>
      </SectionCard>
    );
  };

  const noHistory = rows.length === 0;
  const loadFailed = cropsQuery.isError || historyQuery.isError;
  const canNavigate = !noHistory && !loadFailed;

  const goPrevious = () => setStep(Math.max(currentIndex - 1, 0));
  const goNext = () => setStep(Math.min(currentIndex + 1, total - 1));

  return (
    <Screen
      header={<AppHeader subtitle={t('Precios y costos')} onBack={() => navigate('/parcela')} />}
    >
      {canNavigate ? (
        <ChipBar label={t('Cómo quieres completar tus precios')}>
          <Chip selected={!guided} onClick={() => setGuided(false)}>
            {t('Ver todos')}
          </Chip>
          <Chip selected={guided} onClick={() => setGuided(true)}>
            {t('Ir paso a paso')}
          </Chip>
        </ChipBar>
      ) : null}

      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <Illustration name="prices" size={56} />
        <p className="flex-1 text-sm leading-5 text-muted-foreground">
          {t(
            'El precio propuesto viene de una referencia histórica del catálogo y puedes editarlo. Los costos de producción los ingresas tú.',
          )}
        </p>
      </div>

      {!online ? <AppAlert tone="info">{t('Sin conexión: los cambios se guardan en el teléfono.')}</AppAlert> : null}

      {loadFailed ? (
        <SectionCard title={t('Precios y costos')}>
          <AppAlert tone="error">{t('No pudimos cargar tus datos')}</AppAlert>
          <AppButton
            tone="outline"
            fullWidth
            onClick={() => {
              void cropsQuery.refetch();
              void historyQuery.refetch();
            }}
          >
            {t('Reintentar')}
          </AppButton>
        </SectionCard>
      ) : noHistory ? (
        <SectionCard title={t('Precios y costos')}>
          <p className="text-sm leading-5 text-muted-foreground">
            {t(
              'Primero registra qué sembraste. Así sabemos para qué cultivos pedir precios y costos.',
            )}
          </p>
          <AppButton fullWidth onClick={() => navigate('/parcela/ficha')}>
            {t('Completar historial')}
          </AppButton>
        </SectionCard>
      ) : (
        <>
          {guided && currentCrop ? (
            <>
              {renderCrop(currentCrop)}
              {/*
                StepProgress supplies the step counter and the progress bar. Its
                built-in Anterior/Siguiente row is hidden on purpose: the sticky
                bar below is the single, always-reachable control surface.
              */}
              <div className="[&>div>div:last-child]:hidden">
                <StepProgress
                  current={currentIndex + 1}
                  total={total}
                  onPrevious={goPrevious}
                  onNext={goNext}
                  previousDisabled={currentIndex === 0}
                >
                  {null}
                </StepProgress>
              </div>
            </>
          ) : (
            <div className="space-y-4">{rows.map((crop) => renderCrop(crop))}</div>
          )}
        </>
      )}

      <Disclosure title={t('¿Por qué te pregunto esto?')}>
        <p className="text-sm leading-5 text-muted-foreground">
          {t(
            'Si falta un dato, el margen se mostrará como pendiente; no como cero. Puedes usar punto o coma: 1,5 vale como 1.5.',
          )}
        </p>
      </Disclosure>

      {context?.missing_inputs?.length ? (
        <AppAlert tone="warning">
          {t('Falta: {{missing}}', { missing: formatMissing(context.missing_inputs) })}
        </AppAlert>
      ) : null}

      {canNavigate ? (
        guided ? (
          <StickyActionBar
            primary={
              isLastStep ? (
                <AppButton
                  fullWidth
                  size="lg"
                  loading={saving}
                  onClick={() => void handleSave()}
                >
                  {t('Guardar precios y costos')}
                </AppButton>
              ) : (
                <AppButton fullWidth size="lg" icon={ChevronRight} onClick={goNext}>
                  {t('Siguiente')}
                </AppButton>
              )
            }
            secondary={
              <AppButton
                tone="outline"
                fullWidth
                icon={ChevronLeft}
                disabled={currentIndex === 0}
                onClick={goPrevious}
              >
                {t('Anterior')}
              </AppButton>
            }
            hint={
              isLastStep
                ? t('Se guardan todos los cultivos juntos.')
                : t('Completa este cultivo y toca “Siguiente”. Al final guardas todo junto.')
            }
          />
        ) : (
          <StickyActionBar
            primary={
              <AppButton
                fullWidth
                size="lg"
                loading={saving}
                onClick={() => void handleSave()}
              >
                {t('Guardar precios y costos')}
              </AppButton>
            }
            hint={t('Se guardan todos los cultivos juntos.')}
          />
        )
      ) : null}
    </Screen>
  );
}
