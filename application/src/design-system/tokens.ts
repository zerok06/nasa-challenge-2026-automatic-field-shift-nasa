export const colors = {
  primary: '#1B5E20',
  primaryDark: '#0D3B12',
  primarySoft: '#E8F0E8',
  earth: '#8D6E63',
  water: '#1565C0',
  background: '#F7F5EF',
  surface: '#FFFFFF',
  text: '#1C1B1F',
  muted: '#5F6368',
  border: '#DAD6CC',
  success: '#2E7D32',
  warning: '#B45309',
  warningHighlight: '#EF6C00',
  error: '#C62828',
  unknown: '#6B7280',
  white: '#FFFFFF',
} as const;

export const darkColors = {
  background: '#0F120E',
  surface: '#171B16',
  text: '#F3F1EA',
  muted: '#A8AFA5',
  border: '#2E352C',
  primary: '#7CC47F',
} as const;

/** 4 px base scale used across the app. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  sheet: 24,
  pill: 999,
} as const;

export const typography = {
  display: 'text-3xl font-bold tracking-tight',
  h1: 'text-2xl font-bold tracking-tight',
  h2: 'text-xl font-semibold',
  h3: 'text-lg font-semibold',
  body: 'text-base leading-6',
  label: 'text-sm font-medium',
  caption: 'text-xs leading-4',
  overline: 'text-[11px] font-semibold uppercase tracking-wider',
} as const;

export const touchTarget = {
  min: 48,
} as const;

export type StatusTone = 'default' | 'secondary' | 'destructive' | 'outline';

export const statusMeta: Record<
  string,
  { label: string; variant: StatusTone; className?: string; textClassName?: string }
> = {
  eligible: { label: 'Elegible', variant: 'default' },
  invalid: { label: 'No viable', variant: 'destructive' },
  needs_review: {
    label: 'Revisar',
    variant: 'outline',
    className: 'border-warning',
    textClassName: 'text-warning',
  },
  draft: { label: 'Borrador', variant: 'secondary' },
  saved: { label: 'Guardado', variant: 'default' },
};

export const feasibilityLabel: Record<string, string> = {
  sufficient: 'Suficiente',
  deficit: 'Déficit',
  unknown: 'Sin datos',
};

export const qualityLabel: Record<string, string> = {
  modeled_reanalysis: 'Reanálisis modelado',
  satellite_estimate: 'Estimación satelital',
  estimated: 'Estimado',
  measured: 'Medido',
};
