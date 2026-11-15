import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { loadCachedParcels, saveCachedParcels } from '@/offline/parcels';

import {
  createParcel as createParcelRequest,
  getContext,
  getIndicators,
  getParcels,
  type Context,
  type IndicatorResponse,
  type Parcel,
  type ParcelGeometryInput,
} from '@/services/api';
import { useSession } from './SessionProvider';

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
    district?: string | null;
    geometry?: ParcelGeometryInput;
  }) => Promise<Parcel>;
  selectParcel: (parcel: Parcel) => void;
  refresh: () => Promise<void>;
  clearError: () => void;
};

const ParcelContext = createContext<ParcelState | null>(null);

export function ParcelProvider({ children }: { children: React.ReactNode }) {
  const { ready: sessionReady } = useSession();
  const queryClient = useQueryClient();
  const [selectedOverride, setSelectedOverride] = useState<Parcel | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);
  const [cachedParcels, setCachedParcels] = useState<Parcel[] | null>(null);

  useEffect(() => {
    let mounted = true;
    void loadCachedParcels().then((value) => {
      if (mounted && value) setCachedParcels(value);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const parcelsQuery = useQuery({
    queryKey: ['parcels'],
    queryFn: getParcels,
    enabled: sessionReady,
  });

  // The real app only shows farmer-created parcels. Synthetic fixtures stay
  // available to backend tests but never appear as a farmer's plot.
  const visibleParcels = useMemo(() => {
    const source = parcelsQuery.data ?? cachedParcels ?? [];
    return source.filter((item) => !item.is_simulated);
  }, [cachedParcels, parcelsQuery.data]);

  useEffect(() => {
    if (parcelsQuery.data && visibleParcels.length > 0) {
      void saveCachedParcels(visibleParcels);
    }
  }, [parcelsQuery.data, visibleParcels]);

  const selected = selectedOverride ?? visibleParcels[0] ?? null;

  const contextQuery = useQuery({
    queryKey: ['context', selected?.id],
    queryFn: () => getContext(selected!.id),
    enabled: Boolean(selected),
  });

  const indicatorsQuery = useQuery({
    queryKey: ['indicators', selected?.id],
    queryFn: () => getIndicators(selected!.id),
    enabled: Boolean(selected),
  });


  const createMutation = useMutation({
    mutationFn: createParcelRequest,
    onSuccess: (parcel) => {
      setSelectedOverride(parcel);
      setManualError(null);
      queryClient.invalidateQueries({ queryKey: ['parcels'] });
    },
  });

  const selectParcel = useCallback((parcel: Parcel) => {
    setSelectedOverride(parcel);
    setManualError(null);
  }, []);


  const createParcel = useCallback(
    async (input: {
      name: string;
      areaHa: number | null;
      lat: number;
      lon: number;
      district?: string | null;
      geometry?: ParcelGeometryInput;
    }) => {
      try {
        return await createMutation.mutateAsync(input);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'No se pudo crear la parcela';
        setManualError(message);
        throw cause;
      }
    },
    [createMutation],
  );

  const refresh = useCallback(async () => {
    await Promise.all([
      parcelsQuery.refetch(),
      contextQuery.refetch(),
      indicatorsQuery.refetch(),
    ]);
  }, [parcelsQuery, contextQuery, indicatorsQuery]);

  const queryError =
    parcelsQuery.error ?? contextQuery.error ?? indicatorsQuery.error ?? null;
  const error =
    manualError ??
    (queryError
      ? queryError instanceof Error
        ? queryError.message
        : 'No se pudo cargar la parcela'
      : null);

  const loading =
    !sessionReady ||
    (parcelsQuery.isLoading && visibleParcels.length === 0) ||
    createMutation.isPending ||
    (Boolean(selected) && contextQuery.isLoading && !parcelsQuery.isError);

  const value = useMemo<ParcelState>(
    () => ({
      parcel: selected,
      parcels: visibleParcels,
      context: contextQuery.data ?? null,
      indicators: indicatorsQuery.data ?? null,
      loading,
      error,
      createParcel,
      selectParcel,
      refresh,
      clearError: () => setManualError(null),
    }),
    [
      selected,
      visibleParcels,
      contextQuery.data,
      indicatorsQuery.data,
      loading,
      error,
      createParcel,
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
