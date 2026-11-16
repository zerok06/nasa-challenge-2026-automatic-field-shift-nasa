/** Number, money, date and label formatting — port of application/src/lib/format.ts. */
import i18n from '../i18n';

function numberLocale(): string {
  return i18n.language === 'en' ? 'en-US' : 'es-PE';
}

const numberFormatters = new Map<string, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function numberFormatter(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const locale = numberLocale();
  const key = `${locale}:${JSON.stringify(options)}`;
  const cached = numberFormatters.get(key);
  if (cached) return cached;
  const formatter = new Intl.NumberFormat(locale, options);
  numberFormatters.set(key, formatter);
  return formatter;
}

export function formatNumber(
  value: number | null | undefined,
  unit = '',
  digits = 2,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return i18n.t('No disponible');
  }
  const formatted = numberFormatter({
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(Number(value));
  return `${formatted}${unit ? ` ${unit}` : ''}`;
}

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return i18n.t('No calculable');
  }
  const formatted = numberFormatter({
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
  return `S/ ${formatted}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const locale = numberLocale();
  const key = `${locale}:short`;
  let formatter = dateFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
    dateFormatters.set(key, formatter);
  }
  return formatter.format(date);
}

const missingLabels: Record<string, string> = {
  soil_analysis: 'análisis de suelo',
  review_pending: 'revisión agronómica',
  water_available: 'agua disponible',
  water_volume: 'volumen de agua',
  price: 'precio de venta',
  yield: 'rendimiento',
  costs: 'costos de producción',
  dataset_snapshot: 'datos del clima',
  area_ha: 'superficie',
  crop_history: 'cultivos anteriores',
  crop_economics: 'precios y costos de tus cultivos',
};

const cropLabels: Record<string, string> = {
  onion: 'cebolla',
  pumpkin: 'zapallo',
  chili: 'ají',
  potato: 'papa',
  corn: 'maíz',
  haba: 'haba',
  alfalfa: 'alfalfa',
  tomato: 'tomate',
  lettuce: 'lechuga',
  carrot: 'zanahoria',
  oat: 'avena',
  quinoa: 'quinua',
  barley: 'cebada',
  pea: 'arveja',
};

function economicsMissingLabel(value: string): string {
  const [, cropId, field] = value.split('.');
  const crop = i18n.t(cropLabels[cropId] ?? cropId ?? 'cultivo');
  const fieldLabel =
    field === 'price_pen_kg'
      ? 'precio'
      : field === 'yield_kg_ha'
        ? 'rendimiento'
        : field === 'costs_pen'
          ? 'costo'
          : field === 'price_confirmation'
            ? 'confirmación del precio'
            : 'datos';
  return `${fieldLabel} de ${crop}`;
}

export function formatMissing(values: string[] | null | undefined, limit = 3): string {
  if (!values || values.length === 0) return '';
  const labels = values.map((value) => {
    if (value.startsWith('economics.')) return economicsMissingLabel(value);
    return i18n.t(missingLabels[value] ?? value.replaceAll('_', ' '));
  });
  if (labels.length <= limit) return labels.join(', ');
  return `${labels.slice(0, limit).join(', ')} ${i18n.t('y {{count}} más', {
    count: labels.length - limit,
  })}`;
}

/** Crop names come from the catalog; the id only supplies a fallback label. */
export function formatCropName(cropId: string, localName?: string | null): string {
  return localName ?? i18n.t(cropLabels[cropId] ?? cropId);
}

export function formatCropSequence(sequence: string[] | null | undefined): string {
  return (sequence ?? []).map((crop) => formatCropName(crop)).join(' → ');
}

export function formatFeasibility(value: string): string {
  if (value === 'sufficient') return i18n.t('Sí alcanza');
  if (value === 'deficit') return i18n.t('Falta agua');
  if (value === 'unknown') return i18n.t('No se sabe');
  return value;
}

export function formatCompleteness(value: string | null | undefined): string {
  if (value === 'ready') return i18n.t('Completo');
  if (value === 'partial') return i18n.t('Falta completar');
  if (value === 'missing' || value === 'blocked') return i18n.t('Faltan datos');
  if (value === 'unknown') return i18n.t('No se sabe');
  return value ?? i18n.t('Sin datos');
}

/** Parses "1,2" or "1.2" (es-PE farmers write both). */
export function parseEsNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/\s/g, '').replace(',', '.');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
