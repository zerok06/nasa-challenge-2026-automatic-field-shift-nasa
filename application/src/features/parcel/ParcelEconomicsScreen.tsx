import React, { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { AppAlert } from '@/components/app/AppAlert';
import { AppButton } from '@/components/app/AppButton';
import { AppHeader } from '@/components/app/AppHeader';
import { FormField } from '@/components/app/FormField';
import { Screen } from '@/components/app/Screen';
import { Illustration } from '@/components/illustrations/Illustration';
import { SectionCard } from '@/components/app/SectionCard';
import { StateView } from '@/components/app/StateView';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { testIDs } from '@/design-system/testIDs';
import { useComparison } from '@/providers/ComparisonProvider';
import { useParcel } from '@/providers/ParcelProvider';
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
};

function numberOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

export function ParcelEconomicsScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { parcel, selectParcel } = useParcel();
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
  const cropMap = useMemo(() => new Map(crops.map((crop) => [crop.id, crop])), [crops]);
  const cropIds = useMemo(() => {
    const ids = new Set(
      (historyQuery.data ?? [])
        .map((row) => row.crop_id)
        .filter((id): id is string => Boolean(id)),
    );
    for (const plan of comparison?.plans ?? []) {
      for (const cropId of plan.crop_sequence) ids.add(cropId);
    }
    return Array.from(ids);
  }, [comparison, historyQuery.data]);

  const draft = useMemo(() => {
    const existing = (parcel?.preferences.economics ?? {}) as Record<
      string,
      { yield_kg_ha?: number | null; price_pen_kg?: number | null; costs_pen?: number | null }
    >;
    const next: Record<string, CropEconomicsDraft> = {};
    for (const cropId of cropIds) {
      const item = existing[cropId] ?? {};
      next[cropId] = {
        yield_kg_ha:
          item.yield_kg_ha !== null && item.yield_kg_ha !== undefined
            ? String(item.yield_kg_ha)
            : '',
        price_pen_kg:
          item.price_pen_kg !== null && item.price_pen_kg !== undefined
            ? String(item.price_pen_kg)
            : '',
        costs_pen:
          item.costs_pen !== null && item.costs_pen !== undefined
            ? String(item.costs_pen)
            : '',
        ...(edits[cropId] ?? {}),
      };
    }
    return next;
  }, [cropIds, edits, parcel]);

  const updateField = (cropId: string, field: keyof CropEconomicsDraft, value: string) => {
    setEdits((current) => ({
      ...current,
      [cropId]: {
        ...(current[cropId] ?? {}),
        [field]: value,
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
          const row = draft[cropId] ?? { yield_kg_ha: '', price_pen_kg: '', costs_pen: '' };
          return [
            cropId,
            {
              yield_kg_ha: numberOrNull(row.yield_kg_ha),
              price_pen_kg: numberOrNull(row.price_pen_kg),
              costs_pen: numberOrNull(row.costs_pen),
            },
          ];
        }),
      );
      const updated = await updateParcelPreferences(parcelId, {
        economics,
        price_assumption_type: 'farmer',
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
        {t(
          'Estos datos son tuyos: no los inventamos. Sin el costo no podemos calcular un margen real.',
        )}
      </Text>

      {cropIds.map((cropId) => {
        const crop: Crop | undefined = cropMap.get(cropId);
        const row = draft[cropId] ?? { yield_kg_ha: '', price_pen_kg: '', costs_pen: '' };
        return (
          <SectionCard key={cropId} title={crop?.local_name ?? cropId}>
            <FormField
              label={t('Rendimiento (kg por hectárea)')}
              value={row.yield_kg_ha}
              onChangeText={(value) => updateField(cropId, 'yield_kg_ha', value)}
              keyboardType="decimal-pad"
              placeholder={t('Ej. 12000')}
            />
            <FormField
              label={t('Precio de venta (S/ por kg)')}
              value={row.price_pen_kg}
              onChangeText={(value) => updateField(cropId, 'price_pen_kg', value)}
              keyboardType="decimal-pad"
              placeholder={t('Ej. 1.20')}
            />
            <FormField
              label={t('Costo de producción (S/ por hectárea)')}
              value={row.costs_pen}
              onChangeText={(value) => updateField(cropId, 'costs_pen', value)}
              keyboardType="decimal-pad"
              placeholder={t('Ej. 9000')}
            />
          </SectionCard>
        );
      })}

      <Text className="text-sm leading-5 text-muted-foreground">
        {t('Si falta un dato, el margen se mostrará como pendiente; no como cero.')}
      </Text>
    </Screen>
  );
}
