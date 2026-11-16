/**
 * MediaCard — image-first card. The cover photo carries the context (campaign,
 * saved plan, parcel) and the content sits on a white sheet underneath.
 */
import type { ReactNode } from 'react';
import { Badge, type BadgeTone } from './Badge';

export function MediaCard({
  image,
  imageAlt,
  eyebrow,
  title,
  subtitle,
  badges,
  children,
  footer,
  onClick,
}: {
  image: string;
  imageAlt: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  badges?: { label: string; tone?: BadgeTone }[];
  children?: ReactNode;
  footer?: ReactNode;
  onClick?: () => void;
}) {
  const body = (
    <>
      <div className="relative h-36 w-full overflow-hidden rounded-t-3xl bg-primary-100">
        <img src={image} alt={imageAlt} loading="lazy" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-wider text-white/90">
                {eyebrow}
              </p>
            ) : null}
            <h3 className="truncate text-xl font-bold text-white">{title}</h3>
            {subtitle ? <p className="truncate text-sm text-white/90">{subtitle}</p> : null}
          </div>
          {badges?.length ? (
            <div className="flex shrink-0 flex-wrap justify-end gap-1">
              {badges.map((badge) => (
                <Badge key={badge.label} tone={badge.tone ?? 'brand'}>
                  {badge.label}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {children ? <div className="space-y-3 px-4 py-3">{children}</div> : null}
      {footer ? <div className="border-t border-border px-4 py-3">{footer}</div> : null}
    </>
  );

  if (!onClick) {
    return (
      <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        {body}
      </article>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${title}${subtitle ? `. ${subtitle}` : ''}`}
      className="block w-full overflow-hidden rounded-3xl border border-border bg-card text-left shadow-sm transition hover:shadow-md active:scale-[0.995]"
    >
      {body}
    </button>
  );
}
