/**
 * Shared React Query hooks for the Anden PWA.
 * Keeps query keys + fetchers in one place so every screen uses the
 * same cached data.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export function useQueryParcels() {
  return useQuery({
    queryKey: ['parcels'],
    queryFn: api.getParcels,
    retry: false,
  });
}

export function useQueryCatalogCrops(district?: string | null) {
  return useQuery({
    queryKey: ['catalog-crops', district ?? null],
    queryFn: () => api.getCrops(district),
    retry: false,
  });
}

export function useQueryComparison(id?: string | null) {
  return useQuery({
    queryKey: ['comparisons', id],
    queryFn: () => (id ? api.getComparison(id) : Promise.resolve(null)),
    enabled: !!id,
    retry: false,
  });
}

export function useQuerySavedPlans(parcelId?: string) {
  return useQuery({
    queryKey: ['saved-plans', parcelId],
    queryFn: () => (parcelId ? api.getSavedPlans() : Promise.resolve([])),
    enabled: !!parcelId,
    retry: false,
  });
}
