/**
 * Shared PWA type definitions.
 *
 * These mirror `application/src/services/api/types.ts` (the native app's
 * client types).  They are duplicated here — not imported from the native
 * app — so the PWA frontend is fully standalone and can be built with
 * Vite without any dependency on the Expo workspace.
 */

// ── Auth ────────────────────────────────────────────────────────────────

export type UserProfile = {
  id: string;
  display_name: string | null;
  is_anonymous: boolean;
  locale: string;
  consent_version: string | null;
  consent_at: string | null;
  profile: {
    audio?: boolean;
    experience?: 'first' | 'some' | 'experienced';
    home?: { lat: number; lon: number; district?: string | null } | null;
  };
  onboarding_completed_at: string | null;
};

export type MeResponse = {
  user: UserProfile;
};

// ── Parcel ──────────────────────────────────────────────────────────────

export type Parcel = {
  id: string;
  name: string;
  area_ha: number | null;
  district: string | null;
  geometry: { type: string; coordinates: unknown };
  is_simulated: boolean;
  preferences: Record<string, unknown>;
};

// ── Catalog ─────────────────────────────────────────────────────────────

export type Crop = {
  id: string;
  catalog_id: string | null;
  local_name: string;
  scientific_name: string | null;
  family: string;
  duration_days: number;
  kc: Record<string, unknown>;
  risks: Record<string, unknown>;
  review_status: string;
  price_reference?: {
    crop_id?: string;
    price_pen_kg: number;
    unit: string;
    year: number | null;
    place: string | null;
    scope: string;
    source_id: string | null;
    status?: string | null;
    is_local?: boolean;
    editable_assumption?: boolean;
  } | null;
};

export type CatalogPriceReference = {
  crop_id?: string;
  cultivo_id?: string;
  nivel: string;
  departamento: string;
  provincia: string | null;
  distrito: string | null;
  periodo: number;
  precio_chacra: { valor: number; unidad: string };
  fuente_id: string;
  estado: string;
  uso: string;
  tipo_en_fuente: string;
};

// ── Crop history / water / soil ────────────────────────────────────────

export type CropHistoryEntry = {
  id: string;
  crop_id: string | null;
  family: string | null;
  date_start: string | null;
  date_end: string | null;
  notes: string | null;
  source: string;
};

export type WaterEntry = {
  id: string;
  start_at: string;
  end_at: string;
  volume_m3: number | null;
  mm: number | null;
  method: string;
  efficiency: number | null;
  confidence: string;
  notes: string | null;
};

export type SoilEntry = {
  id: string;
  variable: string;
  value: number | null;
  unit: string | null;
  observed_at: string | null;
  method: string;
  source: string | null;
  notes: string | null;
};

// ── Context / indicators / irrigation ──────────────────────────────────

export type Context = {
  parcel: Parcel;
  history: CropHistoryEntry[];
  water: WaterEntry[];
  soil: SoilEntry[];
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

export type IrrigationDay = {
  date: string;
  precip_mm: number | null;
  et0_mm: number | null;
  effective_rain_mm: number | null;
  net_demand_mm: number | null;
  tmax_c: number | null;
  tmin_c: number | null;
};

export type IrrigationWater = {
  available_mm: number | null;
  period_start: string;
  period_end: string;
  method: string;
  efficiency: number | null;
  confidence: string;
};

export type Terrain = {
  elevation_m: number;
  slope_pct: number | null;
  slope_class: string;
  source: string;
  provider: string;
  resolution: string;
  license: string;
  quality: string;
  points: number;
  sampled_at: string;
};

export type Irrigation = {
  parcel_id: string;
  generated_at: string;
  forecast_source: Record<string, unknown>;
  forecast: IrrigationDay[];
  totals: {
    days: number;
    precip_mm: number;
    effective_rain_mm: number;
    et0_mm: number;
    net_demand_mm: number | null;
  };
  water: IrrigationWater | null;
  water_status: string;
  terrain: Terrain | null;
  advice: string[];
  warnings: string[];
  is_simulated: boolean;
};

// ── Comparison / plans ────────────────────────────────────────────────

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
    income_pen?: number | null;
    costs_pen?: number | null;
    production_kg?: number | null;
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
  pending_plans?: Plan[];
  source_snapshots: string[];
  scenario_type: string;
  warnings: string[];
  is_simulated: boolean;
  disclaimer: string;
};

// ── Agent ──────────────────────────────────────────────────────────────

export type AgentAction = {
  action: string;
  payload: Record<string, unknown>;
};

export type AgentToolTrace = {
  tool: string;
  status: string;
  latency_ms: number;
  summary: string;
};

export type AgentNextStep = {
  phase: 'datos' | 'comparar' | 'probar' | 'guardar' | 'listo';
};

export type AgentMessage = {
  thread_id: string;
  status: string;
  answer: string;
  tool_trace: AgentToolTrace[];
  evidence_refs: string[];
  ui_actions: AgentAction[];
  warnings: string[];
  analysis_run_id: string | null;
  next_step: AgentNextStep | null;
};

// ── Saved plans ───────────────────────────────────────────────────────

export type SavedPlanSnapshotPlan = {
  plan_id: string;
  label: string;
  kind: string;
  status: string;
  crop_sequence: string[];
  water: Plan['water'];
  economics: Plan['economics'];
};

export type SavedPlan = {
  id: string;
  parcel_id: string;
  name: string;
  status: string;
  created_at?: string | null;
  rotation_plan_id?: string | null;
  analysis_run_id?: string | null;
  comparison_id?: string | null;
  preferred_plan_id?: string | null;
  fallback_plan_id?: string | null;
  preferred?: SavedPlanSnapshotPlan | null;
  fallback?: SavedPlanSnapshotPlan | null;
  thresholds?: Record<string, unknown>;
  reviewed_at?: string | null;
};

export type SavedPlanReviewAlert = {
  code: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
};

export type SavedPlanReview = {
  saved_plan_id: string;
  changed: boolean;
  checked_at: string;
  alerts: SavedPlanReviewAlert[];
  saved_preferred: SavedPlanSnapshotPlan | null;
  current_preferred: SavedPlanSnapshotPlan | null;
  saved_available_mm: number | null;
  current_available_mm: number | null;
  saved_margin_pen: number | null;
  current_margin_pen: number | null;
};

// ── Bundle ────────────────────────────────────────────────────────────

export type BundleClimateMonth = {
  month: string;
  precip_mm: number | null;
  tmin_c: number | null;
  tmax_c: number | null;
  eto_mm: number | null;
};

export type ParcelBundle = {
  bundle_id: string;
  parcel_id: string;
  created_at: string;
  expires_at: string;
  engine_version: string;
  catalog_version: string;
  parcel: Parcel;
  climate: BundleClimateMonth[];
  climate_source: Record<string, unknown> | null;
  catalog: {
    version: string;
    review_status: string;
    crops: Record<string, unknown>[];
    prices_chacra_2025: CatalogPriceReference[];
  };
  comparison: Comparison;
  assumptions: Record<string, unknown>;
  warnings: string[];
  is_simulated: boolean;
  integrity: { algorithm: string; header: string };
};

export type BundleDownload = {
  bundle: ParcelBundle;
  checksum: string;
  sizeBytes: number;
  downloadedAt: string;
};

// ── Chat ─────────────────────────────────────────────────────────────

export type ChatMessage =
  | { role: 'user'; text: string }
  | { role: 'agent'; data: AgentMessage };
