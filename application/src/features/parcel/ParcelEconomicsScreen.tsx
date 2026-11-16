import React, { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { AppAlert } from '@/components/app/AppAlert';
import { AppButton } from '@/components/app/AppButton';
import { AppHeader } from '@/components/app/AppHeader';
import { FormField } from '@/components/app/FormField';
import { Screen } from '@/components/app/Screen';
import { Pressable } from '@/components/ui/pressable';
import { Illustration } from '@/components/illustrations/Illustration';
import { SectionCard } from '@/components/app/SectionCard';
import { StateView } from '@/components/app/StateView';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { testIDs } from '@/design-system/testIDs';
import { useComparison } from '@/providers/ComparisonProvider';
import { parseEsNumber } from '@/lib/parse';
import {
  findCatalogPrice,
  localPriceReferences,
  mergePriceReferences,
  priceReferencePlace,
} from '@/data/priceReferences';
import { useParcel } from '@/providers/ParcelProvider';
import { useOffline } from '@/providers/OfflineProvider';
import { CropPicker } from '@/features/parcel/CropPicker';
import {
  getCropHistory,
  getCrops,
  updateParcelPreferences,
  type Crop,
} from '@/services/api';

type CropEconomicsDraft = {
  yield_kg_ha: string;
  price_pen_kg: string;
  costs_pen: string;
  priceConfirmed: boolean;
  yieldUnit: string;
  priceUnit: string;
  sacoKg: string;
  marketable_share: string;
};

const ARROBA_KG = 11.5;

function toKgHa(raw: string, unit: string, sacoKgRaw: string): number | null {
  const value = parseEsNumber(raw);
  if (value === null) return null;
  if (unit === 'arrobas_ha') return value * ARROBA_KG;
  if (unit === 'sacos_ha') {
    const saco = parseEsNumber(sacoKgRaw) ?? 50;
    if (saco <= 0) return null;
    return value * saco;
  }
  return value;
}

function toPenKg(raw: string, unit: string, sacoKgRaw: string): number | null {
  const value = parseEsNumber(raw);
  if (value === null) return null;
  if (unit === 'pen_arroba') return value / ARROBA_KG;
  if (unit === 'pen_saco') {
    const saco = parseEsNumber(sacoKgRaw) ?? 50;
    if (saco <= 0) return null;
    return value / saco;
  }
  return value;
}

function emptyRow(): CropEconomicsDraft {
  return {
    yield_kg_ha: '',
    price_pen_kg: '',
    costs_pen: '',
    priceConfirmed: true,
    yieldUnit: 'kg_ha',
    priceUnit: 'pen_kg',
    sacoKg: '50',
    marketable_share: '100',
  };
}

function numberOrNull(value: string): number | null {
  return parseEsNumber(value);
}

function UnitChips({
  options,
  selected,
  onSelect,
}: {
  options: { id: string; label: string }[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <HStack className="flex-wrap gap-2">
      {options.map((option) => (
        <Pressable
          key={option.id}
          onPress={() => onSelect(option.id)}
          accessibilityRole="button"
          accessibilityState={{ selected: selected === option.id }}
          className={`min-h-11 rounded-full border px-3 py-2 ${
            selected === option.id ? 'border-primary bg-accent' : 'border-border bg-card'
          }`}
        >
          <Text
            className={`text-sm font-semibold ${
              selected === option.id ? 'text-primary' : 'text-foreground'
            }`}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </HStack>
  );
}

export function ParcelEconomicsScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { parcel, selectParcel } = useParcel();
  const { bundle } = useOffline();
  const { comparison, markStale } = useComparison();
  const parcelId = parcel?.id;
  const [edits, setEdits] = useState<Record<string, Partial<CropEconomicsDraft>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const historyQuery = useQuery({
    queryKey: ['crop-history', parcelId],
    queryFn: () => getCropHistory(parcelId!),
    enabled: Boolean(parcelId),
  });
  const cropsQuery = useQuery({
    queryKey: ['crops'],
    queryFn: getCrops,
    staleTime: 60 * 60 * 1000,
  });

  const crops = useMemo(() => cropsQuery.data?.crops ?? [], [cropsQuery.data]);
  const priceReferences = useMemo(
    () =>
      mergePriceReferences(
        cropsQuery.data?.prices_chacra_2025,
        bundle?.catalog.prices_chacra_2025,
        localPriceReferences,
      ),
    [bundle?.catalog.prices_chacra_2025, cropsQuery.data?.prices_chacra_2025],
  );
  const cropMap = useMemo(() => new Map(crops.map((crop) => [crop.id, crop])), [crops]);
  const cropIds = useMemo(() => {
    const historyAndComparisonIds = new Set(
      (historyQuery.data ?? [])
        .map((row) => row.crop_id)
        .filter((id): id is string => Boolean(id)),
    );
    for (const plan of comparison?.plans ?? []) {
      for (const cropId of plan.crop_sequence) historyAndComparisonIds.add(cropId);
    }
    // Show all catalog crops; the farmer can enter prices for any of them.
    const allIds = crops.map((c) => c.id);
    // Merge: catalog crops first, then any extra IDs from history/comparison.
    const merged = [...allIds];
    for (const id of historyAndComparisonIds) {
      if (!merged.includes(id)) merged.push(id);
    }
    return merged;
  }, [comparison, crops, historyQuery.data]);

  const [showCropPicker, setShowCropPicker] = useState(false);

  const draft = useMemo(() => {
    const existing = (parcel?.preferences.economics ?? {}) as Record<
      string,
      {
        yield_kg_ha?: number | null;
        price_pen_kg?: number | null;
        costs_pen?: number | null;
        price_source?: 'farmer' | 'catalog_reference' | null;
        price_confirmed?: boolean | null;
        marketable_share?: number | null;
      }
    >;
    const next: Record<string, CropEconomicsDraft> = {};
    for (const cropId of cropIds) {
      const item = existing[cropId] ?? {};
      const reference = findCatalogPrice(cropId, parcel?.district, priceReferences);
      next[cropId] = {
        yield_kg_ha:
          item.yield_kg_ha !== null && item.yield_kg_ha !== undefined
            ? String(item.yield_kg_ha)
            : '',
        price_pen_kg:
          item.price_pen_kg !== null && item.price_pen_kg !== undefined
            ? String(item.price_pen_kg)
            : reference?.precio_chacra.valor.toString() ?? '',
        costs_pen:
          item.costs_pen !== null && item.costs_pen !== undefined
            ? String(item.costs_pen)
            : '',
        priceConfirmed:
          item.price_confirmed === true ||
          (item.price_confirmed == null &&
            item.price_source !== 'catalog_reference' &&
            (!reference || item.price_pen_kg != null) &&
            parcel?.preferences.price_assumption_type !== 'historical' &&
            parcel?.preferences.price_assumption_type !== 'reference'),
        yieldUnit: 'kg_ha',
        priceUnit: 'pen_kg',
        sacoKg: '50',
        marketable_share:
          typeof item.marketable_share === 'number'
            ? String(Math.round(item.marketable_share * 100))
            : '100',
        ...(edits[cropId] ?? {}),
      };
    }
    return next;
  }, [cropIds, edits, parcel, priceReferences]);

  const updateField = (
    cropId: string,
    field: keyof CropEconomicsDraft,
    value: string | boolean,
  ) => {
    setEdits((current) => ({
      ...current,
      [cropId]: {
        ...(current[cropId] ?? {}),
        [field]: value,
        ...(field !== 'priceConfirmed' &&
        ['price_pen_kg', 'priceUnit', 'sacoKg'].includes(field) &&
        findCatalogPrice(cropId, parcel?.district, priceReferences)
          ? { priceConfirmed: false }
          : {}),
      },
    }));
  };

  const handleSave = async () => {
    if (!parcelId) return;
    setBusy(true);
    setError(null);
    try {
      const economics = Object.fromEntries(
        cropIds.map((cropId) => {
          const row = draft[cropId] ?? emptyRow();
          const reference = findCatalogPrice(cropId, parcel?.district, priceReferences);
          const accepted = !reference || row.priceConfirmed;
          const pricePenKg = accepted
            ? toPenKg(row.price_pen_kg, row.priceUnit, row.sacoKg)
            : null;
          const isReferencePrice = Boolean(
            reference &&
              row.priceConfirmed &&
              pricePenKg !== null &&
              Math.abs(pricePenKg - reference.precio_chacra.valor) < 0.005,
          );
          return [
            cropId,
            {
              yield_kg_ha: toKgHa(row.yield_kg_ha, row.yieldUnit, row.sacoKg),
              price_pen_kg: pricePenKg,
              costs_pen: numberOrNull(row.costs_pen),
              marketable_share: parseEsNumber(row.marketable_share) != null
                ? Math.min(100, Math.max(0, parseEsNumber(row.marketable_share)!)) / 100
                : null,
              price_source: isReferencePrice ? 'catalog_reference' : 'farmer',
              price_confirmed: accepted && pricePenKg !== null ? true : null,
              price_reference: isReferencePrice
                ? {
                    source_id: reference?.fuente_id,
                    period: reference?.periodo,
                    place: priceReferencePlace(reference!),
                    status: reference?.estado,
                  }
                : null,
            },
          ];
        }),
      );
      const updated = await updateParcelPreferences(parcelId, {
        economics,
        price_assumption_type: Object.values(economics).some(
          (item) => item.price_source === 'catalog_reference',
        )
          ? 'historical'
          : Object.values(economics).some((item) => item.price_pen_kg !== null)
            ? 'farmer'
            : 'none',
      });
      selectParcel(updated);
      markStale();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['context', parcelId] }),
        queryClient.invalidateQueries({ queryKey: ['parcels'] }),
      ]);
      router.back();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('No pudimos guardar los precios.'));
    } finally {
      setBusy(false);
    }
  };

  if (!parcel) {
    return (
      <Screen header={<AppHeader subtitle={t('Precios y costos')} onBack={() => router.back()} />}>
        <AppAlert tone="info">{t('Primero crea una parcela.')}</AppAlert>
      </Screen>
    );
  }

  if (historyQuery.isLoading || cropsQuery.isLoading) {
    return (
      <Screen header={<AppHeader subtitle={t('Precios y costos')} onBack={() => router.back()} />}>
        <StateView loading title={t('Cargando tus cultivos')} />
      </Screen>
    );
  }

  if (cropIds.length === 0) {
    return (
      <Screen header={<AppHeader subtitle={t('Precios y costos')} onBack={() => router.back()} />}>
        <AppAlert tone="warning">
          {t('Primero registra qué sembraste. Así sabemos para qué cultivos pedir precios y costos.')}
        </AppAlert>
        <AppButton onPress={() => router.replace('/parcel-profile')}>
          {t('Completar historial')}
        </AppButton>
      </Screen>
    );
  }

  return (
    <Screen
      keyboard
      edges={['top', 'bottom']}
      header={
        <AppHeader
          subtitle={t('Precios y costos')}
          onBack={() => router.back()}
        />
      }
      footer={
        <>
          <AppButton
            testID={testIDs.parcelEconomicsSave}
            loading={busy}
            onPress={() => void handleSave()}
            className="min-h-14"
          >
            {t('Guardar precios y costos')}
          </AppButton>
          <AppButton tone="ghost" onPress={() => router.back()} isDisabled={busy}>
            {t('Cancelar')}
          </AppButton>
        </>
      }
    >
      {error ? <AppAlert tone="error">{error}</AppAlert> : null}

      <HStack className="items-center gap-3">
        <Illustration name="prices" size={72} />
        <Text className="flex-1 text-2xl font-bold tracking-tight text-foreground">
          {t('Precios y costos de tus cultivos')}
        </Text>
      </HStack>
      <Text className="text-base leading-6 text-muted-foreground">
        {t('El precio propuesto viene de una referencia histórica del catálogo y puedes editarlo. Los costos de producción los ingresas tú.')}
      </Text>

      {cropIds.map((cropId) => {
        const crop: Crop | undefined = cropMap.get(cropId);
        const row = draft[cropId] ?? emptyRow();
        const reference = findCatalogPrice(cropId, parcel.district, priceReferences);
        const kgHa = toKgHa(row.yield_kg_ha, row.yieldUnit, row.sacoKg);
        const penKg = toPenKg(row.price_pen_kg, row.priceUnit, row.sacoKg);
        return (
          <SectionCard key={cropId} title={crop?.local_name ?? cropId}>
            <Text className="text-sm font-semibold text-foreground">
              {t('¿En qué unidad vendes?')}
            </Text>
            <UnitChips
              options={[
                { id: 'pen_kg', label: t('S/ por kg') },
                { id: 'pen_arroba', label: t('S/ por arroba') },
                { id: 'pen_saco', label: t('S/ por saco') },
              ]}
              selected={row.priceUnit}
              onSelect={(unit) => updateField(cropId, 'priceUnit', unit)}
            />
            <FormField
              label={t(reference ? 'Precio propuesto (editable)' : 'Precio de venta que recibes')}
              value={row.price_pen_kg}
              onChangeText={(value) => updateField(cropId, 'price_pen_kg', value)}
              testID={testIDs.parcelEconomicsPrice(cropId)}
              keyboardType="decimal-pad"
              placeholder={row.priceUnit === 'pen_kg' ? t('Ej. 1.20') : t('Ej. 60')}
            />
            {reference ? (
              <VStack className="gap-1 rounded-xl border border-border bg-muted/40 p-3">
                <Text className="text-sm font-semibold text-foreground">
                  {t('Referencia del catálogo: S/ {{value}} por kg', {
                    value: reference.precio_chacra.valor.toFixed(2),
                  })}
                </Text>
                <Text className="text-sm leading-5 text-muted-foreground">
                  {t('{{source}} · {{year}} · {{place}}', {
                    source: reference.fuente_id,
                    year: reference.periodo,
                    place: priceReferencePlace(reference),
                  })}
                </Text>
                {reference.estado.includes('pendiente') ? (
                  <Text className="text-sm leading-5 text-warning">
                  {t('Transcripción pendiente de cotejo. Confirma o corrige el valor antes de usarlo.')}
                  </Text>
                ) : (
                  <Text className="text-sm leading-5 text-muted-foreground">
                    {t('Es un precio estimado de referencia; todavía no es el precio confirmado de tu venta.')}
                  </Text>
                )}
                <AppButton
                  tone={row.priceConfirmed ? 'secondary' : 'outline'}
                  size="sm"
                  onPress={() => updateField(cropId, 'priceConfirmed', true)}
                  accessibilityState={{ selected: row.priceConfirmed }}
                >
                  {row.priceConfirmed ? t('Precio confirmado') : t('Confirmar este precio estimado')}
                </AppButton>
              </VStack>
            ) : null}
            <Text className="text-sm font-semibold text-foreground">
              {t('¿En qué unidad cosechas?')}
            </Text>
            <UnitChips
              options={[
                { id: 'kg_ha', label: t('kg por ha') },
                { id: 'arrobas_ha', label: t('arrobas por ha') },
                { id: 'sacos_ha', label: t('sacos por ha') },
              ]}
              selected={row.yieldUnit}
              onSelect={(unit) => updateField(cropId, 'yieldUnit', unit)}
            />
            <FormField
              label={t('Rendimiento por hectárea')}
              value={row.yield_kg_ha}
              onChangeText={(value) => updateField(cropId, 'yield_kg_ha', value)}
              keyboardType="decimal-pad"
              placeholder={row.yieldUnit === 'kg_ha' ? t('Ej. 12000') : row.yieldUnit === 'arrobas_ha' ? t('Ej. 1000') : t('Ej. 240')}
            />
            {row.yieldUnit === 'sacos_ha' ? (
              <FormField
                label={t('¿De cuántos kg es tu saco?')}
                value={row.sacoKg}
                onChangeText={(value) => updateField(cropId, 'sacoKg', value)}
                keyboardType="decimal-pad"
                placeholder={t('Ej. 50')}
              />
            ) : null}
            {(kgHa !== null || penKg !== null) && (row.yieldUnit !== 'kg_ha' || row.priceUnit !== 'pen_kg') ? (
              <Text className="text-sm leading-5 text-muted-foreground">
                {t('Equivale a {{yield}} y {{price}}. Así lo usamos para tu margen.', {
                  yield: kgHa !== null ? `${Math.round(kgHa)} kg/ha` : t('rendimiento pendiente'),
                  price: penKg !== null ? `S/ ${penKg.toFixed(2)}/kg` : t('precio pendiente'),
                })}
              </Text>
            ) : null}
            <FormField
              label={t('Tus costos totales de producción (S/)')}
              value={row.costs_pen}
              onChangeText={(value) => updateField(cropId, 'costs_pen', value)}
              keyboardType="decimal-pad"
              placeholder={t('Ej. 9000')}
            />
            <FormField
              label={t('% comercializable (cuánto vendes de lo que cosechas)')}
              value={row.marketable_share}
              onChangeText={(value) => updateField(cropId, 'marketable_share', value)}
              keyboardType="numeric"
              placeholder={t('Ej. 90')}
            />
          </SectionCard>
        );
      })}

      {cropIds.length < crops.length ? (
        <AppButton
          tone="outline"
          onPress={() => setShowCropPicker(true)}
          testID="parcel.economics.add_crop"
        >
          {t('Agregar otro cultivo del catálogo')}
        </AppButton>
      ) : null}

      {showCropPicker ? (
        <CropPicker
          crops={crops}
          selectedIds={cropIds}
          onSelect={(id) => {
            // The new crop is already in cropIds (all catalog crops are shown).
            // Just scroll to it and close the picker.
            setShowCropPicker(false);
          }}
          onClose={() => setShowCropPicker(false)}
        />
      ) : null}

      <Text className="text-sm leading-5 text-muted-foreground">
        {t('Si falta un dato, el margen se mostrará como pendiente; no como cero.')}
      </Text>
    </Screen>
  );
}
