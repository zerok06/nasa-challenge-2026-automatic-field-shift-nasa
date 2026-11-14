import { request } from './client';
import type {
  AgentMessage,
  Comparison,
  Context,
  IndicatorResponse,
  Parcel,
  SavedPlan,
} from './types';

export async function getParcels(): Promise<Parcel[]> {
  return request('/api/v1/parcels');
}

export async function createDemoParcel(): Promise<Parcel> {
  return request('/api/v1/demo/parcel', { method: 'POST' });
}

export async function createParcel(input: {
  name: string;
  areaHa: number | null;
  lat: number;
  lon: number;
}): Promise<Parcel> {
  return request('/api/v1/parcels', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      geometry: { type: 'Point', coordinates: [input.lon, input.lat] },
      area_ha: input.areaHa,
      district: 'Moquegua',
      preferences: {
        weights: { water: 0.5, soil: 0.3, margin: 0.2 },
        economics: {
          onion: { yield_kg_ha: 12000, price_pen_kg: 1.2, costs_pen: 9000 },
          pumpkin: { yield_kg_ha: 15000, price_pen_kg: 0.9, costs_pen: 8000 },
          chili: { yield_kg_ha: 8000, price_pen_kg: 2.5, costs_pen: 9500 },
        },
        price_assumption_type: 'historical',
      },
      is_simulated: true,
    }),
  });
}

export async function getContext(parcelId: string): Promise<Context> {
  return request(`/api/v1/parcels/${parcelId}/context`);
}

export async function getIndicators(parcelId: string): Promise<IndicatorResponse> {
  return request(`/api/v1/parcels/${parcelId}/indicators`);
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
  return request(`/api/v1/agent/threads/${threadId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message, ui_context: { screen: 'agent' } }),
  });
}

export async function confirmAction(proposalId: string, approved = true): Promise<void> {
  await request(`/api/v1/actions/${proposalId}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ approved }),
  });
}

export async function getSavedPlans(): Promise<SavedPlan[]> {
  return request('/api/v1/saved-plans');
}
