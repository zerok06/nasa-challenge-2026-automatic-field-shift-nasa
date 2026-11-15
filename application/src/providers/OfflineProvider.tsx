import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNetInfo } from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';

import { discoverSources, downloadParcelBundle } from '@/services/api';
import type { GeoDiscovery, ParcelBundle } from '@/services/api/types';
import { loadBundle, saveBundle, type StoredBundle } from '@/offline/db';
import { useParcel } from '@/providers/ParcelProvider';

type OfflineState = {
  online: boolean;
  bundle: ParcelBundle | null;
  stored: StoredBundle | null;
  discovery: GeoDiscovery | null;
  discoveryLoading: boolean;
  downloading: boolean;
  error: string | null;
  lastUpdated: string | null;
  isStale: boolean;
  refreshDiscovery: () => Promise<void>;
  download: (live?: boolean) => Promise<void>;
  clearError: () => void;
};

const OfflineContext = createContext<OfflineState | null>(null);

function center(parcel: ReturnType<typeof useParcel>['parcel']): { lat: number; lon: number } | null {
  const geometry = parcel?.geometry;
  const coords = geometry?.coordinates;
  if (!geometry || !Array.isArray(coords)) return null;
  if (geometry.type === 'Point' && coords.length >= 2) {
    return { lat: Number(coords[1]), lon: Number(coords[0]) };
  }
  if (geometry.type === 'Polygon' && coords.length > 0 && Array.isArray(coords[0])) {
    const ring = coords[0] as unknown[];
    const points = ring.length > 1 && ring[0] === ring[ring.length - 1] ? ring.slice(0, -1) : ring;
    if (points.length === 0) return null;
    return {
      lat:
        points.reduce((sum: number, point) => sum + Number((point as number[])[1]), 0) /
        points.length,
      lon:
        points.reduce((sum: number, point) => sum + Number((point as number[])[0]), 0) /
        points.length,
    };
  }
  return null;
}

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const { parcel } = useParcel();
  const queryClient = useQueryClient();
  const netInfo = useNetInfo();
  const online = netInfo.isConnected !== false && netInfo.isInternetReachable !== false;
  const [loaded, setLoaded] = useState<StoredBundle | null>(null);
  const [discovery, setDiscovery] = useState<GeoDiscovery | null>(null);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clock, setClock] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!parcel) return () => {
      mounted = false;
    };
    void loadBundle(parcel.id)
      .then((value) => {
        if (mounted) setLoaded(value);
      })
      .catch(() => {
        // A missing cache simply means the parcel has not been downloaded yet.
      });
    return () => {
      mounted = false;
    };
  }, [parcel]);

  useEffect(() => {
    const interval = setInterval(() => setClock(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const stored = loaded?.parcelId === parcel?.id ? loaded : null;

  const refreshDiscovery = useCallback(async () => {
    const point = center(parcel);
    if (!point) return;
    setDiscoveryLoading(true);
    setError(null);
    try {
      const result = await discoverSources(point.lat, point.lon);
      setDiscovery(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron descubrir las fuentes');
    } finally {
      setDiscoveryLoading(false);
    }
  }, [parcel]);

  const download = useCallback(
    async (live = true) => {
      if (!parcel) return;
      if (!online) {
        setError('Sin conexión: no puedes descargar datos nuevos');
        return;
      }
      setDownloading(true);
      setError(null);
      try {
        const result = await downloadParcelBundle(parcel.id, live);
        await saveBundle(
          parcel.id,
          result.bundle,
          result.checksum,
          result.sizeBytes,
          result.downloadedAt,
        );
        setLoaded({
          parcelId: parcel.id,
          bundle: result.bundle,
          checksum: result.checksum,
          sizeBytes: result.sizeBytes,
          downloadedAt: result.downloadedAt,
          expiresAt: result.bundle.expires_at,
        });
        await queryClient.invalidateQueries({ queryKey: ['indicators', parcel.id] });
        await queryClient.invalidateQueries({ queryKey: ['context', parcel.id] });
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'No se pudieron descargar los datos');
        throw cause;
      } finally {
        setDownloading(false);
      }
    },
    [online, parcel, queryClient],
  );

  const bundle = stored?.bundle ?? null;
  const isStale = Boolean(
    stored && clock !== null && new Date(stored.expiresAt).getTime() < clock,
  );

  const value = useMemo<OfflineState>(
    () => ({
      online,
      bundle,
      stored,
      discovery,
      discoveryLoading,
      downloading,
      error,
      lastUpdated: stored?.downloadedAt ?? null,
      isStale,
      refreshDiscovery,
      download,
      clearError: () => setError(null),
    }),
    [
      online,
      bundle,
      stored,
      discovery,
      discoveryLoading,
      downloading,
      error,
      isStale,
      refreshDiscovery,
      download,
    ],
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline(): OfflineState {
  const value = useContext(OfflineContext);
  if (!value) throw new Error('useOffline must be used inside OfflineProvider');
  return value;
}
