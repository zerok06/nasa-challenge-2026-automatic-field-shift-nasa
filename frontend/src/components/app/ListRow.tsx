/**
 * ListRow — the scannable row used by Mi parcela, precios, planes guardados
 * and fuentes. Leading illustration/icon, two lines of text, trailing value or
 * chevron. This is the Uber-Eats "store list" shape applied to farm data.
 */
import type { ReactNode } from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { Illustration, type IllustrationName } from '../illustrations/Illustration';

export type RowTone = 'primary' | 'water' | 'earth' | 'warning';

const toneClass: Record<RowTone, { bg: string; text: string }> = {
  primary: { bg: 'bg-accent', text: 'text-primary' },
  water: { bg: 'bg-water/10', text: 'text-water' },
  earth: { bg: 'bg-earth/10', text: 'text-earth' },
  warning: { bg: 'bg-warning/10', text: 'text-warning' },
};

export function ListRow({
  title,
  subtitle,
  illustration,
  icon: Icon,
  tone = 'primary',
  value,
  badge,
  trailing,
  onClick,
  disabled = false,
}: {
  title: ReactNode;
  subtitle?: string;
  illustration?: IllustrationName;
  icon?: LucideIcon;
  tone?: RowTone;
  value?: string;
  badge?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const style = toneClass[tone];
  const interactive = Boolean(onClick);

  const content = (
    <>
      {illustration ? (
        <Illustration name={illustration} size={44} />
      ) : Icon ? (
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${style.bg}`}
        >
          <Icon size={22} className={style.text} aria-hidden="true" />
        </span>
      ) : null}

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-base font-semibold text-foreground">{title}</span>
          {badge}
        </span>
        {subtitle ? (
          <span className="block text-sm leading-5 text-muted-foreground">{subtitle}</span>
        ) : null}
      </span>

      {value ? (
        <span className="shrink-0 text-right text-sm font-semibold text-foreground">{value}</span>
      ) : null}
      {trailing}
      {interactive ? (
        <ChevronRight size={18} className="shrink-0 text-subtle" aria-hidden="true" />
      ) : null}
    </>
  );

  const className = `flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5 text-left ${
    interactive && !disabled ? 'transition hover:bg-primary-50 active:scale-[0.99]' : ''
  } ${disabled ? 'opacity-50' : ''}`;

  if (!interactive) {
    return <div className={className}>{content}</div>;
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {content}
    </button>
  );
}
