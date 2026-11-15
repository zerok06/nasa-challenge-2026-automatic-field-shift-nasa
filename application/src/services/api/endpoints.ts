import * as Crypto from 'expo-crypto';

import { request, requestText, ApiError } from './client';
import type {
  AgentMessage,
  BundleDownload,
  Comparison,
  Context,
  Crop,
  CropHistoryEntry,
  GeoDiscovery,
  IndicatorResponse,
  Irrigation,
  MeResponse,
  Parcel,
  ParcelBundle,
  SavedPlan,
  SoilEntry,
  WaterEntry,
} from './types';

export async function getMe(): Promise<MeResponse> {
  return request('/api/v1/auth/me');
}

export async function updateProfile(input: {
  displayName: string | null;
  locale: string;
  profile: Record<string, unknown>;
  onboardingCompleted: boolean;
  consentVersion?: string | null;
}): Promise<MeResponse> {
  return request('/api/v1/auth/me', {
    method: 'PATCH',
    body: JSON.stringify({
      display_name: input.displayName,
      locale: input.locale,
      profile: input.profile,
      onboarding_completed: input.onboardingCompleted,
      consent_version: input.consentVersion ?? null,
    }),
  });
}

export async function getParcels(): Promise<Parcel[]> {
  return request('/api/v1/parcels');
}

export async function getCrops(): Promise<{ catalog_version: string; review_status: string; crops: Crop[] }> {
  return request('/api/v1/catalog/crops');
}

export async function getCropHistory(parcelId: string): Promise<CropHistoryEntry[]> {
  return request(`/api/v1/parcels/${parcelId}/crop-history`);
}

export async function addCropHistory(
  parcelId: string,
  input: {
    cropId: string | null;
    family: string | null;
    dateStart: string | null;
    dateEnd: string | null;
    notes?: string | null;
  },
): Promise<CropHistoryEntry> {
  return request(`/api/v1/parcels/${parcelId}/crop-history`, {
    method: 'POST',
    body: JSON.stringify({
      crop_id: input.cropId,
      family: input.family,
      date_start: input.dateStart,
      date_end: input.dateEnd,
      notes: input.notes ?? null,
      source: 'farmer',
    }),
  });
}

export async function deleteCropHistory(parcelId: string, rowId: string): Promise<void> {
  await request(`/api/v1/parcels/${parcelId}/crop-history/${rowId}`, { method: 'DELETE' });
}

export async function getWater(parcelId: string): Promise<WaterEntry[]> {
  return request(`/api/v1/parcels/${parcelId}/water`);
}

export async function addWater(
  parcelId: string,
  input: {
    startAt: string;
    endAt: string;
    mm: number | null;
    volumeM3: number | null;
    method: string;
    efficiency: number | null;
    confidence: string;
    notes?: string | null;
  },
): Promise<WaterEntry> {
  return request(`/api/v1/parcels/${parcelId}/water`, {
    method: 'POST',
    body: JSON.stringify({
      start_at: input.startAt,
      end_at: input.endAt,
      mm: input.mm,
      volume_m3: input.volumeM3,
      method: input.method,
      efficiency: input.efficiency,
      confidence: input.confidence,
      notes: input.notes ?? null,
    }),
  });
}

export async function getSoil(parcelId: string): Promise<SoilEntry[]> {
  return request(`/api/v1/parcels/${parcelId}/soil`);
}

export async function addSoil(
  parcelId: string,
  input: {
    variable: string;
    value: number | null;
    unit: string | null;
    method: string;
    notes?: string | null;
  },
): Promise<SoilEntry> {
  return request(`/api/v1/parcels/${parcelId}/soil`, {
    method: 'POST',
    body: JSON.stringify({
      variable: input.variable,
      value: input.value,
      unit: input.unit,
      method: input.method,
      source: 'farmer',
      notes: input.notes ?? null,
    }),
  });
}

export async function updateParcelPreferences(
  parcelId: string,
  preferences: {
    priorities?: Record<string, number>;
    constraints?: Record<string, unknown>;
    economics?: Record<
      string,
      { yield_kg_ha: number | null; price_pen_kg: number | null; costs_pen: number | null }
    >;
    price_assumption_type?: 'farmer' | 'historical' | 'reference' | 'none';
  },
): Promise<Parcel> {
  return request(`/api/v1/parcels/${parcelId}`, {
    method: 'PATCH',
    body: JSON.stringify({ preferences }),
  });
}

export type ParcelGeometryInput = {
  type: 'Point' | 'Polygon';
  coordinates: number[] | number[][][];
};

export async function createParcel(input: {
  name: string;
  areaHa: number | null;
  lat: number;
  lon: number;
  district?: string | null;
  geometry?: ParcelGeometryInput;
}): Promise<Parcel> {
  return request('/api/v1/parcels', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      geometry: input.geometry ?? { type: 'Point', coordinates: [input.lon, input.lat] },
      area_ha: input.areaHa,
      district: input.district ?? 'Moquegua',
      preferences: {
        weights: { water: 0.5, soil: 0.3, margin: 0.2 },
      },
      is_simulated: false,
    }),
  });
}

export async function getContext(parcelId: string): Promise<Context> {
  return request(`/api/v1/parcels/${parcelId}/context`);
}

export async function getIndicators(parcelId: string): Promise<IndicatorResponse> {
  return request(`/api/v1/parcels/${parcelId}/indicators`);
}

export async function getIrrigation(parcelId: string): Promise<Irrigation> {
  return request(`/api/v1/parcels/${parcelId}/irrigation?days=7`);
}

export async function createComparison(parcelId: string): Promise<Comparison> {
  return request('/api/v1/comparisons', {
    method: 'POST',
    body: JSON.stringify({ parcel_id: parcelId }),
  });
}

export async function getComparison(comparisonId: string): Promise<Comparison> {
  return request(`/api/v1/comparisons/${comparisonId}`);
}

export async function simulate(
  comparisonId: string,
  waterMultiplier = 1,
  priceMultiplier = 1,
): Promise<Comparison> {
  return request(`/api/v1/comparisons/${comparisonId}/simulate`, {
    method: 'POST',
    body: JSON.stringify({
      water_multiplier: waterMultiplier,
      price_multiplier: priceMultiplier,
    }),
  });
}

export async function createThread(parcelId: string): Promise<{ thread_id: string }> {
  return request('/api/v1/agent/threads', {
    method: 'POST',
    body: JSON.stringify({ parcel_id: parcelId }),
  });
}

export async function sendAgentMessage(
  threadId: string,
  message: string,
): Promise<AgentMessage> {
  // Vertex can take close to the server timeout before deterministic fallback.
  return request(
    `/api/v1/agent/threads/${threadId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({ message, ui_context: { screen: 'agent' } }),
    },
    true,
    60000,
  );
}

export async function confirmAction(proposalId: string, approved = true): Promise<void> {
  await request(`/api/v1/actions/${proposalId}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ approved }),
  });
}

export async function sendFeedback(input: {
  parcelId?: string | null;
  kind?: 'comparison' | 'onboarding' | 'general';
  rating: number;
  comment?: string | null;
  context?: Record<string, unknown>;
}): Promise<void> {
  await request('/api/v1/feedback', {
    method: 'POST',
    body: JSON.stringify({
      parcel_id: input.parcelId ?? null,
      kind: input.kind ?? 'comparison',
      rating: input.rating,
      comment: input.comment ?? null,
      context: input.context ?? {},
    }),
  });
}

export async function getSavedPlans(): Promise<SavedPlan[]> {
  return request('/api/v1/saved-plans');
}

export async function discoverSources(lat: number, lon: number): Promise<GeoDiscovery> {
  return request(`/api/v1/geo/discover?lat=${lat}&lon=${lon}&probe=true`);
}

export async function downloadParcelBundle(
  parcelId: string,
  live = true,
): Promise<BundleDownload> {
  const { text, headers } = await requestText(
    `/api/v1/parcels/${parcelId}/bundle?live=${live ? 'true' : 'false'}`,
    { method: 'POST' },
  );
  const checksum = headers.get('X-Bundle-Checksum');
  const sizeBytes = Number(headers.get('X-Bundle-Size') ?? '0');
  if (!checksum) {
    throw new ApiError(502, 'bundle_integrity', 'El paquete no incluye checksum');
  }
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);
  if (digest.toLowerCase() !== checksum.toLowerCase()) {
    throw new ApiError(502, 'bundle_integrity', 'El paquete llegó incompleto');
  }
  const bundle = JSON.parse(text) as ParcelBundle;
  return {
    bundle,
    checksum,
    sizeBytes: sizeBytes || text.length,
    downloadedAt: new Date().toISOString(),
  };
}
