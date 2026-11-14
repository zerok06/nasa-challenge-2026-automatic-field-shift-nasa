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

export type AgentAction = {
  action: string;
  payload: Record<string, any>;
};

export type AgentToolTrace = {
  tool: string;
  status: string;
  latency_ms: number;
  summary: string;
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
};

export type SavedPlan = {
  id: string;
  parcel_id: string;
  name: string;
  status: string;
};
