import i18n from '@/i18n';

export function formatNumber(
  value: number | null | undefined,
  unit = '',
  digits = 2,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return i18n.t('No disponible');
  }
  return `${Number(value).toFixed(digits)}${unit ? ` ${unit}` : ''}`;
}

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return i18n.t('No calculable');
  }
  return `S/ ${Number(value).toFixed(2)}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${Math.round(Number(value) * 100)}%`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-US' : 'es-PE', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

const missingLabels: Record<string, string> = {
  soil_analysis: 'análisis de suelo',
  review_pending: 'revisión agronómica',
  water_available: 'disponibilidad de agua',
  water_volume: 'volumen de agua',
  price: 'precio de venta',
  yield: 'rendimiento',
  costs: 'costos de producción',
  dataset_snapshot: 'snapshot NASA',
};

export function formatMissing(values: string[] | null | undefined): string {
  if (!values || values.length === 0) return '';
  return values
    .map((value) => i18n.t(missingLabels[value] ?? value.replaceAll('_', ' ')))
    .join(', ');
}

const cropLabels: Record<string, string> = {
  onion: 'cebolla',
  pumpkin: 'zapallo',
  chili: 'ají',
};

export function formatCropSequence(sequence: string[]): string {
  return sequence.map((crop) => i18n.t(cropLabels[crop] ?? crop)).join(' → ');
}

export function formatFeasibility(value: string): string {
  if (value === 'sufficient') return i18n.t('Suficiente');
  if (value === 'deficit') return i18n.t('Déficit');
  if (value === 'unknown') return i18n.t('Sin datos');
  return value;
}

export function formatSoilStatus(value: string): string {
  if (value === 'not_measured') return i18n.t('Por verificar');
  if (value === 'declared') return i18n.t('Declarado');
  if (value === 'measured') return i18n.t('Medido');
  return value;
}

export function formatCompleteness(value: string | null | undefined): string {
  if (value === 'ready') return i18n.t('Listo');
  if (value === 'partial') return i18n.t('Parcial');
  if (value === 'missing') return i18n.t('Pendiente');
  return value ?? i18n.t('Sin datos');
}
