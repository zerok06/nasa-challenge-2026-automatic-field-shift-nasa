/** StatusBadge + AppAlert + Disclosure — native parity for small feedback pieces. */
import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, Info } from 'lucide-react';
import { statusMeta } from '../../design/tokens';

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const meta = statusMeta[status] ?? { label: status, variant: 'secondary' as const };
  const variantClass = {
    default: 'bg-primary text-white',
    secondary: 'bg-primary-100 text-primary-800',
    destructive: 'bg-error text-white',
    outline: 'border border-warning text-warning',
  }[meta.variant];

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${variantClass} ${
        meta.className ?? ''
      } ${meta.textClassName ?? ''}`}
    >
      {label ?? meta.label}
    </span>
  );
}

export type AlertTone = 'warning' | 'error' | 'success' | 'info' | 'neutral';

const alertTone: Record<AlertTone, { box: string; text: string; Icon?: typeof Info }> = {
  warning: { box: 'border-warning bg-warning/10', text: 'text-warning', Icon: AlertTriangle },
  error: { box: 'border-error bg-error/10', text: 'text-error', Icon: AlertCircle },
  success: { box: 'border-success bg-success/10', text: 'text-success', Icon: CheckCircle2 },
  info: { box: 'border-water bg-water/10', text: 'text-water', Icon: Info },
  neutral: { box: 'border-border bg-card', text: 'text-foreground' },
};

export function AppAlert({ tone = 'neutral', children }: { tone?: AlertTone; children: ReactNode }) {
  const { box, text, Icon } = alertTone[tone];
  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex items-start gap-2 rounded-xl border p-3 ${box}`}
    >
      {Icon ? <Icon size={18} className={`mt-0.5 shrink-0 ${text}`} aria-hidden="true" /> : null}
      <p className={`text-sm leading-5 ${text}`}>{children}</p>
    </div>
  );
}

export function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl border border-border bg-card">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-semibold text-foreground">
        {title}
        <ChevronDown
          size={18}
          className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="space-y-2 border-t border-border p-3">{children}</div>
    </details>
  );
}
