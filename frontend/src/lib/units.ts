/**
 * Local units — one pure place for the conversions a farmer actually uses.
 *
 * The API stores canonical values only: kg/ha, S/ per kg, m³ and mm. Farmers
 * think in arrobas, sacos, turnos and litres per second, so every screen
 * converts before saving instead of persisting a local unit. Nothing here
 * rounds the canonical value: rounding is only for display.
 */

/** A Moquegua arroba is 11.5 kg (not the Spanish 11.502 kg). */
export const ARROBA_KG = 11.5;

/** Local sacks are 50 kg by default; 100 kg is the other common size. */
export const DEFAULT_SACO_KG = 50;
export const SACO_KG_OPTIONS = [50, 100] as const;

export type YieldUnit = 'kg_ha' | 'arrobas_ha' | 'sacos_ha';
export type PriceUnit = 'pen_kg' | 'pen_arroba' | 'pen_saco';
export type WaterMode = 'turnos' | 'horas' | 'recibo' | 'mm';
export type WaterMethod = 'turn' | 'estimate' | 'meter';
export type WaterTurnBasis = 'm3' | 'flow';

/** Parses "1,5", "1.5" and " 1 200 " — the same rule as the rest of the app. */
export function parseDecimal(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/\s/g, '').replace(',', '.');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function roundNumber(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Sack size in kg. Empty means the local default (50 kg); an explicit invalid
 * size returns null so we never convert with a guessed weight.
 */
export function sacoKgValue(raw: string | null | undefined): number | null {
  if (!raw || !raw.trim()) return DEFAULT_SACO_KG;
  const value = parseDecimal(raw);
  return value !== null && value > 0 ? value : null;
}

/** kg/ha from the farmer's unit. Null when the number or the sack is invalid. */
export function kgHaFrom(
  raw: string,
  unit: YieldUnit,
  sacoKgRaw: string,
): number | null {
  const value = parseDecimal(raw);
  if (value === null) return null;
  if (unit === 'arrobas_ha') return value * ARROBA_KG;
  if (unit === 'sacos_ha') {
    const sack = sacoKgValue(sacoKgRaw);
    if (sack === null) return null;
    return value * sack;
  }
  return value;
}

/** S/ per kg from the farmer's unit. Null when the number or the sack is invalid. */
export function penKgFrom(
  raw: string,
  unit: PriceUnit,
  sacoKgRaw: string,
): number | null {
  const value = parseDecimal(raw);
  if (value === null) return null;
  if (unit === 'pen_arroba') return value / ARROBA_KG;
  if (unit === 'pen_saco') {
    const sack = sacoKgValue(sacoKgRaw);
    if (sack === null) return null;
    return value / sack;
  }
  return value;
}

function validArea(areaHa: number | null | undefined): number | null {
  if (areaHa === null || areaHa === undefined) return null;
  if (!Number.isFinite(areaHa) || areaHa <= 0) return null;
  return areaHa;
}

/** mm = m³ / (ha × 10). Without area we keep mm = null; we never guess it. */
export function mmFromM3(
  m3: number,
  areaHa: number | null | undefined,
): number | null {
  const area = validArea(areaHa);
  if (area === null) return null;
  return m3 / (area * 10);
}

/** m³ = mm × ha × 10. Without area we cannot pass mm to m³. */
export function m3FromMm(
  mm: number,
  areaHa: number | null | undefined,
): number | null {
  const area = validArea(areaHa);
  if (area === null) return null;
  return mm * area * 10;
}

/** 1 L/s running for one hour = 3.6 m³. */
export function m3FromFlowHours(flowLs: number, hours: number): number {
  return flowLs * hours * 3.6;
}

/** m³/week × weeks: horas/semana × L/s × 3.6 × semanas. */
export function m3FromWeeklyHours(
  hoursPerWeek: number,
  flowLs: number,
  weeks: number,
): number {
  return m3FromFlowHours(flowLs, hoursPerWeek) * weeks;
}

/** m³ = turnos × m³/turno. */
export function m3FromTurns(turns: number, m3PerTurn: number): number {
  return turns * m3PerTurn;
}

/** m³ = turnos × L/s × horas/turno × 3.6. */
export function m3FromTurnFlow(
  turns: number,
  flowLs: number,
  hoursPerTurn: number,
): number {
  return turns * m3FromFlowHours(flowLs, hoursPerTurn);
}

export function waterMethodFor(mode: WaterMode): WaterMethod {
  if (mode === 'turnos') return 'turn';
  if (mode === 'recibo') return 'meter';
  return 'estimate';
}

export type WaterInputs = {
  mode: WaterMode;
  /** turnos */
  turns: string;
  m3PerTurn: string;
  turnBasis: WaterTurnBasis;
  /** horas */
  flowLs: string;
  hoursPerTurn: string;
  hoursPerWeek: string;
  weeks: string;
  /** recibo o medidor */
  meterM3: string;
  /** mm directos */
  mm: string;
};

export function emptyWaterInputs(): WaterInputs {
  return {
    mode: 'turnos',
    turns: '',
    m3PerTurn: '',
    turnBasis: 'm3',
    flowLs: '',
    hoursPerTurn: '',
    hoursPerWeek: '',
    weeks: '',
    meterM3: '',
    mm: '',
  };
}

export type WaterEstimate = {
  mode: WaterMode;
  m3: number | null;
  mm: number | null;
  method: WaterMethod;
  /** Neutral note stored with the entry (code/DB English, no UI copy). */
  note: string;
};

/**
 * Applies the formula for the selected mode. Returns null when a required
 * number is missing or not usable, so the UI can disable "save" instead of
 * sending an invented zero.
 *
 * - turnos:  turnos × m³/turno
 *            or turnos × L/s × horas/turno × 3.6
 * - horas:   horas/semana × L/s × 3.6 × semanas
 * - recibo:  m³ from the bill/meter
 * - mm:      mm directly; m³ only when the area is known
 */
export function estimateWater(
  inputs: WaterInputs,
  areaHa: number | null | undefined,
): WaterEstimate | null {
  if (inputs.mode === 'mm') {
    const mm = parseDecimal(inputs.mm);
    if (mm === null || mm < 0) return null;
    return {
      mode: 'mm',
      mm,
      m3: m3FromMm(mm, areaHa),
      method: 'estimate',
      note: `mode=mm; mm=${roundNumber(mm, 2)}`,
    };
  }

  let m3: number;
  let note: string;

  if (inputs.mode === 'turnos') {
    const turns = parseDecimal(inputs.turns);
    if (turns === null || turns <= 0) return null;
    if (inputs.turnBasis === 'flow') {
      const flow = parseDecimal(inputs.flowLs);
      const hours = parseDecimal(inputs.hoursPerTurn);
      if (flow === null || flow <= 0 || hours === null || hours <= 0) return null;
      m3 = m3FromTurnFlow(turns, flow, hours);
      note = `mode=turnos; turns=${turns}; flow_l_s=${flow}; hours_per_turn=${hours}`;
    } else {
      const perTurn = parseDecimal(inputs.m3PerTurn);
      if (perTurn === null || perTurn <= 0) return null;
      m3 = m3FromTurns(turns, perTurn);
      note = `mode=turnos; turns=${turns}; m3_per_turn=${perTurn}`;
    }
  } else if (inputs.mode === 'horas') {
    const hoursPerWeek = parseDecimal(inputs.hoursPerWeek);
    const flow = parseDecimal(inputs.flowLs);
    const weeks = parseDecimal(inputs.weeks);
    if (
      hoursPerWeek === null ||
      hoursPerWeek <= 0 ||
      flow === null ||
      flow <= 0 ||
      weeks === null ||
      weeks <= 0
    ) {
      return null;
    }
    m3 = m3FromWeeklyHours(hoursPerWeek, flow, weeks);
    note = `mode=horas; hours_per_week=${hoursPerWeek}; flow_l_s=${flow}; weeks=${weeks}`;
  } else {
    const meter = parseDecimal(inputs.meterM3);
    if (meter === null || meter <= 0) return null;
    m3 = meter;
    note = `mode=recibo; m3=${meter}`;
  }

  const mm = mmFromM3(m3, areaHa);
  return {
    mode: inputs.mode,
    m3,
    mm,
    method: waterMethodFor(inputs.mode),
    note: `${note}; total_m3=${roundNumber(m3, 2)}; mm=${mm === null ? 'null' : roundNumber(mm, 2)}`,
  };
}
