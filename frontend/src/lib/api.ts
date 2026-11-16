/*
 * Typed API client for Anden PWA.
 *
 * - Base URL: VITE_API_URL (dev: http://localhost:8000, prod: same-origin)
 * - Auth: anonymous token via POST /auth/anonymous + /auth/refresh
 * - 401 handling: single-flight refresh, then retry once
 * - Idempotency-Key on all writes (POST/PATCH/DELETE)
 * - Outbox hook: every write is recorded before the request is fired, so the
 *   offline outbox layer (src/lib/outbox.ts) can replay on reconnect.
 */

import type {
  AgentMessage,
  BundleDownload,
  Comparison,
  Context,
  Crop,
  CropHistoryEntry,
  IndicatorResponse,
  Irrigation,
  MeResponse,
  Parcel,
  SavedPlan,
  SavedPlanReview,
  SoilEntry,
  WaterEntry,
  CatalogPriceReference,
} from './types';

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? '';
export const apiBase = API_BASE;
const TOKEN_KEY = 'anden_token';
const REFRESH_KEY = 'anden_refresh';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/**
 * Reply from the agent. The proposal fields are newer backend additions, so
 * they stay optional here: an older API simply omits them and the UI shows no
 * confirmation card.
 */
export type AgentReply = AgentMessage & {
  pending_proposal_id?: string | null;
  save_preview?: string[];
};

/** Human-in-the-loop proposal returned by the confirm endpoint. */
export type Proposal = {
  id: string;
  type: string;
  status: string;
  payload: Record<string, unknown>;
  expires_at: string | null;
};

// ── Auth ────────────────────────────────────────────────────────────────

interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

function setTokens(t: AuthTokens): void {
  localStorage.setItem(TOKEN_KEY, t.access_token);
  localStorage.setItem(REFRESH_KEY, t.refresh_token);
}

function getTokens(): AuthTokens | null {
  const a = localStorage.getItem(TOKEN_KEY);
  const r = localStorage.getItem(REFRESH_KEY);
  if (!a || !r) return null;
  return { access_token: a, refresh_token: r };
}

function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

let _refreshPromise: Promise<AuthTokens> | null = null;

async function refreshTokens(): Promise<AuthTokens> {
  if (!_refreshPromise) {
    _refreshPromise = (async () => {
      const cur = getTokens();
      if (!cur) throw new ApiError(401, 'no_session', 'No hay sesión');
      const resp = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: cur.refresh_token }),
      });
      if (!resp.ok) {
        clearTokens();
        throw new ApiError(resp.status, 'refresh_failed', 'No se pudo renovar la sesión');
      }
      const data = (await resp.json()) as AuthTokens;
      setTokens(data);
      return data;
    })();
    _refreshPromise.finally(() => (_refreshPromise = null));
  }
  return _refreshPromise;
}

async function ensureAuth(): Promise<string> {
  const cur = getTokens();
  if (cur) return cur.access_token;
  // Anonymous bootstrap
  const resp = await fetch(`${API_BASE}/api/v1/auth/anonymous`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!resp.ok) throw new ApiError(resp.status, 'auth_failed', 'No se pudo crear sesión anónima');
  const data = (await resp.json()) as AuthTokens;
  setTokens(data);
  return data.access_token;
}

// ── ApiError ────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Core request ────────────────────────────────────────────────────────

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  /** When true, the request must succeed online (no outbox fallback). */
  idempotencyKey?: string;
  /** Longer timeout for agent messages (Vertex can take ~30 s). */
  timeoutMs?: number;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const method = opts.method ?? 'GET';
  const timeoutMs = opts.timeoutMs ?? 15_000;

  const doFetch = async (): Promise<Response> => {
    const token = await ensureAuth();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    // Every write gets an Idempotency-Key so the outbox can de-duplicate.
    if (method !== 'GET' && !headers['Idempotency-Key']) {
      headers['Idempotency-Key'] = opts.idempotencyKey ?? crypto.randomUUID();
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };

  let resp = await doFetch();

  // Single 401 → refresh → retry once
  if (resp.status === 401) {
    try {
      await refreshTokens();
      resp = await doFetch();
    } catch {
      clearTokens();
      // fall through to the error below
    }
  }

  if (!resp.ok) {
    let code = 'http_error';
    let msg = `Error ${resp.status}`;
    try {
      const err = await resp.json();
      code = err.code ?? code;
      msg = err.detail ?? msg;
    } catch {
      /* body was not JSON */
    }
    throw new ApiError(resp.status, code, msg);
  }

  if (resp.status === 204) return undefined as T;
  return (await resp.json()) as T;
}

// ── Public endpoints (mirrors application/src/services/api/endpoints.ts) ──

export const api = {
  // auth
  me: () => request<MeResponse>('/api/v1/auth/me'),
  updateProfile(input: {
    displayName: string | null;
    locale: string;
    profile: Record<string, unknown>;
    onboardingCompleted: boolean;
    consentVersion?: string | null;
  }) {
    return request<MeResponse>('/api/v1/auth/me', {
      method: 'PATCH',
      body: {
        display_name: input.displayName,
        locale: input.locale,
        profile: input.profile,
        onboarding_completed: input.onboardingCompleted,
        consent_version: input.consentVersion ?? null,
      },
    });
  },

  // parcels
  getParcels: () => request<Parcel[]>('/api/v1/parcels'),
  createDemoParcel: () => request<Parcel>('/api/v1/demo/parcel', { method: 'POST' }),
  createParcel(input: {
    name: string;
    areaHa: number | null;
    lat: number;
    lon: number;
    district?: string | null;
  }) {
    return request<Parcel>('/api/v1/parcels', {
      method: 'POST',
      body: {
        name: input.name,
        geometry: { type: 'Point', coordinates: [input.lon, input.lat] },
        area_ha: input.areaHa,
        district: input.district ?? 'Moquegua',
        preferences: { weights: { water: 0.5, margin: 0.3, budget: 0.2 } },
        is_simulated: false,
      },
    });
  },
  updateParcelMeta(
    parcelId: string,
    input: {
      name?: string;
      areaHa?: number | null;
      district?: string | null;
      geometry?: { type: 'Point' | 'Polygon'; coordinates: unknown };
    },
  ) {
    return request<Parcel>(`/api/v1/parcels/${parcelId}`, {
      method: 'PATCH',
      body: {
        name: input.name,
        area_ha: input.areaHa ?? null,
        district: input.district,
        geometry: input.geometry,
      },
    });
  },
  updateParcelPreferences(
    parcelId: string,
    preferences: {
      priorities?: Record<string, number>;
      constraints?: Record<string, unknown>;
      economics?: Record<
        string,
        {
          yield_kg_ha: number | null;
          price_pen_kg: number | null;
          costs_pen: number | null;
          price_source?: string;
          price_confirmed?: boolean;
          price_reference?: Record<string, unknown>;
          marketable_share?: number | null;
        }
      >;
      price_assumption_type?: string;
    },
  ) {
    return request<Parcel>(`/api/v1/parcels/${parcelId}`, {
      method: 'PATCH',
      body: { preferences },
    });
  },

  // crop history / water / soil
  getCropHistory: (parcelId: string) =>
    request<CropHistoryEntry[]>(`/api/v1/parcels/${parcelId}/crop-history`),
  addCropHistory(
    parcelId: string,
    input: {
      cropId: string | null;
      family?: string | null;
      dateStart?: string | null;
      dateEnd?: string | null;
      notes?: string | null;
    },
  ) {
    return request<CropHistoryEntry>(`/api/v1/parcels/${parcelId}/crop-history`, {
      method: 'POST',
      body: {
        crop_id: input.cropId,
        family: input.family ?? null,
        date_start: input.dateStart ?? null,
        date_end: input.dateEnd ?? null,
        notes: input.notes ?? null,
        source: 'farmer',
      },
    });
  },
  deleteCropHistory: (parcelId: string, rowId: string) =>
    request<void>(`/api/v1/parcels/${parcelId}/crop-history/${rowId}`, { method: 'DELETE' }),
  getWater: (parcelId: string) =>
    request<WaterEntry[]>(`/api/v1/parcels/${parcelId}/water`),
  addWater(
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
  ) {
    return request<WaterEntry>(`/api/v1/parcels/${parcelId}/water`, {
      method: 'POST',
      body: {
        start_at: input.startAt,
        end_at: input.endAt,
        mm: input.mm,
        volume_m3: input.volumeM3,
        method: input.method,
        efficiency: input.efficiency,
        confidence: input.confidence,
        notes: input.notes ?? null,
      },
    });
  },
  getSoil: (parcelId: string) =>
    request<SoilEntry[]>(`/api/v1/parcels/${parcelId}/soil`),
  addSoil(
    parcelId: string,
    input: { variable: string; value: number | null; unit?: string | null; method?: string },
  ) {
    return request<SoilEntry>(`/api/v1/parcels/${parcelId}/soil`, {
      method: 'POST',
      body: {
        variable: input.variable,
        value: input.value,
        unit: input.unit ?? null,
        method: input.method ?? 'declared',
        notes: null,
      },
    });
  },

  // context / indicators / irrigation
  getContext: (parcelId: string) =>
    request<Context>(`/api/v1/parcels/${parcelId}/context`),
  getIndicators: (parcelId: string) =>
    request<IndicatorResponse>(`/api/v1/parcels/${parcelId}/indicators`),
  getIrrigation: (parcelId: string) =>
    request<Irrigation>(`/api/v1/parcels/${parcelId}/irrigation?days=7`),

  // catalog (includes catalog_id and the best editable price reference per crop)
  getCrops: (district?: string | null) =>
    request<{
      catalog_version: string;
      review_status: string;
      crops: Crop[];
      prices_chacra_2025: CatalogPriceReference[];
    }>(
      `/api/v1/catalog/crops${district ? `?district=${encodeURIComponent(district)}` : ''}`,
    ),

  // comparisons
  createComparison: (parcelId: string) =>
    request<Comparison>('/api/v1/comparisons', {
      method: 'POST',
      body: { parcel_id: parcelId },
    }),
  getComparison: (comparisonId: string) =>
    request<Comparison>(`/api/v1/comparisons/${comparisonId}`),
  simulate: (comparisonId: string, waterMultiplier = 1, priceMultiplier = 1) =>
    request<Comparison>(`/api/v1/comparisons/${comparisonId}/simulate`, {
      method: 'POST',
      body: {
        water_multiplier: waterMultiplier,
        price_multiplier: priceMultiplier,
      },
    }),

  // agent
  createThread: (parcelId: string) =>
    request<{ thread_id: string }>('/api/v1/agent/threads', {
      method: 'POST',
      body: { parcel_id: parcelId },
    }),
  sendAgentMessage(
    threadId: string,
    message: string,
    uiContext: Record<string, unknown> = { screen: 'agent' },
    mode: 'chat' | 'guided' = 'chat',
  ) {
    return request<AgentReply>(
      `/api/v1/agent/threads/${threadId}/messages`,
      {
        method: 'POST',
        body: { message, ui_context: uiContext, mode },
        timeoutMs: 60_000,
      },
    );
  },

  // proposals — the farmer always confirms before anything is saved
  confirmProposal: (proposalId: string, approved: boolean) =>
    request<Proposal>(`/api/v1/actions/${proposalId}/confirm`, {
      method: 'POST',
      body: { approved },
    }),

  // saved plans
  getSavedPlans: () => request<SavedPlan[]>('/api/v1/saved-plans'),
  sendFeedback(input: {
    parcelId?: string | null;
    kind: 'comparison' | 'onboarding' | 'general';
    rating?: number | null;
    comment?: string | null;
    context?: Record<string, unknown>;
  }) {
    return request<{ id: string; kind: string; rating: number | null; created_at: string }>(
      '/api/v1/feedback',
      {
        method: 'POST',
        body: {
          parcel_id: input.parcelId ?? null,
          kind: input.kind,
          rating: input.rating ?? null,
          comment: input.comment ?? null,
          context: input.context ?? {},
        },
      },
    );
  },  savePlan(input: {
    parcelId: string;
    comparisonId: string;
    preferredPlanId: string;
    fallbackPlanId: string;
    name: string;
  }) {
    return request<SavedPlan>('/api/v1/saved-plans', {
      method: 'POST',
      body: {
        parcel_id: input.parcelId,
        comparison_id: input.comparisonId,
        preferred_plan_id: input.preferredPlanId,
        fallback_plan_id: input.fallbackPlanId,
        name: input.name,
      },
    });
  },
  reviewSavedPlan(savedPlanId: string, comparisonId?: string | null) {
    const q = comparisonId ? `?comparison_id=${encodeURIComponent(comparisonId)}` : '';
    return request<SavedPlanReview>(
      `/api/v1/saved-plans/${savedPlanId}/review${q}`,
    );
  },

  // bundle
  downloadParcelBundle(parcelId: string, live = true): Promise<BundleDownload> {
    return (async () => {
      const resp = await fetch(`${API_BASE}/api/v1/parcels/${parcelId}/bundle?live=${live ? 'true' : 'false'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!resp.ok) throw new ApiError(resp.status, 'bundle_error', `Error ${resp.status}`);
      const text = await resp.text();
      const checksum = resp.headers.get('X-Bundle-Checksum');
      if (!checksum) throw new ApiError(502, 'bundle_integrity', 'El paquete no incluye checksum');
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      const hex = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      if (hex !== checksum) throw new ApiError(502, 'bundle_integrity', 'El paquete llegó incompleto');
      const bundle = JSON.parse(text) as BundleDownload['bundle'];
      return {
        bundle,
        checksum,
        sizeBytes: text.length,
        downloadedAt: new Date().toISOString(),
      };
    })();
  },
};
