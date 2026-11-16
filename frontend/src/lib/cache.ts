/** Small localStorage cache so the PWA still opens with the last known data. */
import type { Comparison, Parcel } from './types';

const PARCELS_KEY = 'anden.cache.parcels';
const PARCEL_ID_KEY = 'anden.parcel_id';

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or private mode: caching is best-effort.
  }
}

export function loadCachedParcels(): Parcel[] | null {
  return readJson<Parcel[]>(PARCELS_KEY);
}

export function saveCachedParcels(parcels: Parcel[]): void {
  writeJson(PARCELS_KEY, parcels);
}

export function loadSelectedParcelId(): string | null {
  return window.localStorage.getItem(PARCEL_ID_KEY);
}

export function saveSelectedParcelId(id: string): void {
  window.localStorage.setItem(PARCEL_ID_KEY, id);
}

const comparisonKey = (parcelId: string) => `anden.cache.comparison.${parcelId}`;
const comparisonSavedAtKey = (parcelId: string) => `anden.cache.comparison.${parcelId}.savedAt`;

export function loadCachedComparison(parcelId: string): Comparison | null {
  return readJson<Comparison>(comparisonKey(parcelId));
}

/** When the offline copy was stored on this device (ISO string). */
export function loadCachedComparisonSavedAt(parcelId: string): string | null {
  return window.localStorage.getItem(comparisonSavedAtKey(parcelId));
}

export function saveCachedComparison(parcelId: string, comparison: Comparison): void {
  writeJson(comparisonKey(parcelId), comparison);
  try {
    window.localStorage.setItem(comparisonSavedAtKey(parcelId), new Date().toISOString());
  } catch {
    // Quota or private mode: the comparison is still cached best-effort.
  }
}
