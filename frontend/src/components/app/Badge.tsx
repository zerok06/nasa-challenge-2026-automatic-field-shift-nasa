/**
 * Badge — one badge for every status in the app.
 *
 * Before this file there were three different pill implementations (status,
 * price badge, online dot). Uber-Eats-style scanning needs a single visual
 * language: same height, same radius, same weight.
 */
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export type BadgeTone = 'brand' | 'soft' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const toneClass: Record<BadgeTone, string> = {
  brand: 'bg-primary text-white',
  soft: 'bg-accent text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-error/10 text-error',
  info: 'bg-water/10 text-water',
  neutral: 'bg-primary-50 text-muted-foreground',
};

export function Badge({
  children,
  tone = 'neutral',
  icon: Icon,
  className = '',
}: {
  children: ReactNode;
  tone?: BadgeTone;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold leading-5 ${toneClass[tone]} ${className}`}
    >
      {Icon ? <Icon size={12} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
