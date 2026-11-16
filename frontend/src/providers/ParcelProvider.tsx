/**
 * ParcelProvider — web port of the native ParcelProvider.
 *
 * Holds the farmer's active parcel, its context (history/water/soil) and the
 * NASA indicators. The selection survives reloads through localStorage and the
 * last known list is cached so the PWA can open offline.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import {
  loadCachedParcels,
  loadSelectedParcelId,
  saveCachedParcels,
  saveSelectedParcelId,
} from '../lib/cache';
import type { Context, IndicatorResponse, Parcel } from '../lib/types';

export type ParcelGeometryInput = { type: 'Point' | 'Polygon'; coordinates: unknown };

type ParcelState = {
  parcel: Parcel | null;
  parcels: Parcel[];
  context: Context | null;
  indicators: IndicatorResponse | null;
  loading: boolean;
  error: string | null;
  createParcel: (input: {
    name: string;
    areaHa: number | null;
    lat: number;
    lon: number;
  }) => Promise<Parcel>;
  updateMeta: (input: {
    name: string;
    areaHa: number | null;
    district: string | null;
    geometry?: ParcelGeometryInput;
  }) => Promise<Parcel>;
  selectParcel: (parcel: Parcel) => void;
  refresh: () => Promise<void>;
  clearError: () => void;
};

const ParcelContext = createContext<ParcelState | null>(null);

export function ParcelProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(() => loadSelectedParcelId());  const [manualError, setManualError] = useState<string | null>(null);
  const [cached] = useState<Parcel[] | null>(() => loadCachedParcels());

  const parcelsQuery = useQuery({
    queryKey: ['parcels'],
    queryFn: api.getParcels,
    retry: false,
  });

  // Parcels are scoped to the authenticated user by the API, so the demo plot
  // created for this farmer stays visible after a reload (with a DEMO badge).
  const parcels = useMemo(
    () => parcelsQuery.data ?? cached ?? [],
    [cached, parcelsQuery.data],
  );

  useEffect(() => {
    if (parcelsQuery.data && parcels.length > 0) saveCachedParcels(parcels);
  }, [parcelsQuery.data, parcels]);

  // An explicitly selected parcel (e.g. the freshly created demo) wins even
  // when it is marked as simulated, matching the native ParcelProvider.
  const [selectedOverride, setSelectedOverride] = useState<Parcel | null>(null);

  const parcel = useMemo(() => {
    if (selectedOverride) return selectedOverride;
    if (parcels.length === 0) return null;
    return parcels.find((item) => item.id === selectedId) ?? parcels[0];
  }, [parcels, selectedId, selectedOverride]);

  useEffect(() => {
    if (parcel && parcel.id !== selectedId) setSelectedId(parcel.id);
  }, [parcel, selectedId]);

  const contextQuery = useQuery({
    queryKey: ['context', parcel?.id],
    queryFn: () => api.getContext(parcel!.id),
    enabled: Boolean(parcel),
    retry: false,
  });

  const indicatorsQuery = useQuery({
    queryKey: ['indicators', parcel?.id],
    queryFn: () => api.getIndicators(parcel!.id),
    enabled: Boolean(parcel),
    retry: false,
  });

  const selectParcel = useCallback((value: Parcel) => {
    setSelectedOverride(value);
    setSelectedId(value.id);
    saveSelectedParcelId(value.id);
    setManualError(null);
  }, []);

  const createMutation = useMutation({
    mutationFn: api.createParcel,
    onSuccess: (created) => {
      selectParcel(created);
      void queryClient.invalidateQueries({ queryKey: ['parcels'] });
    },
  });

  const createParcel = useCallback(
    async (input: { name: string; areaHa: number | null; lat: number; lon: number }) => {
      try {
        return await createMutation.mutateAsync({ ...input, district: 'Moquegua' });
      } catch (cause) {
        setManualError(
          cause instanceof Error ? cause.message : 'No se pudo crear la parcela',
        );
        throw cause;
      }
    },
    [createMutation],
  );

  const updateMeta = useCallback(
    async (input: {
      name: string;
      areaHa: number | null;
      district: string | null;
      geometry?: ParcelGeometryInput;
    }) => {
      if (!parcel) throw new Error('No hay una parcela activa');
      try {
        const updated = await api.updateParcelMeta(parcel.id, input);
        await queryClient.invalidateQueries({ queryKey: ['parcels'] });
        await Promise.all([contextQuery.refetch(), indicatorsQuery.refetch()]);
        return updated;
      } catch (cause) {
        setManualError(
          cause instanceof Error ? cause.message : 'No se pudo actualizar la parcela',
        );
        throw cause;
      }
    },
    [contextQuery, indicatorsQuery, parcel, queryClient],
  );

  const refresh = useCallback(async () => {
    await Promise.all([
      parcelsQuery.refetch(),
      contextQuery.refetch(),
      indicatorsQuery.refetch(),
    ]);
  }, [contextQuery, indicatorsQuery, parcelsQuery]);

  const queryError = parcelsQuery.error ?? contextQuery.error ?? indicatorsQuery.error ?? null;
  const error =
    manualError ??
    (queryError instanceof Error
      ? queryError.message
      : queryError
        ? 'No se pudo cargar la parcela'
        : null);

  const loading =
    (parcelsQuery.isLoading && parcels.length === 0) ||
    createMutation.isPending ||
    (Boolean(parcel) && contextQuery.isLoading && !parcelsQuery.isError);

  const value = useMemo<ParcelState>(
    () => ({
      parcel,
      parcels,
      context: contextQuery.data ?? null,
      indicators: indicatorsQuery.data ?? null,
      loading,
      error,
      createParcel,
      updateMeta,
      selectParcel,
      refresh,
      clearError: () => setManualError(null),
    }),
    [
      parcel,
      parcels,
      contextQuery.data,
      indicatorsQuery.data,
      loading,
      error,
      createParcel,
      updateMeta,
      selectParcel,
      refresh,
    ],
  );

  return <ParcelContext.Provider value={value}>{children}</ParcelContext.Provider>;
}

export function useParcel(): ParcelState {
  const value = useContext(ParcelContext);
  if (!value) throw new Error('useParcel must be used inside ParcelProvider');
  return value;
}
