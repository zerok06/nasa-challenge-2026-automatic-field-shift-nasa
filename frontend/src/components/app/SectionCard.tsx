/** SectionCard — port of the native card: title, subtitle, action and cover photo. */
import type { ReactNode } from 'react';

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = '',
  coverImage,
  coverLabel,
  coverAccessibilityLabel,
}: {
  title?: ReactNode;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  coverImage?: string;
  coverLabel?: string;
  coverAccessibilityLabel?: string;
}) {
  if (coverImage) {
    return (
      <section
        className={`overflow-hidden rounded-2xl border border-border bg-card ${className}`}
      >
        <div className="relative h-[152px] w-full">
          <img
            src={coverImage}
            alt={coverAccessibilityLabel ?? ''}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/65 to-black/80" />
          <div className="relative flex h-full flex-col justify-between p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {title ? <h2 className="text-2xl font-bold text-white">{title}</h2> : null}
                {subtitle ? <p className="truncate text-base font-medium text-white">{subtitle}</p> : null}
              </div>
              {action ? <div className="rounded-full bg-white/95">{action}</div> : null}
            </div>
            {coverLabel ? (
              <span className="self-start rounded-full bg-black/35 px-2 py-1 text-xs font-medium text-white">
                {coverLabel}
              </span>
            ) : null}
          </div>
        </div>
        <div className="space-y-3 bg-surface p-4">{children}</div>
      </section>
    );
  }

  return (
    <section className={`space-y-3 rounded-2xl border border-border bg-card p-4 ${className}`}>
      {title || action ? (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {title ? <h2 className="text-lg font-semibold text-foreground">{title}</h2> : null}
            {subtitle ? <p className="text-sm leading-5 text-muted-foreground">{subtitle}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className="space-y-3">{children}</div>
    </section>
  );
}
