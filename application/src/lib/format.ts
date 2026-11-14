export function formatNumber(
  value: number | null | undefined,
  unit = '',
  digits = 2,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'No disponible';
  }
  return `${Number(value).toFixed(digits)}${unit ? ` ${unit}` : ''}`;
}

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'No calculable';
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
  return new Intl.DateTimeFormat('es-PE', {
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
  return values.map((value) => missingLabels[value] ?? value.replaceAll('_', ' ')).join(', ');
}

export function formatCropSequence(sequence: string[]): string {
  return sequence.join(' → ');
}

export function formatFeasibility(value: string): string {
  if (value === 'sufficient') return 'Suficiente';
  if (value === 'deficit') return 'Déficit';
  if (value === 'unknown') return 'Sin datos';
  return value;
}

export function formatSoilStatus(value: string): string {
  if (value === 'not_measured') return 'Por verificar';
  if (value === 'declared') return 'Declarado';
  if (value === 'measured') return 'Medido';
  return value;
}
