import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createDemoParcel,
  createParcel as createParcelRequest,
  getContext,
  getIndicators,
  getParcels,
  type Context,
  type IndicatorResponse,
  type Parcel,
} from '@/services/api';
import { useSession } from './SessionProvider';

type ParcelState = {
  parcel: Parcel | null;
  parcels: Parcel[];
  context: Context | null;
  indicators: IndicatorResponse | null;
  loading: boolean;
  error: string | null;
  createDemo: () => Promise<Parcel>;
  createParcel: (input: {
    name: string;
    areaHa: number | null;
    lat: number;
    lon: number;
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

  const parcelsQuery = useQuery({
    queryKey: ['parcels'],
    queryFn: getParcels,
    enabled: sessionReady,
  });

  // Derive the active parcel instead of synchronizing it in an effect.
  // A demo parcel created in this session wins over the server list.
  const selected = selectedOverride ?? parcelsQuery.data?.[0] ?? null;

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

  const demoMutation = useMutation({
    mutationFn: createDemoParcel,
    onSuccess: (parcel) => {
      setSelectedOverride(parcel);
      setManualError(null);
      queryClient.invalidateQueries({ queryKey: ['parcels'] });
    },
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

  const createDemo = useCallback(async () => {
    try {
      return await demoMutation.mutateAsync();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'No se pudo crear la parcela demo';
      setManualError(message);
      throw cause;
    }
  }, [demoMutation]);

  const createParcel = useCallback(
    async (input: { name: string; areaHa: number | null; lat: number; lon: number }) => {
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
    parcelsQuery.isLoading ||
    demoMutation.isPending ||
    createMutation.isPending ||
    (Boolean(selected) && (contextQuery.isLoading || indicatorsQuery.isLoading));

  const value = useMemo<ParcelState>(
    () => ({
      parcel: selected,
      parcels: parcelsQuery.data ?? [],
      context: contextQuery.data ?? null,
      indicators: indicatorsQuery.data ?? null,
      loading,
      error,
      createDemo,
      createParcel,
      selectParcel,
      refresh,
      clearError: () => setManualError(null),
    }),
    [
      selected,
      parcelsQuery.data,
      contextQuery.data,
      indicatorsQuery.data,
      loading,
      error,
      createDemo,
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
