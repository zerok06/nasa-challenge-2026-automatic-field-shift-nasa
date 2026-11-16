export const WATER_METHOD_VERSION = 'water-v0.1';

export function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function raMj(latDeg: number, dayOfYear: number): number {
  const lat = (latDeg * Math.PI) / 180;
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * dayOfYear) / 365);
  const decl = 0.409 * Math.sin((2 * Math.PI * dayOfYear) / 365 - 1.39);
  const x = Math.max(-1, Math.min(1, -Math.tan(lat) * Math.tan(decl)));
  const ws = Math.acos(x);
  const ra =
    ((24 * 60) / Math.PI) *
    0.082 *
    dr *
    (ws * Math.sin(lat) * Math.sin(decl) +
      Math.cos(lat) * Math.cos(decl) * Math.sin(ws));
  return Math.max(0, ra);
}

export function dayOfYear(isoDate: string): number {
  const date = new Date(`${isoDate}T00:00:00Z`);
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  return Math.floor((date.getTime() - start) / 86_400_000);
}

export function etoHargreaves(
  tmaxC: number,
  tminC: number,
  lat: number,
  isoDate: string,
): number {
  const tmean = (tmaxC + tminC) / 2;
  const raMm = raMj(lat, dayOfYear(isoDate)) * 0.408;
  const eto = 0.0023 * (tmean + 17.8) * Math.sqrt(Math.max(0, tmaxC - tminC)) * raMm;
  return Math.max(0, round(eto, 3));
}

export function effectiveRain(precipMm: number): number {
  const p = Math.max(0, precipMm);
  const pe = p <= 250 ? (p * (125 - 0.2 * p)) / 125 : 125 + 0.1 * p;
  return round(Math.min(p, Math.max(0, pe)), 3);
}

export type CropStage = { days: number; kc: number | null };

export function etcFromStages(
  stages: CropStage[],
  etoMmDay: number | number[],
): number | null {
  if (stages.length === 0) return null;
  let total = 0;
  let dayIndex = 0;
  for (const stage of stages) {
    const days = Number(stage.days);
    if (stage.kc === null || days <= 0) return null;
    for (let index = 0; index < days; index += 1) {
      let eto: number;
      if (Array.isArray(etoMmDay)) {
        if (etoMmDay.length === 0) return null;
        eto = etoMmDay[Math.min(dayIndex, etoMmDay.length - 1)];
      } else {
        eto = etoMmDay;
      }
      total += stage.kc * eto;
      dayIndex += 1;
    }
  }
  return round(total, 3);
}

export function availableMm(
  areaHa: number | null,
  volumeM3: number | null,
  mm: number | null,
): number | null {
  if (mm !== null) return round(mm, 3);
  if (areaHa && volumeM3 !== null && areaHa > 0) {
    return round(volumeM3 / (areaHa * 10), 3);
  }
  return null;
}

export type WaterResult = {
  net_irrigation_mm: number | null;
  gross_irrigation_mm: number | null;
  deficit_mm: number | null;
  available_mm: number | null;
  feasibility: 'sufficient' | 'deficit' | 'unknown';
  missing_inputs: string[];
  assumptions: string[];
  method_version: string;
};

export function waterBalance(
  etcMm: number | null,
  rainEffectiveMm: number | null,
  available: number | null,
  efficiency: number | null,
  areaHa: number | null,
  volumeM3: number | null,
): WaterResult {
  const missing: string[] = [];
  const assumptions: string[] = [];
  if (etcMm === null) missing.push('etc_mm');
  if (rainEffectiveMm === null) missing.push('rain_effective_mm');
  let availableMmValue = available;
  if (availableMmValue === null) {
    availableMmValue = availableMm(areaHa, volumeM3, null);
  }
  if (availableMmValue === null) missing.push('water_available');
  let efficiencyValue = efficiency;
  if (efficiencyValue === null) {
    efficiencyValue = 0.7;
    assumptions.push('Eficiencia de riego 0.7 asumida; confirmar con el agricultor.');
  }
  if (efficiencyValue <= 0 || efficiencyValue > 1) {
    efficiencyValue = 0.7;
    assumptions.push('Eficiencia fuera de rango; se usó 0.7.');
  }

  if (etcMm === null || rainEffectiveMm === null) {
    return {
      net_irrigation_mm: null,
      gross_irrigation_mm: null,
      deficit_mm: null,
      available_mm: availableMmValue,
      feasibility: 'unknown',
      missing_inputs: [...new Set(missing)].sort(),
      assumptions,
      method_version: WATER_METHOD_VERSION,
    };
  }

  const net = Math.max(0, etcMm - rainEffectiveMm);
  const gross = net / efficiencyValue;
  const deficit = availableMmValue !== null ? Math.max(0, gross - availableMmValue) : null;
  const feasibility: WaterResult['feasibility'] =
    availableMmValue === null ? 'unknown' : deficit !== null && deficit <= 0 ? 'sufficient' : 'deficit';

  return {
    net_irrigation_mm: round(net, 3),
    gross_irrigation_mm: round(gross, 3),
    deficit_mm: deficit !== null ? round(deficit, 3) : null,
    available_mm: availableMmValue,
    feasibility,
    missing_inputs: [...new Set(missing)].sort(),
    assumptions,
    method_version: WATER_METHOD_VERSION,
  };
}
