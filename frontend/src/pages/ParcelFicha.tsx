/**
 * Ficha de parcela — web port of the native parcel-profile flow, condensed into
 * one page: historial, agua, suelo y prioridades. Each block saves immediately,
 * and "no sé" is always a valid, recorded answer (never an invented number).
 *
 * Feedback is a toast: success when the server saved, info when the write waits
 * in the offline outbox, error when nothing was recorded.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Plus, Trash2 } from 'lucide-react';
import { AppButton } from '../components/app/AppButton';
import { AppHeader } from '../components/app/AppHeader';
import { SectionCard } from '../components/app/SectionCard';
import { AppAlert, Disclosure } from '../components/app/Feedback';
import { NumberField, SelectField } from '../components/app/FormField';
import { CropThumb } from '../components/app/CropThumb';
import { Badge } from '../components/app/Badge';
import { ProgressRing } from '../components/app/ProgressRing';
import { StickyActionBar } from '../components/app/StickyActionBar';
import { WaterEstimator } from '../components/app/WaterEstimator';
import { Screen } from '../components/app/Screen';
import { ApiError, api } from '../lib/api';
import { formatDate, formatNumber, parseEsNumber } from '../lib/format';
import { enqueue } from '../lib/outbox';
import { useOnline } from '../lib/useOnline';
import { profileItems, profileProgress } from '../lib/profileStatus';
import { useQueryCatalogCrops } from '../lib/useQueries';
import type { WaterEstimate } from '../lib/units';
import { useComparison } from '../providers/ComparisonProvider';
import { useParcel } from '../providers/ParcelProvider';
import { useToast } from '../providers/ToastProvider';

const PRIORITIES = [
  { key: 'water', label: 'Ahorrar agua' },
  { key: 'soil', label: 'Mejorar el suelo' },
  { key: 'margin', label: 'Ganar más' },
  { key: 'budget', label: 'Cuidar mi presupuesto' },
  { key: 'pest', label: 'Cortar plagas' },
  { key: 'forage', label: 'Tener forraje' },
  { key: 'market', label: 'Vender mejor' },
  { key: 'labor', label: 'Poca mano de obra' },
  { key: 'tractor', label: 'Sin tractor' },
  { key: 'local_market', label: 'Mercado local' },
  { key: 'tight_budget', label: 'Presupuesto ajustado' },
] as const;

type WriteOutcome = 'saved' | 'queued';

type PendingWrite = {
  path: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  send: () => Promise<unknown>;
};

type SaveWaterInput =
  | { unknown: true }
  | { unknown: false; estimate: WaterEstimate; efficiency: number | null };

/** Replay network/5xx failures later; never replay a rejected payload (4xx). */
function shouldQueue(cause: unknown): boolean {
  if (!(cause instanceof ApiError)) return true;
  return cause.status >= 500 || cause.status === 408 || cause.status === 429;
}

function writeErrorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof ApiError && typeof cause.message === 'string' && cause.message.trim()) {
    return cause.message;
  }
  return fallback;
}

export default function ParcelFicha() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const online = useOnline();
  const toast = useToast();
  const { parcel, context, refresh } = useParcel();
  const { markStale } = useComparison();
  const cropsQuery = useQueryCatalogCrops();

  const [cropId, setCropId] = useState('');
  const [season, setSeason] = useState<'this_year' | 'last_year' | 'two_years' | 'unknown'>(
    'this_year',
  );
  const [ph, setPh] = useState('');
  const [organicMatter, setOrganicMatter] = useState('');
  const [priorities, setPriorities] = useState<Record<string, number>>(
    () => ((parcel?.preferences?.priorities as Record<string, number> | undefined) ?? {}),
  );
  const [prioritiesParcelId, setPrioritiesParcelId] = useState<string | null>(
    parcel?.id ?? null,
  );

  // On a hard reload the parcel can arrive after mount; load its saved
  // priorities once so saving never overwrites them with an empty selection.
  useEffect(() => {
    if (!parcel || prioritiesParcelId === parcel.id) return;
    setPriorities(
      (parcel.preferences?.priorities as Record<string, number> | undefined) ?? {},
    );
    setPrioritiesParcelId(parcel.id);
  }, [parcel, prioritiesParcelId]);

  const crops = cropsQuery.data?.crops ?? [];
  const history = context?.history ?? [];
  const soil = context?.soil ?? [];
  const waterEntries = context?.water ?? [];
  const items = profileItems(parcel, context);
  const progress = profileProgress(parcel, context);
  const basePath = `/api/v1/parcels/${parcel?.id ?? ''}`;

  /**
   * Sends every write, or queues it in the offline outbox when there is no
   * signal (or the server is unavailable). One outcome for the whole block.
   */
  const runWrites = async (writes: PendingWrite[]): Promise<WriteOutcome> => {
    let queued = false;
    for (const write of writes) {
      if (!online) {
        await enqueue(write.path, write.method, write.body);
        queued = true;
        continue;
      }
      try {
        await write.send();
      } catch (cause) {
        if (!shouldQueue(cause)) throw cause;
        await enqueue(write.path, write.method, write.body);
        queued = true;
      }
    }
    return queued ? 'queued' : 'saved';
  };

  const afterWrite = (outcome: WriteOutcome, message: string) => {
    void Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: ['parcels'] }),
      queryClient.invalidateQueries({ queryKey: ['context', parcel?.id] }),
      refresh(),
    ]);
    if (outcome === 'queued') {
      toast.info(t('Guardada en el teléfono. Se enviará cuando tengas señal.'));
      return;
    }
    markStale();
    toast.success(message);
  };

  const addHistory = useMutation({
    mutationFn: () => {
      const year = new Date().getFullYear();
      const start =
        season === 'this_year'
          ? `${year}-01-01`
          : season === 'last_year'
            ? `${year - 1}-01-01`
            : season === 'two_years'
              ? `${year - 2}-01-01`
              : null;
      const end =
        season === 'this_year'
          ? `${year}-12-31`
          : season === 'last_year'
            ? `${year - 1}-12-31`
            : season === 'two_years'
              ? `${year - 2}-12-31`
              : null;
      const body = {
        crop_id: cropId || null,
        family: null,
        date_start: start,
        date_end: end,
        notes: null,
        source: 'farmer',
      };
      return runWrites([
        {
          path: `${basePath}/crop-history`,
          method: 'POST',
          body,
          send: () =>
            api.addCropHistory(parcel!.id, {
              cropId: cropId || null,
              dateStart: start,
              dateEnd: end,
            }),
        },
      ]);
    },
    onSuccess: (outcome) => {
      setCropId('');
      afterWrite(outcome, t('Campaña agregada a tu historial.'));
    },
    onError: (cause) =>
      toast.error(writeErrorMessage(cause, t('No pudimos guardar este paso.'))),
  });

  const removeHistory = useMutation({
    mutationFn: (rowId: string) =>
      runWrites([
        {
          path: `${basePath}/crop-history/${rowId}`,
          method: 'DELETE',
          send: () => api.deleteCropHistory(parcel!.id, rowId),
        },
      ]),
    onSuccess: (outcome) => afterWrite(outcome, t('Campaña eliminada.')),
    onError: (cause) =>
      toast.error(writeErrorMessage(cause, t('No pudimos borrar la campaña.'))),
  });

  const saveWater = useMutation({
    mutationFn: (input: SaveWaterInput) => {
      const today = new Date();
      const start = new Date(today);
      start.setDate(start.getDate() - 180);
      const startAt = start.toISOString().slice(0, 10);
      const endAt = today.toISOString().slice(0, 10);
      const mm = input.unknown ? null : input.estimate.mm;
      const volumeM3 = input.unknown ? null : input.estimate.m3;
      const method = input.unknown ? 'unknown' : input.estimate.method;
      const efficiency = input.unknown ? null : input.efficiency;
      const confidence = input.unknown ? 'unknown' : 'medium';
      const notes = input.unknown ? null : input.estimate.note;
      const body = {
        start_at: startAt,
        end_at: endAt,
        mm,
        volume_m3: volumeM3,
        method,
        efficiency,
        confidence,
        notes,
      };
      return runWrites([
        {
          path: `${basePath}/water`,
          method: 'POST',
          body,
          send: () =>
            api.addWater(parcel!.id, {
              startAt,
              endAt,
              mm,
              volumeM3,
              method,
              efficiency,
              confidence,
              notes,
            }),
        },
      ]);
    },
    onSuccess: (outcome, input) => {
      afterWrite(
        outcome,
        input.unknown ? t('Agua guardada como «no sé».') : t('Agua guardada.'),
      );
    },
    onError: (cause) =>
      toast.error(writeErrorMessage(cause, t('No pudimos guardar este paso.'))),
  });

  const saveSoil = useMutation({
    mutationFn: (fields: { variable: 'ph' | 'organic_matter'; raw: string }[]) =>
      runWrites(
        fields.map((field) => {
          const value = parseEsNumber(field.raw);
          const unit = field.variable === 'ph' ? 'pH' : '%';
          return {
            path: `${basePath}/soil`,
            method: 'POST' as const,
            body: { variable: field.variable, value, unit, method: 'reported', notes: null },
            send: () =>
              api.addSoil(parcel!.id, {
                variable: field.variable,
                value,
                unit,
                method: 'reported',
              }),
          };
        }),
      ),
    onSuccess: (outcome) => {
      setPh('');
      setOrganicMatter('');
      afterWrite(outcome, t('Dato de suelo guardado.'));
    },
    onError: (cause) =>
      toast.error(writeErrorMessage(cause, t('No pudimos guardar este paso.'))),
  });

  const declareNoSoilTest = useMutation({
    mutationFn: () =>
      runWrites([
        {
          path: `${basePath}/soil`,
          method: 'POST',
          body: { variable: 'other', value: null, unit: null, method: 'unknown', notes: null },
          send: () =>
            api.addSoil(parcel!.id, {
              variable: 'other',
              value: null,
              unit: null,
              method: 'unknown',
            }),
        },
      ]),
    onSuccess: (outcome) => afterWrite(outcome, t('Guardado: sin análisis de suelo.')),
    onError: (cause) =>
      toast.error(writeErrorMessage(cause, t('No pudimos guardar este paso.'))),
  });

  const savePriorities = useMutation({
    mutationFn: () =>
      runWrites([
        {
          path: basePath,
          method: 'PATCH',
          body: { preferences: { priorities } },
          send: () => api.updateParcelPreferences(parcel!.id, { priorities } as never),
        },
      ]),
    onSuccess: (outcome) => afterWrite(outcome, t('Prioridades guardadas.')),
    onError: (cause) =>
      toast.error(writeErrorMessage(cause, t('No pudimos guardar este paso.'))),
  });

  const togglePriority = (key: string) => {
    setPriorities((current) => {
      const next = { ...current };
      if (next[key]) delete next[key];
      else if (Object.keys(next).length < 3) next[key] = 1;
      return next;
    });
  };

  const handleSaveSoil = () => {
    const fields: { variable: 'ph' | 'organic_matter'; raw: string }[] = [];
    if (ph.trim()) {
      const value = parseEsNumber(ph);
      if (value === null) {
        toast.error(t('El pH debe ser un número.'));
        return;
      }
      if (value < 3 || value > 10) {
        toast.error(t('El pH debe estar entre 3 y 10. Revisa el valor del análisis.'));
        return;
      }
      fields.push({ variable: 'ph', raw: ph });
    }
    if (organicMatter.trim()) {
      const value = parseEsNumber(organicMatter);
      if (value === null) {
        toast.error(t('La materia orgánica debe ser un número.'));
        return;
      }
      if (value < 0 || value > 50) {
        toast.error(t('La materia orgánica debe estar entre 0 y 50 %.'));
        return;
      }
      fields.push({ variable: 'organic_matter', raw: organicMatter });
    }
    if (fields.length === 0) {
      toast.info(t('Agrega al menos un dato del análisis o elige “No tengo”.'));
      return;
    }
    saveSoil.mutate(fields);
  };

  if (!parcel) {
    return (
      <Screen header={<AppHeader subtitle={t('Ficha de parcela')} onBack={() => navigate('/parcela')} />}>
        <AppAlert tone="info">{t('Primero crea una parcela.')}</AppAlert>
        <AppButton fullWidth onClick={() => navigate('/parcela')}>
          {t('Crear mi parcela')}
        </AppButton>
      </Screen>
    );
  }

  const soilEmpty = !ph.trim() && !organicMatter.trim();

  return (
    <Screen
      header={<AppHeader subtitle={t('Ficha de parcela')} onBack={() => navigate('/parcela')} />}
    >
      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <ProgressRing value={progress} size={64} label={t('Ficha completa')} />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold leading-6 text-foreground">
              {t('Ficha {{progress}}% completa', { progress })}
            </h2>
            <p className="text-sm leading-5 text-muted-foreground">
              {progress === 100
                ? t('Ya tienes lo necesario. Puedes revisar y actualizar cuando quieras.')
                : t('Completa los cuatro datos para mejores recomendaciones.')}
            </p>
          </div>
        </div>
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li key={item.key}>
              <Badge
                tone={item.done ? 'success' : 'warning'}
                icon={item.done ? Check : undefined}
              >
                {t(item.label)}
              </Badge>
            </li>
          ))}
        </ul>
      </section>

      {!online ? <AppAlert tone="info">{t('Sin conexión: los cambios se guardan en el teléfono.')}</AppAlert> : null}

      <SectionCard title={t('Tu historial')} subtitle={t('¿Qué sembraste en las últimas campañas?')}>
        {history.length > 0 ? (
          <div className="space-y-2">
            {history.map((row) => {
              const crop = crops.find((item) => item.id === row.crop_id);
              return (
                <div
                  key={row.id}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5"
                >
                  <CropThumb cropId={row.crop_id ?? ''} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-foreground">
                      {crop?.local_name ?? row.crop_id ?? t('Sin cultivo')}
                    </p>
                    <p className="text-sm leading-5 text-muted-foreground">
                      {row.date_start ? formatDate(row.date_start) : t('Sin año')}
                      {row.date_end ? ` → ${formatDate(row.date_end)}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={t('Quitar la campaña')}
                    onClick={() => removeHistory.mutate(row.id)}
                    disabled={removeHistory.isPending}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-warning transition-colors hover:bg-warning/10 disabled:opacity-50"
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm leading-5 text-muted-foreground">
            {t('Todavía no registraste campañas.')}
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField
            label={t('¿Qué cultivo sembraste?')}
            value={cropId}
            onValueChange={setCropId}
            options={[
              { value: '', label: t('Elige un cultivo') },
              ...crops.map((crop) => ({ value: crop.id, label: crop.local_name })),
            ]}
          />
          <SelectField
            label={t('¿De qué campaña es?')}
            value={season}
            onValueChange={setSeason}
            options={[
              { value: 'this_year' as const, label: t('Este año') },
              { value: 'last_year' as const, label: t('El año pasado') },
              { value: 'two_years' as const, label: t('Hace 2 años') },
              { value: 'unknown' as const, label: t('No recuerdo') },
            ]}
          />
        </div>
        <AppButton
          tone="outline"
          icon={Plus}
          fullWidth
          loading={addHistory.isPending}
          disabled={!cropId}
          onClick={() => addHistory.mutate()}
        >
          {t('Agregar al historial')}
        </AppButton>
        <Disclosure title={t('¿Qué campaña debo poner?')}>
          <p className="text-sm leading-5 text-muted-foreground">
            {t(
              'Pon la campaña en la que sembraste y cosechaste ese cultivo. Si no recuerdas el año exacto, elige “No recuerdo”; no inventamos una fecha.',
            )}
          </p>
        </Disclosure>
      </SectionCard>

      <SectionCard title={t('Tu agua')} subtitle={t('¿Cuánta agua tienes para tu parcela?')}>
        {waterEntries.length > 0 ? (
          <div className="space-y-1">
            {waterEntries.map((entry) => {
              const parts: string[] = [];
              if (entry.mm != null) parts.push(formatNumber(entry.mm, 'mm', 1));
              if (entry.volume_m3 != null) {
                parts.push(formatNumber(entry.volume_m3, 'm³', 0));
              }
              if (entry.method === 'unknown') parts.push(t('No sé (declarado)'));
              return (
                <p
                  key={entry.id}
                  className="rounded-xl bg-primary-50 px-3 py-2 text-sm leading-5 text-foreground"
                >
                  {parts.length > 0 ? parts.join(' · ') : t('Sin dato')}
                </p>
              );
            })}
          </div>
        ) : null}
        <WaterEstimator
          areaHa={parcel.area_ha}
          savingEstimate={saveWater.isPending && saveWater.variables?.unknown === false}
          savingUnknown={saveWater.isPending && saveWater.variables?.unknown === true}
          onSave={(estimate, efficiency) =>
            saveWater.mutate({ unknown: false, estimate, efficiency })
          }
          onSaveUnknown={() => saveWater.mutate({ unknown: true })}
        />
      </SectionCard>

      <SectionCard title={t('Tu suelo')} subtitle={t('¿Tienes un análisis de suelo?')}>
        {soil.length > 0 ? (
          <div className="space-y-1">
            {soil.map((entry) => (
              <p
                key={entry.id}
                className="rounded-xl bg-primary-50 px-3 py-2 text-sm leading-5 text-foreground"
              >
                {entry.variable}:{' '}
                {entry.value != null
                  ? formatNumber(entry.value, entry.unit ?? '', 2)
                  : t('Sin análisis')}
              </p>
            ))}
          </div>
        ) : null}
        <NumberField
          label={t('pH del suelo')}
          hint={t('El pH debe estar entre 3 y 10.')}
          value={ph}
          onValueChange={setPh}
          placeholder={t('Ej. 7.2')}
        />
        <NumberField
          label={t('Materia orgánica (%)')}
          value={organicMatter}
          onValueChange={setOrganicMatter}
          placeholder={t('Ej. 2.5')}
        />
        {soilEmpty && soil.length === 0 ? (
          <p className="text-sm leading-5 text-muted-foreground">
            {t('Agrega al menos un dato del análisis o elige “No tengo”.')}
          </p>
        ) : null}
        <AppButton
          fullWidth
          loading={saveSoil.isPending}
          disabled={soilEmpty}
          onClick={handleSaveSoil}
        >
          {t('Guardar datos del análisis')}
        </AppButton>
        <AppButton
          tone="outline"
          fullWidth
          loading={declareNoSoilTest.isPending}
          onClick={() => declareNoSoilTest.mutate()}
        >
          {t('No tengo análisis')}
        </AppButton>
        <Disclosure title={t('¿Por qué te pregunto esto?')}>
          <p className="text-sm leading-5 text-muted-foreground">
            {t(
              'Sin análisis, el suelo se muestra como “por revisar”. Si eliges “No tengo” o “No sé”, lo guardamos así y no te lo volvemos a pedir.',
            )}
          </p>
        </Disclosure>
      </SectionCard>

      <SectionCard
        title={t('Tus prioridades')}
        subtitle={t('Elige hasta 3 prioridades')}
      >
        <div className="flex flex-wrap gap-2">
          {PRIORITIES.map((option) => {
            const selected = Boolean(priorities[option.key]);
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => togglePriority(option.key)}
                aria-pressed={selected}
                className={`min-h-12 rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${
                  selected
                    ? 'border-primary bg-accent text-primary'
                    : 'border-border bg-card text-foreground hover:bg-primary-50'
                }`}
              >
                {t(option.label)}
              </button>
            );
          })}
        </div>
        <AppButton fullWidth loading={savePriorities.isPending} onClick={() => savePriorities.mutate()}>
          {t('Guardar prioridades')}
        </AppButton>
      </SectionCard>

      <StickyActionBar
        primary={
          <AppButton fullWidth size="lg" icon={Check} onClick={() => navigate('/parcela')}>
            {t('Terminar ficha')}
          </AppButton>
        }
        hint={t('Cada paso se guarda al tocar su botón')}
      />
    </Screen>
  );
}
