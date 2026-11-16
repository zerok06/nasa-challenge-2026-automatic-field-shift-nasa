/**
 * Anden design tokens.
 * Light is the primary field mode: warm white canvas, deep green brand,
 * and functional water/earth/warning accents.
 */
export const colors = {
  primary: '#1B5E20',
  primaryDark: '#123F16',
  primarySoft: '#F1F8F2',
  primary50: '#F1F8F2',
  primary100: '#DFF0E2',
  primary200: '#BFE1C5',
  primary300: '#94CCA0',
  primary400: '#63B176',
  primary500: '#3C9453',
  primary600: '#2A7A3E',
  primary700: '#1F662F',
  primary800: '#1B5E20',
  primary900: '#123F16',
  earth: '#8D6E63',
  water: '#6D4C41',
  background: '#FAF7F0',
  surface: '#FFFFFF',
  text: '#1E231E',
  muted: '#5F6B60',
  subtle: '#8A968C',
  border: '#E3DDD1',
  success: '#2E7D32',
  warning: '#7A3B2E',
  warningHighlight: '#8D6E63',
  error: '#6E2F24',
  unknown: '#6B6F66',
  white: '#FFFFFF',
} as const;

export const darkColors = {
  background: '#0B120C',
  surface: '#121A13',
  elevated: '#1A241B',
  text: '#F3F7F3',
  muted: '#A8B5AA',
  border: '#2B382D',
  primary: '#7CC47F',
  primarySoft: '#1F2E21',
  water: '#C4A79C',
  earth: '#C4A79C',
  warning: '#E0B4A4',
  error: '#F0B8A8',
} as const;

export const chartColors = {
  primary: '#1B5E20',
  secondary: '#3C9453',
  tertiary: '#63B176',
  water: '#6D4C41',
  earth: '#8D6E63',
  warning: '#7A3B2E',
} as const;

export const darkChartColors: Record<keyof typeof chartColors, string> = {
  primary: '#7CC47F',
  secondary: '#63B176',
  tertiary: '#94CCA0',
  water: '#C4A79C',
  earth: '#C4A79C',
  warning: '#E0B4A4',
};

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
  overline: 'text-sm font-semibold uppercase tracking-wider',
} as const;

export const touchTarget = {
  min: 48,
} as const;

export type StatusTone = 'default' | 'secondary' | 'destructive' | 'outline';

export const statusMeta: Record<
  string,
  { label: string; variant: StatusTone; className?: string; textClassName?: string }
> = {
  eligible: { label: 'Se puede', variant: 'default' },
  invalid: { label: 'No conviene', variant: 'destructive' },
  needs_review: {
    label: 'Falta revisar',
    variant: 'outline',
    className: 'border-warning',
    textClassName: 'text-warning',
  },
  draft: { label: 'Borrador', variant: 'secondary' },
  saved: { label: 'Guardado', variant: 'default' },
};

export const feasibilityLabel: Record<string, string> = {
  sufficient: 'Sí alcanza',
  deficit: 'Falta agua',
  unknown: 'No se sabe',
};

export const qualityLabel: Record<string, string> = {
  modeled_reanalysis: 'Estimado por NASA',
  satellite_estimate: 'Estimación satelital',
  estimated: 'Estimado',
  measured: 'Medido',
};
