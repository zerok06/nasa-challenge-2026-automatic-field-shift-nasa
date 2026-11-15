import React, { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Bug,
  Check,
  CheckCircle2,
  ClipboardList,
  Coins,
  Droplets,
  Leaf,
  Plus,
  Sprout,
  Store,
  Tractor,
  Trash2,
  TrendingUp,
  Users,
  Wheat,
} from 'lucide-react-native';

import { ActionCard } from '@/components/app/ActionCard';
import { AppAlert } from '@/components/app/AppAlert';
import { AppButton } from '@/components/app/AppButton';
import { AppHeader } from '@/components/app/AppHeader';
import { Disclosure } from '@/components/app/Disclosure';
import { FichaIllustration } from '@/components/app/FichaIllustration';
import { FormField } from '@/components/app/FormField';
import { Screen } from '@/components/app/Screen';
import { SectionCard } from '@/components/app/SectionCard';
import { SpeakerButton } from '@/components/app/SpeakerButton';
import { StateView } from '@/components/app/StateView';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { colors } from '@/design-system/tokens';
import { testIDs } from '@/design-system/testIDs';
import { useAgentSheet } from '@/providers/AgentSheetProvider';
import { useComparison } from '@/providers/ComparisonProvider';
import { useParcel } from '@/providers/ParcelProvider';
import {
  addCropHistory,
  addSoil,
  addWater,
  deleteCropHistory,
  getCropHistory,
  getCrops,
  getSoil,
  getWater,
  updateParcelPreferences,
  type Crop,
  type Parcel,
  type SoilEntry,
  type WaterEntry,
} from '@/services/api';

const STEP_COUNT = 5;
const CAMPAIGN_YEAR = new Date().getFullYear();
const COMMON_CROP_IDS = [
  'onion',
  'pumpkin',
  'chili',
  'potato',
  'corn',
  'haba',
  'alfalfa',
  'tomato',
  'lettuce',
  'carrot',
];

type Icon = React.ComponentType<{ size?: number; color?: string }>;

type HistoryDraft = {
  key: string;
  id?: string;
  cropId: string;
  cropName: string;
  family: string;
  year: string;
  saved: boolean;
};

type WaterDraft = {
  availability: 'all_year' | 'season' | 'sometimes' | 'unknown';
  source: 'canal' | 'pozo' | 'lluvia' | 'mixto' | 'unknown';
  unit: 'mm' | 'm3';
  amount: string;
  efficiency: 'low' | 'medium' | 'high' | 'unknown';
  saved: boolean;
};

type SoilDraft = {
  hasAnalysis: 'yes' | 'no' | 'unknown';
  ph: string;
  organicMatter: string;
  texture: string;
  saved: boolean;
};

const PRIORITY_OPTIONS: { id: string; label: string; icon: Icon }[] = [
  { id: 'water', label: 'Ahorrar agua', icon: Droplets },
  { id: 'soil', label: 'Mejorar el suelo', icon: Leaf },
  { id: 'margin', label: 'Ganar más', icon: TrendingUp },
  { id: 'pest', label: 'Cortar plagas', icon: Bug },
  { id: 'forage', label: 'Tener forraje', icon: Wheat },
  { id: 'market', label: 'Vender mejor', icon: Store },
];

const CONSTRAINT_OPTIONS: { id: string; label: string; icon: Icon }[] = [
  { id: 'limited_labor', label: 'Poca mano de obra', icon: Users },
  { id: 'no_tractor', label: 'Sin tractor', icon: Tractor },
  { id: 'local_market', label: 'Mercado local', icon: Store },
  { id: 'tight_budget', label: 'Presupuesto ajustado', icon: Coins },
];

function ChoiceChip({
  label,
  selected,
  onPress,
  testID,
  icon: Icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
  icon?: Icon;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
      className={`min-h-12 flex-row items-center gap-2 rounded-xl border px-3 py-2 ${
        selected ? 'border-primary bg-accent' : 'border-border bg-card'
      }`}
    >
      {Icon ? <Icon size={18} color={selected ? colors.primary : colors.muted} /> : null}
      <Text
        className={`text-sm font-medium ${
          selected ? 'text-primary' : 'text-foreground'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function StepTitle({
  step,
  title,
  question,
  help,
  children,
}: {
  step: number;
  title: string;
  question: string;
  help: string;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <VStack className="gap-3">
      <HStack className="items-center justify-between gap-3">
        <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t('Paso {{step}} de {{total}}', { step: step + 1, total: STEP_COUNT })}
        </Text>
        <SpeakerButton text={`${title}. ${question}. ${help}`} />
      </HStack>
      <FichaIllustration step={step} />
      <Text className="text-xl font-bold leading-7 text-foreground">{title}</Text>
      <Text className="text-base leading-6 text-foreground">{question}</Text>
      {children}
      <Disclosure title={t('¿Por qué te pregunto esto?')}>
        <Text className="text-sm leading-5 text-muted-foreground">{help}</Text>
      </Disclosure>
    </VStack>
  );
}

function cropName(
  cropId: string | null,
  cropMap: Map<string, Crop>,
  fallback?: string,
): string {
  if (cropId && cropMap.get(cropId)) return cropMap.get(cropId)!.local_name;
  if (fallback) return fallback;
  return cropId ?? 'Cultivo';
}

function latestWater(rows: WaterEntry[]): WaterEntry | null {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => a.start_at.localeCompare(b.start_at));
  return sorted[sorted.length - 1] ?? null;
}

function latestSoil(rows: SoilEntry[], variable: string): SoilEntry | null {
  return (
    [...rows]
      .reverse()
      .find((row) => row.variable === variable && (row.value !== null || row.unit !== null)) ?? null
  );
}

function parseWaterSource(notes: string | null): WaterDraft['source'] {
  const value = (notes ?? '').toLowerCase();
  if (value.includes('canal')) return 'canal';
  if (value.includes('pozo')) return 'pozo';
  if (value.includes('lluvia')) return 'lluvia';
  if (value.includes('mixto')) return 'mixto';
  return 'unknown';
}

function parseWaterAvailability(notes: string | null): WaterDraft['availability'] {
  const value = (notes ?? '').toLowerCase();
  if (value.includes('todo el año')) return 'all_year';
  if (value.includes('solo campaña')) return 'season';
  if (value.includes('a veces')) return 'sometimes';
  return 'unknown';
}

function efficiencyFromValue(value: number | null): WaterDraft['efficiency'] {
  if (value === null) return 'unknown';
  if (value <= 0.5) return 'low';
  if (value <= 0.7) return 'medium';
  return 'high';
}

function initialWaterDraft(rows: WaterEntry[]): WaterDraft {
  const current = latestWater(rows);
  if (!current) {
    return {
      availability: 'unknown',
      source: 'unknown',
      unit: 'mm',
      amount: '',
      efficiency: 'unknown',
      saved: false,
    };
  }
  return {
    availability: parseWaterAvailability(current.notes),
    source: parseWaterSource(current.notes),
    unit: current.mm !== null ? 'mm' : 'm3',
    amount: String(current.mm ?? current.volume_m3 ?? ''),
    efficiency: efficiencyFromValue(current.efficiency),
    saved: true,
  };
}

function initialSoilDraft(rows: SoilEntry[]): SoilDraft {
  const ph = latestSoil(rows, 'ph');
  const organicMatter = latestSoil(rows, 'organic_matter');
  const texture = latestSoil(rows, 'texture');
  const hasSoil = Boolean(ph || organicMatter || texture);
  return {
    hasAnalysis: hasSoil ? 'yes' : 'unknown',
    ph: ph?.value !== null && ph?.value !== undefined ? String(ph.value) : '',
    organicMatter:
      organicMatter?.value !== null && organicMatter?.value !== undefined
        ? String(organicMatter.value)
        : '',
    texture: texture?.unit ?? '',
    saved: hasSoil,
  };
}

function initialPriorities(parcel: Parcel): string[] {
  const prefPriorities = parcel.preferences?.priorities;
  if (!prefPriorities || typeof prefPriorities !== 'object') return [];
  return Object.entries(prefPriorities as Record<string, number>)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
    .filter((id) => PRIORITY_OPTIONS.some((option) => option.id === id));
}

function initialConstraints(parcel: Parcel): string[] {
  const prefConstraints = parcel.preferences?.constraints;
  if (!prefConstraints || typeof prefConstraints !== 'object') return [];
  return Object.keys(prefConstraints as Record<string, unknown>).filter(
    (id) => (prefConstraints as Record<string, unknown>)[id] === true,
  );
}

export function ParcelProfileScreen() {
  const { t } = useTranslation();
  const { parcel } = useParcel();
  const parcelId = parcel?.id;

  const cropsQuery = useQuery({
    queryKey: ['crops'],
    queryFn: getCrops,
    staleTime: 60 * 60 * 1000,
  });
  const historyQuery = useQuery({
    queryKey: ['crop-history', parcelId],
    queryFn: () => getCropHistory(parcelId!),
    enabled: Boolean(parcelId),
  });
  const waterQuery = useQuery({
    queryKey: ['water', parcelId],
    queryFn: () => getWater(parcelId!),
    enabled: Boolean(parcelId),
  });
  const soilQuery = useQuery({
    queryKey: ['soil', parcelId],
    queryFn: () => getSoil(parcelId!),
    enabled: Boolean(parcelId),
  });

  const crops = useMemo(() => cropsQuery.data?.crops ?? [], [cropsQuery.data]);
  const cropMap = useMemo(() => new Map(crops.map((crop) => [crop.id, crop])), [crops]);
  const initialHistory = useMemo(
    () =>
      (historyQuery.data ?? []).map((row) => ({
        key: row.id,
        id: row.id,
        cropId: row.crop_id ?? '',
        cropName: cropName(row.crop_id, cropMap, row.crop_id ?? 'Cultivo'),
        family: row.family ?? '',
        year: row.date_start ? row.date_start.slice(0, 4) : '',
        saved: true,
      })),
    [cropMap, historyQuery.data],
  );
  const waterInitial = useMemo(() => initialWaterDraft(waterQuery.data ?? []), [waterQuery.data]);
  const soilInitial = useMemo(() => initialSoilDraft(soilQuery.data ?? []), [soilQuery.data]);

  if (!parcel) {
    return (
      <Screen header={<AppHeader subtitle={t('Ficha de parcela')} onBack={() => router.back()} />}>
        <AppAlert tone="info">{t('Primero crea una parcela.')}</AppAlert>
        <AppButton onPress={() => router.replace('/parcel-new')}>{t('Crear mi parcela')}</AppButton>
      </Screen>
    );
  }

  const loading =
    cropsQuery.isLoading ||
    historyQuery.isLoading ||
    waterQuery.isLoading ||
    soilQuery.isLoading;
  if (loading) {
    return (
      <Screen header={<AppHeader subtitle={t('Ficha de parcela')} onBack={() => router.back()} />}>
        <StateView loading title={t('Cargando tu ficha')} description={t('Leyendo tus datos.')} />
      </Screen>
    );
  }

  const queryError =
    cropsQuery.error ?? historyQuery.error ?? waterQuery.error ?? soilQuery.error;
  if (queryError) {
    return (
      <Screen header={<AppHeader subtitle={t('Ficha de parcela')} onBack={() => router.back()} />}>
        <AppAlert tone="error">
          {queryError instanceof Error ? queryError.message : t('No pudimos cargar tu ficha.')}
        </AppAlert>
      </Screen>
    );
  }

  return (
    <ParcelProfileForm
      key={parcel.id}
      parcel={parcel}
      crops={crops}
      initialHistory={initialHistory}
      initialWater={waterInitial}
      initialSoil={soilInitial}
      initialPriorities={initialPriorities(parcel)}
      initialConstraints={initialConstraints(parcel)}
    />
  );
}

function ParcelProfileForm({
  parcel,
  crops,
  initialHistory,
  initialWater,
  initialSoil,
  initialPriorities,
  initialConstraints,
}: {
  parcel: Parcel;
  crops: Crop[];
  initialHistory: HistoryDraft[];
  initialWater: WaterDraft;
  initialSoil: SoilDraft;
  initialPriorities: string[];
  initialConstraints: string[];
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { refresh, selectParcel } = useParcel();
  const { markStale } = useComparison();
  const { open: openAgent } = useAgentSheet();
  const parcelId = parcel.id;

  const [step, setStep] = useState(0);
  const [historyDrafts, setHistoryDrafts] = useState<HistoryDraft[]>(initialHistory);
  const [historyUnknown, setHistoryUnknown] = useState(false);
  const [water, setWater] = useState<WaterDraft>(initialWater);
  const [soil, setSoil] = useState<SoilDraft>(initialSoil);
  const [priorities, setPriorities] = useState<string[]>(initialPriorities);
  const [constraints, setConstraints] = useState<string[]>(initialConstraints);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cropMap = useMemo(() => new Map(crops.map((crop) => [crop.id, crop])), [crops]);
  const commonCrops = useMemo(() => {
    const preferred = COMMON_CROP_IDS.map((id) => cropMap.get(id)).filter(
      (crop): crop is Crop => Boolean(crop),
    );
    return preferred.length >= 6 ? preferred : crops.slice(0, 8);
  }, [cropMap, crops]);

  const invalidateFicha = async () => {
    markStale();
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['crop-history', parcelId] }),
      queryClient.invalidateQueries({ queryKey: ['water', parcelId] }),
      queryClient.invalidateQueries({ queryKey: ['soil', parcelId] }),
      queryClient.invalidateQueries({ queryKey: ['context', parcelId] }),
      queryClient.invalidateQueries({ queryKey: ['parcels'] }),
    ]);
  };

  const addCrop = (crop: Crop) => {
    setHistoryUnknown(false);
    setHistoryDrafts((rows) => [
      ...rows,
      {
        key: `${crop.id}-${Date.now()}`,
        cropId: crop.id,
        cropName: crop.local_name,
        family: crop.family,
        year: '',
        saved: false,
      },
    ]);
  };

  const setCropYear = (key: string, year: string) => {
    setHistoryDrafts((rows) =>
      rows.map((row) => (row.key === key ? { ...row, year, saved: false } : row)),
    );
  };

  const removeCrop = async (row: HistoryDraft) => {
    if (!parcelId) return;
    setError(null);
    try {
      if (row.id) {
        await deleteCropHistory(parcelId, row.id);
        await invalidateFicha();
      }
      setHistoryDrafts((rows) => rows.filter((item) => item.key !== row.key));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('No pudimos borrar la campaña.'));
    }
  };

  const saveHistory = async () => {
    if (!parcelId) return;
    for (const row of historyDrafts.filter((item) => !item.saved)) {
      const start = row.year.length === 4 ? `${row.year}-01-01` : null;
      const end = row.year.length === 4 ? `${row.year}-12-31` : null;
      const saved = await addCropHistory(parcelId, {
        cropId: row.cropId,
        family: row.family,
        dateStart: start,
        dateEnd: end,
        notes: null,
      });
      setHistoryDrafts((rows) =>
        rows.map((item) =>
          item.key === row.key ? { ...item, id: saved.id, saved: true } : item,
        ),
      );
    }
    await invalidateFicha();
  };

  const saveWater = async () => {
    if (!parcelId || water.saved) return;
    if (!water.amount.trim()) return;
    const amount = Number(water.amount.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(t('Escribe cuánta agua tienes o elige “No sé”.'));
    }
    const efficiency =
      water.efficiency === 'low' ? 0.4 : water.efficiency === 'medium' ? 0.6 : water.efficiency === 'high' ? 0.8 : null;
    const availabilityLabel: Record<WaterDraft['availability'], string> = {
      all_year: 'todo el año',
      season: 'solo campaña',
      sometimes: 'a veces',
      unknown: 'no sé',
    };
    const sourceLabel: Record<WaterDraft['source'], string> = {
      canal: 'canal',
      pozo: 'pozo',
      lluvia: 'lluvia',
      mixto: 'mixto',
      unknown: 'no sé',
    };
    await addWater(parcelId, {
      startAt: `${CAMPAIGN_YEAR}-01-01`,
      endAt: `${CAMPAIGN_YEAR}-12-31`,
      mm: water.unit === 'mm' ? amount : null,
      volumeM3: water.unit === 'm3' ? amount : null,
      method: 'estimate',
      efficiency,
      confidence: efficiency ? 'medium' : 'low',
      notes: `Fuente: ${sourceLabel[water.source]}. Disponibilidad: ${availabilityLabel[water.availability]}.`,
    });
    setWater((current) => ({ ...current, saved: true }));
    await invalidateFicha();
  };

  const saveSoil = async () => {
    if (!parcelId || soil.hasAnalysis !== 'yes' || soil.saved) return;
    const observations: { variable: string; value: number | null; unit: string | null }[] = [];
    if (soil.ph.trim()) {
      const value = Number(soil.ph.replace(',', '.'));
      if (!Number.isFinite(value)) throw new Error(t('El pH debe ser un número.'));
      observations.push({ variable: 'ph', value, unit: 'pH' });
    }
    if (soil.organicMatter.trim()) {
      const value = Number(soil.organicMatter.replace(',', '.'));
      if (!Number.isFinite(value)) throw new Error(t('La materia orgánica debe ser un número.'));
      observations.push({ variable: 'organic_matter', value, unit: '%' });
    }
    if (soil.texture) {
      observations.push({ variable: 'texture', value: null, unit: soil.texture });
    }
    if (observations.length === 0) {
      throw new Error(t('Agrega al menos un dato del análisis o elige “No tengo”.'));
    }
    for (const observation of observations) {
      await addSoil(parcelId, {
        variable: observation.variable,
        value: observation.value,
        unit: observation.unit,
        method: 'lab',
      });
    }
    setSoil((current) => ({ ...current, saved: true }));
    await invalidateFicha();
  };

  const savePriorities = async () => {
    if (!parcelId) return;
    const priorityMap = Object.fromEntries(
      priorities.map((id, index) => [id, 3 - index]),
    ) as Record<string, number>;
    const constraintMap = Object.fromEntries(
      constraints.map((id) => [id, true]),
    ) as Record<string, boolean>;
    const updated = await updateParcelPreferences(parcelId, {
      priorities: priorityMap,
      constraints: constraintMap,
    });
    selectParcel(updated);
    await invalidateFicha();
  };

  const handleContinue = async () => {
    setError(null);
    setBusy(true);
    try {
      if (step === 0) await saveHistory();
      if (step === 1) await saveWater();
      if (step === 2) await saveSoil();
      if (step === 3) await savePriorities();
      if (step === 4) {
        await refresh();
        router.replace('/parcel');
        return;
      }
      setStep((current) => Math.min(STEP_COUNT - 1, current + 1));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('No pudimos guardar este paso.'));
    } finally {
      setBusy(false);
    }
  };

  const handleBack = () => {
    if (step === 0) {
      // The ficha can be opened with `replace` right after creating a parcel,
      // so there may be no safe screen behind it. Home is always a valid exit.
      router.replace('/');
      return;
    }
    setError(null);
    setStep((current) => Math.max(0, current - 1));
  };

  const togglePriority = (id: string) => {
    setPriorities((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) return current;
      return [...current, id];
    });
  };

  const toggleConstraint = (id: string) => {
    setConstraints((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const summaryItems = [
    {
      label: t('Historial de cultivos'),
      done: historyDrafts.length > 0,
      detail:
        historyDrafts.length > 0
          ? t('Campañas registradas: {{value}}', { value: historyDrafts.length })
          : t('Sin campañas'),
    },
    {
      label: t('Agua disponible'),
      done: Boolean(water.saved && water.amount),
      detail: water.saved && water.amount ? `${water.amount} ${water.unit}` : t('No disponible'),
    },
    {
      label: t('Suelo'),
      done: soil.hasAnalysis === 'yes' && Boolean(soil.ph || soil.organicMatter || soil.texture),
      detail:
        soil.hasAnalysis === 'yes'
          ? t('Análisis registrado')
          : soil.hasAnalysis === 'no'
            ? t('Sin análisis')
            : t('No disponible'),
    },
    {
      label: t('Prioridades'),
      done: priorities.length > 0,
      detail:
        priorities.length > 0
          ? priorities
              .map((id) => PRIORITY_OPTIONS.find((option) => option.id === id)?.label ?? id)
              .join(', ')
          : t('Sin elegir'),
    },
  ];

  const displayHistory = [...historyDrafts].sort((a, b) =>
    (b.year || '').localeCompare(a.year || ''),
  );
  const campaignOptions = [
    { year: CAMPAIGN_YEAR, label: t('Este año') },
    { year: CAMPAIGN_YEAR - 1, label: t('El año pasado') },
    { year: CAMPAIGN_YEAR - 2, label: t('Hace 2 años') },
  ];

  const stepTitle = [
    t('Tu historial'),
    t('Tu agua'),
    t('Tu suelo'),
    t('Tus prioridades'),
    t('Resumen'),
  ][step];
  const stepQuestion = [
    t('¿Qué sembraste en las últimas campañas?'),
    t('¿Cuánta agua tienes para tu parcela?'),
    t('¿Conoces tu suelo?'),
    t('¿Qué quieres lograr en la próxima campaña?'),
    t('Revisa tu ficha antes de terminar.'),
  ][step];
  const stepHelp = [
    t('Con tu historial podemos comparar la rotación actual con otras alternativas.'),
    t('El agua es el límite más importante en Moquegua. Si no la conoces, lo mostraremos como no disponible.'),
    t('Un análisis de suelo mejora la estimación de fertilidad. Si no lo tienes, no lo inventamos.'),
    t('Tus prioridades ordenan las alternativas. No cambian los cálculos: nos ayudan a mostrarte lo que más te importa.'),
    t('Puedes terminar ahora y completar el resto después.'),
  ][step];

  return (
    <Screen
      keyboard
      edges={['top', 'bottom']}
      header={
        <AppHeader
          title="ANDEN"
          subtitle={t('Ficha de parcela')}
          onBack={handleBack}
        />
      }
      footer={
        <>
          <AppButton
            testID={testIDs.parcelProfileNext}
            loading={busy}
            onPress={() => void handleContinue()}
            className="min-h-14"
          >
            {step === STEP_COUNT - 1 ? t('Terminar ficha') : t('Continuar')}
          </AppButton>
          <AppButton
            testID={testIDs.parcelProfileBack}
            tone="ghost"
            onPress={handleBack}
            isDisabled={busy}
          >
            {step === 0 ? t('Cancelar') : t('Volver')}
          </AppButton>
        </>
      }
    >
      {error ? <AppAlert tone="error">{error}</AppAlert> : null}

      <VStack className="gap-2">
        <HStack className="items-center justify-between">
          <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t('Ficha de parcela')}
          </Text>
          <Text className="text-sm font-semibold text-primary">
            {Math.round(((step + 1) / STEP_COUNT) * 100)}%
          </Text>
        </HStack>
        <Progress value={((step + 1) / STEP_COUNT) * 100}>
          <ProgressFilledTrack />
        </Progress>
        <Text className="text-sm leading-5 text-muted-foreground">
          {t('Cada paso se guarda al tocar Continuar.')}
        </Text>
      </VStack>

      <SectionCard testID={testIDs.parcelProfileForm}>
        <StepTitle step={step} title={stepTitle} question={stepQuestion} help={stepHelp}>
          {step === 0 ? (
            <VStack className="gap-3">
              {historyDrafts.length > 0 ? (
                <VStack className="gap-2">
                  <Text className="text-sm font-semibold text-foreground">
                    {t('Campañas registradas')}
                  </Text>
                  <Text className="text-sm leading-5 text-muted-foreground">
                    {t('La primera es la campaña más reciente. Así el motor entiende qué sembraste al final.')}
                  </Text>
                  {displayHistory.map((row, index) => (
                    <VStack key={row.key} className="gap-2 rounded-xl border border-border bg-background p-3">
                      <HStack className="items-center justify-between gap-2">
                        <HStack className="flex-1 items-center gap-2">
                          <Text className="text-base font-semibold text-foreground">
                            {row.cropName}
                          </Text>
                          {index === 0 ? (
                            <Text className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-primary">
                              {t('Más reciente')}
                            </Text>
                          ) : null}
                        </HStack>
                        <Pressable
                          onPress={() => void removeCrop(row)}
                          accessibilityRole="button"
                          accessibilityLabel={t('Quitar {{crop}}', { crop: row.cropName })}
                          className="h-10 w-10 items-center justify-center rounded-full"
                        >
                          <Trash2 size={18} color={colors.muted} />
                        </Pressable>
                      </HStack>
                      {row.id ? (
                        <Text className="text-sm text-muted-foreground">
                          {row.year ? t('Campaña {{year}}', { year: row.year }) : t('Sin año')}
                        </Text>
                      ) : (
                        <VStack className="gap-1">
                          <Text className="text-sm font-medium text-foreground">
                            {t('¿De qué campaña es?')}
                          </Text>
                          <HStack className="flex-wrap gap-2">
                            {campaignOptions.map((option) => (
                              <ChoiceChip
                                key={option.year}
                                label={option.label}
                                selected={row.year === String(option.year)}
                                onPress={() => setCropYear(row.key, String(option.year))}
                              />
                            ))}
                            <ChoiceChip
                              label={t('No recuerdo')}
                              selected={!row.year}
                              onPress={() => setCropYear(row.key, '')}
                            />
                          </HStack>
                        </VStack>
                      )}
                    </VStack>
                  ))}
                </VStack>
              ) : (
                <Text className="text-sm leading-5 text-muted-foreground">
                  {historyUnknown
                    ? t('Sin historial. La comparación usará una rotación de ejemplo hasta que lo completes.')
                    : t('Todavía no registraste campañas.')}
                </Text>
              )}

              <Disclosure title={t('¿Qué campaña debo poner?')}>
                <Text className="text-sm leading-5 text-muted-foreground">
                  {t(
                    'Pon la campaña en la que sembraste y cosechaste ese cultivo. Si no recuerdas el año exacto, elige “No recuerdo”; no inventamos una fecha.',
                  )}
                </Text>
              </Disclosure>
              <Text className="text-sm font-semibold text-foreground">
                {t('Agregar un cultivo')}
              </Text>
              <HStack className="flex-wrap gap-2">
                {commonCrops.map((crop) => (
                  <ChoiceChip
                    key={crop.id}
                    testID={testIDs.parcelProfileCrop(crop.id)}
                    label={crop.local_name}
                    selected={false}
                    icon={Plus}
                    onPress={() => addCrop(crop)}
                  />
                ))}
              </HStack>
              {historyDrafts.length === 0 ? (
                <HStack className="flex-wrap gap-2">
                  <ChoiceChip
                    label={t('No sembré o no recuerdo')}
                    selected={historyUnknown}
                    onPress={() => setHistoryUnknown((current) => !current)}
                  />
                </HStack>
              ) : null}
            </VStack>
          ) : null}

          {step === 1 ? (
            <VStack className="gap-3">
              <Text className="text-sm font-semibold text-foreground">
                {t('¿Tienes agua todo el año?')}
              </Text>
              <HStack className="flex-wrap gap-2">
                {[
                  ['all_year', t('Todo el año')],
                  ['season', t('Solo en campaña')],
                  ['sometimes', t('A veces')],
                  ['unknown', t('No sé')],
                ].map(([id, label]) => (
                  <ChoiceChip
                    key={id}
                    label={label}
                    selected={water.availability === id}
                    onPress={() =>
                      setWater((current) => ({
                        ...current,
                        availability: id as WaterDraft['availability'],
                        saved: false,
                      }))
                    }
                  />
                ))}
              </HStack>
              <Text className="text-sm font-semibold text-foreground">
                {t('¿De dónde viene?')}
              </Text>
              <HStack className="flex-wrap gap-2">
                {[
                  ['canal', t('Canal')],
                  ['pozo', t('Pozo')],
                  ['lluvia', t('Lluvia')],
                  ['mixto', t('Mixto')],
                  ['unknown', t('No sé')],
                ].map(([id, label]) => (
                  <ChoiceChip
                    key={id}
                    label={label}
                    selected={water.source === id}
                    onPress={() =>
                      setWater((current) => ({
                        ...current,
                        source: id as WaterDraft['source'],
                        saved: false,
                      }))
                    }
                  />
                ))}
              </HStack>
              <FormField
                label={t('¿Cuánta agua usas por campaña?')}
                value={water.amount}
                onChangeText={(amount) => setWater((current) => ({ ...current, amount, saved: false }))}
                placeholder={t('Ej. 1200')}
                keyboardType="decimal-pad"
                helper={t('Si no sabes, déjalo vacío y elige “No sé”.')}
              />
              <HStack className="gap-2">
                <ChoiceChip
                  label="mm"
                  selected={water.unit === 'mm'}
                  onPress={() => setWater((current) => ({ ...current, unit: 'mm', saved: false }))}
                />
                <ChoiceChip
                  label="m³"
                  selected={water.unit === 'm3'}
                  onPress={() => setWater((current) => ({ ...current, unit: 'm3', saved: false }))}
                />
              </HStack>
              <Text className="text-sm font-semibold text-foreground">
                {t('¿Qué tan eficiente es tu riego?')}
              </Text>
              <HStack className="flex-wrap gap-2">
                {[
                  ['low', t('Baja')],
                  ['medium', t('Media')],
                  ['high', t('Alta')],
                  ['unknown', t('No sé')],
                ].map(([id, label]) => (
                  <ChoiceChip
                    key={id}
                    label={label}
                    selected={water.efficiency === id}
                    onPress={() =>
                      setWater((current) => ({
                        ...current,
                        efficiency: id as WaterDraft['efficiency'],
                        saved: false,
                      }))
                    }
                  />
                ))}
              </HStack>
              <Text className="text-sm leading-5 text-muted-foreground">
                {t('Si no sabes la eficiencia, elige “No sé”. No la inventamos.')}
              </Text>
              <Disclosure title={t('¿No sabes cuánta agua usas?')}>
                <Text className="text-sm leading-5 text-muted-foreground">
                  {t(
                    'Puedes mirar tu recibo de agua o preguntar a tu comité de regantes. Si riegas por horas, multiplica las horas por el caudal y por las semanas de campaña.',
                  )}
                </Text>
                <AppButton
                  size="sm"
                  tone="outline"
                  onPress={() =>
                    openAgent(
                      'No sé cuánta agua uso por campaña. Ayúdame a estimarla con horas de riego, caudal o recibos.',
                    )
                  }
                >
                  {t('Preguntar al agente')}
                </AppButton>
              </Disclosure>
            </VStack>
          ) : null}

          {step === 2 ? (
            <VStack className="gap-3">
              <Text className="text-sm font-semibold text-foreground">
                {t('¿Tienes un análisis de suelo?')}
              </Text>
              <HStack className="flex-wrap gap-2">
                {[
                  ['yes', t('Sí, tengo análisis')],
                  ['no', t('No tengo')],
                  ['unknown', t('No sé')],
                ].map(([id, label]) => (
                  <ChoiceChip
                    key={id}
                    label={label}
                    selected={soil.hasAnalysis === id}
                    onPress={() =>
                      setSoil((current) => ({
                        ...current,
                        hasAnalysis: id as SoilDraft['hasAnalysis'],
                        saved: false,
                      }))
                    }
                  />
                ))}
              </HStack>
              {soil.hasAnalysis === 'yes' ? (
                <>
                  <FormField
                    label={t('pH del suelo')}
                    value={soil.ph}
                    onChangeText={(ph) => setSoil((current) => ({ ...current, ph, saved: false }))}
                    placeholder={t('Ej. 7.2')}
                    keyboardType="decimal-pad"
                  />
                  <FormField
                    label={t('Materia orgánica (%)')}
                    value={soil.organicMatter}
                    onChangeText={(organicMatter) =>
                      setSoil((current) => ({ ...current, organicMatter, saved: false }))
                    }
                    placeholder={t('Ej. 2.5')}
                    keyboardType="decimal-pad"
                  />
                  <Text className="text-sm font-semibold text-foreground">{t('Textura')}</Text>
                  <HStack className="flex-wrap gap-2">
                    {[
                      ['franco', t('Franco')],
                      ['arcilloso', t('Arcilloso')],
                      ['arenoso', t('Arenoso')],
                    ].map(([id, label]) => (
                      <ChoiceChip
                        key={id}
                        label={label}
                        selected={soil.texture === id}
                        onPress={() =>
                          setSoil((current) => ({ ...current, texture: id, saved: false }))
                        }
                      />
                    ))}
                  </HStack>
                </>
              ) : (
                <AppAlert tone="warning">
                  {t('Sin análisis, el suelo se muestra como “por revisar”. No inventamos valores.')}
                </AppAlert>
              )}
            </VStack>
          ) : null}

          {step === 3 ? (
            <VStack className="gap-3">
              <Text className="text-sm font-semibold text-foreground">
                {t('Elige hasta 3 prioridades')}
              </Text>
              <HStack className="flex-wrap gap-2">
                {PRIORITY_OPTIONS.map((option) => (
                  <ChoiceChip
                    key={option.id}
                    testID={testIDs.parcelProfilePriority(option.id)}
                    label={option.label}
                    icon={option.icon}
                    selected={priorities.includes(option.id)}
                    onPress={() => togglePriority(option.id)}
                  />
                ))}
              </HStack>
              <Text className="text-sm leading-5 text-muted-foreground">
                {t('Las prioridades ordenan las alternativas; no cambian los cálculos.')}
              </Text>
              <Text className="text-sm font-semibold text-foreground">
                {t('¿Tienes alguna restricción?')}
              </Text>
              <HStack className="flex-wrap gap-2">
                {CONSTRAINT_OPTIONS.map((option) => (
                  <ChoiceChip
                    key={option.id}
                    label={option.label}
                    icon={option.icon}
                    selected={constraints.includes(option.id)}
                    onPress={() => toggleConstraint(option.id)}
                  />
                ))}
              </HStack>
            </VStack>
          ) : null}

          {step === 4 ? (
            <VStack className="gap-3">
              {summaryItems.map((item) => (
                <HStack
                  key={item.label}
                  className="items-center gap-3 rounded-xl border border-border bg-background p-3"
                >
                  {item.done ? (
                    <CheckCircle2 size={22} color={colors.primary} />
                  ) : (
                    <ClipboardList size={22} color={colors.muted} />
                  )}
                  <VStack className="flex-1">
                    <Text className="text-base font-semibold text-foreground">{item.label}</Text>
                    <Text className="text-sm text-muted-foreground">{item.detail}</Text>
                  </VStack>
                  {item.done ? <Check size={18} color={colors.primary} /> : null}
                </HStack>
              ))}
              {summaryItems.some((item) => !item.done) ? (
                <AppAlert tone="warning">
                  {t('Puedes terminar ahora. Los datos que faltan se mostrarán como no disponibles.')}
                </AppAlert>
              ) : (
                <AppAlert tone="success">{t('Tu ficha está completa.')}</AppAlert>
              )}
              <ActionCard
                icon={Sprout}
                title={t('Comparar 3 rotaciones')}
                subtitle={t('Usa tu historial, agua y prioridades')}
                onPress={() => router.replace('/comparison')}
              />
              <AppButton
                tone="outline"
                onPress={() =>
                  openAgent(
                    'Tengo una duda sobre mi ficha. Explícame qué dato falta y cómo completarlo.',
                  )
                }
              >
                {t('Preguntar al agente')}
              </AppButton>
            </VStack>
          ) : null}
        </StepTitle>
      </SectionCard>

      <Text className="text-center text-sm leading-5 text-muted-foreground">
        {t('Estos datos los declaras tú. No los inventamos y puedes editarlos después.')}
      </Text>
    </Screen>
  );
}
