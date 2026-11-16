import * as SecureStore from 'expo-secure-store';

import type { Parcel } from '@/services/api/types';

const PARCELS_KEY = 'anden_parcels_v1';

export async function loadCachedParcels(): Promise<Parcel[] | null> {
  try {
    const raw = await SecureStore.getItemAsync(PARCELS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Parcel[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveCachedParcels(parcels: Parcel[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(PARCELS_KEY, JSON.stringify(parcels.slice(0, 20)));
  } catch {
    // A cache failure must not block the online app.
  }
}
