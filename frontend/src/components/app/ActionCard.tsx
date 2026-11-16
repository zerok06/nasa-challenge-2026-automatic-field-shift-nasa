/** ActionCard / ToolTile — the two tappable card shapes from the native app. */
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { Illustration, type IllustrationName } from '../illustrations/Illustration';

export type ActionTone = 'primary' | 'water' | 'earth' | 'warning';

const toneStyles: Record<ActionTone, { bg: string; text: string }> = {
  primary: { bg: 'bg-accent', text: 'text-primary' },
  water: { bg: 'bg-water/10', text: 'text-water' },
  earth: { bg: 'bg-earth/10', text: 'text-earth' },
  warning: { bg: 'bg-warning/10', text: 'text-warning' },
};

export function ActionCard({
  icon: Icon,
  illustration,
  title,
  subtitle,
  tone = 'primary',
  onClick,
  badge,
  disabled = false,
}: {
  icon?: LucideIcon;
  illustration?: IllustrationName;
  title: string;
  subtitle?: string;
  tone?: ActionTone;
  onClick: () => void;
  badge?: string;
  disabled?: boolean;
}) {
  const style = toneStyles[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={subtitle ? `${title}. ${subtitle}` : title}
      className={`flex min-h-[88px] w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition active:scale-[0.985] ${
        disabled ? 'opacity-50' : 'hover:bg-primary-50'
      }`}
    >
      {illustration ? (
        <Illustration name={illustration} size={48} />
      ) : Icon ? (
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${style.bg}`}>
          <Icon size={24} className={style.text} aria-hidden="true" />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-base font-semibold text-foreground">{title}</span>
          {badge ? (
            <span className="rounded-full bg-primary px-2 py-0.5 text-sm font-bold text-white">
              {badge}
            </span>
          ) : null}
        </span>
        {subtitle ? (
          <span className="block text-sm leading-5 text-muted-foreground">{subtitle}</span>
        ) : null}
      </span>
      <ChevronRight size={20} className="shrink-0 text-subtle" aria-hidden="true" />
    </button>
  );
}

export function ToolTile({
  title,
  subtitle,
  illustration,
  onClick,
  badge,
}: {
  title: string;
  subtitle?: string;
  illustration: IllustrationName;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={subtitle ? `${title}. ${subtitle}` : title}
      className="flex min-h-[132px] flex-1 basis-[47%] flex-col gap-2 rounded-2xl border border-border bg-card p-3 text-left transition hover:bg-primary-50 active:scale-[0.985]"
    >
      <Illustration name={illustration} size={44} />
      <span className="block space-y-0.5">
        <span className="block text-base font-semibold text-foreground">{title}</span>
        {subtitle ? (
          <span className="block text-sm leading-5 text-muted-foreground">{subtitle}</span>
        ) : null}
      </span>
      {badge ? (
        <span className="self-start rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-primary">
          {badge}
        </span>
      ) : null}
    </button>
  );
}
