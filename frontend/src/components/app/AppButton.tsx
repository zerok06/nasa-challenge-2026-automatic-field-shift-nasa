/**
 * AppButton — port of the native button hierarchy.
 *
 * Only primary and destructive use a solid fill; context tones stay soft so the
 * farmer can always identify the main next step.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';

export type AppButtonTone =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'water'
  | 'earth'
  | 'success'
  | 'warning'
  | 'surface';

const toneClass: Record<AppButtonTone, string> = {
  primary: 'bg-primary text-white shadow-sm hover:bg-primary-700',
  secondary: 'bg-accent text-primary hover:bg-primary-100',
  outline: 'border border-border bg-transparent text-foreground hover:bg-primary-50',
  ghost: 'bg-transparent text-foreground hover:bg-primary-50',
  destructive: 'bg-error text-white shadow-sm hover:opacity-90',
  water: 'bg-water/10 text-water hover:bg-water/15',
  earth: 'bg-earth/10 text-earth hover:bg-earth/15',
  success: 'bg-success/10 text-success hover:bg-success/15',
  warning: 'bg-warning/10 text-warning hover:bg-warning/15',
  surface: 'border border-border bg-white text-primary shadow-sm hover:bg-primary-50',
};

const sizeClass = {
  sm: 'min-h-10 px-3 py-2 text-sm',
  md: 'min-h-12 px-5 py-3 text-sm',
  lg: 'min-h-14 px-5 py-3 text-base',
  icon: 'h-12 w-12 p-0',
} as const;

export type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: AppButtonTone;
  size?: keyof typeof sizeClass;
  loading?: boolean;
  icon?: LucideIcon;
  fullWidth?: boolean;
  children?: ReactNode;
};

export function AppButton({
  tone = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  fullWidth = false,
  className = '',
  children,
  disabled,
  type = 'button',
  ...props
}: AppButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors',
        toneClass[tone],
        sizeClass[size],
        fullWidth ? 'w-full' : '',
        disabled || loading ? 'opacity-50 pointer-events-none' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {loading ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : null}
      {!loading && Icon ? <Icon size={18} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

/** Circular icon-only button (header back/settings, carousel arrows). */
export function AppIconButton({
  icon: Icon,
  label,
  tone = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  label: string;
  tone?: 'primary' | 'muted' | 'water' | 'earth' | 'white';
}) {
  const color = {
    primary: 'text-primary hover:bg-primary-50',
    muted: 'text-muted-foreground hover:bg-primary-50',
    water: 'text-water hover:bg-water/10',
    earth: 'text-earth hover:bg-earth/10',
    white: 'text-white hover:bg-white/15',
  }[tone];

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors ${color} ${className}`}
      {...props}
    >
      <Icon size={22} aria-hidden="true" />
    </button>
  );
}
