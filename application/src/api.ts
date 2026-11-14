import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
const TOKEN_KEY = 'automatic_token';

let token: string | null = null;

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (auth) {
    if (!token) throw new ApiError(401, 'unauthorized', 'Sesión no iniciada');
    headers.Authorization = `Bearer ${token}`;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    if (!response.ok) {
      const error = body?.error ?? {};
      throw new ApiError(
        response.status,
        error.code ?? 'http_error',
        error.message ?? `Error HTTP ${response.status}`,
      );
    }
    return body as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function ensureSession(): Promise<void> {
  if (token) return;
  try {
    const saved = await SecureStore.getItemAsync(TOKEN_KEY);
    if (saved) {
      token = saved;
      try {
        await request('/api/v1/auth/me');
        return;
      } catch {
        token = null;
      }
    }
  } catch {
    token = null;
  }
  const session = await request<{ access_token: string }>(
    '/api/v1/auth/anonymous',
    {
      method: 'POST',
      body: JSON.stringify({ display_name: 'Agricultor', consent_version: 'v1' }),
    },
    false,
  );
  token = session.access_token;
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    // SecureStore may be unavailable in web; memory session still works.
  }
}

export type Parcel = {
  id: string;
  name: string;
  area_ha: number | null;
  district: string | null;
  geometry: { type: string; coordinates: unknown };
  is_simulated: boolean;
  preferences: Record<string, unknown>;
};

export type Context = {
  parcel: Parcel;
  history: Record<string, unknown>[];
  water: Record<string, unknown>[];
  soil: Record<string, unknown>[];
  missing_inputs: string[];
  completeness: {
    comparison: string;
    water: string;
    margin: string;
    missing: string[];
  };
  quality_flags: string[];
};

export type Indicator = {
  month: string;
  precip_mm: number | null;
  tmin_c: number | null;
  tmax_c: number | null;
  eto_mm: number | null;
};

export type IndicatorResponse = {
  parcel_id: string;
  source: {
    snapshot_id: string;
    source: string;
    resolution: string;
    quality_flag: string;
    is_simulated: boolean;
    retrieved_at: string;
  };
  indicators: Indicator[];
  warnings: string[];
};

export type Plan = {
  plan_id: string;
  label: string;
  kind: string;
  status: string;
  crop_sequence: string[];
  water: {
    net_irrigation_mm: number | null;
    gross_irrigation_mm: number | null;
    deficit_mm: number | null;
    available_mm: number | null;
    feasibility: string;
    missing_inputs: string[];
    assumptions: string[];
  };
  soil: {
    fertility_status: string;
    risk_flags: string[];
    notes: string[];
  };
  economics: {
    margin_pen: number | null;
    margin_pen_ha: number | null;
    confidence: string;
    price_assumption_type: string;
    missing_inputs: string[];
  };
  risk_flags: string[];
  missing_inputs: string[];
  why_this_plan: string[];
  tradeoffs: string[];
};

export type Comparison = {
  comparison_id: string;
  parcel_id: string;
  analysis_period: { start: string; end: string };
  plans: Plan[];
  source_snapshots: string[];
  scenario_type: string;
  warnings: string[];
  is_simulated: boolean;
  disclaimer: string;
};

export type AgentAction = { action: string; payload: Record<string, any> };

export type AgentMessage = {
  thread_id: string;
  status: string;
  answer: string;
  tool_trace: { tool: string; status: string; latency_ms: number; summary: string }[];
  evidence_refs: string[];
  ui_actions: AgentAction[];
  warnings: string[];
  analysis_run_id: string | null;
};

export type SavedPlan = {
  id: string;
  parcel_id: string;
  name: string;
  status: string;
};

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

export function apiBaseUrl(): string {
  return API_URL;
}
