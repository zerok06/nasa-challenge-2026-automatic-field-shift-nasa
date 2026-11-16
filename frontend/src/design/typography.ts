/**
 * Anden typography / layout class presets — port of the native design tokens.
 * Keeping them in one place avoids one-off text sizes across screens.
 */
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
