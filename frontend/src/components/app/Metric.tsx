/** Metric rows and tiles — port of application/src/components/app/Metric.tsx. */
import type { ReactNode } from 'react';

export function MetricRow({
  label,
  value,
  valueClassName = '',
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="flex-1 text-sm leading-5 text-muted-foreground">{label}</span>
      <span
        className={`max-w-[58%] text-right text-base font-semibold leading-5 text-foreground ${valueClassName}`}
      >
        {value}
      </span>
    </div>
  );
}

const toneClass = {
  neutral: 'bg-primary-50',
  water: 'bg-water/10',
  earth: 'bg-earth/10',
  primary: 'bg-accent',
  warning: 'bg-warning/10',
} as const;

export function MetricTile({
  label,
  value,
  icon,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  tone?: keyof typeof toneClass;
}) {
  return (
    <div className={`min-w-[30%] flex-1 space-y-1 rounded-2xl p-3 ${toneClass[tone]}`}>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="flex-1 text-sm leading-5 text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}
