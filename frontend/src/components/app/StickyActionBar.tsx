/**
 * StickyActionBar — one primary action (and at most one secondary) that stays
 * reachable without covering the content.
 *
 * It is `sticky` in the page flow (not `fixed`): it reserves its own space and
 * never intercepts taps on buttons behind it. Place it directly after the card
 * it belongs to.
 */
import type { ReactNode } from 'react';

export function StickyActionBar({
  primary,
  secondary,
  hint,
  className = '',
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`sticky bottom-[calc(68px+env(safe-area-inset-bottom))] z-20 space-y-2 rounded-t-2xl border border-border bg-card/95 px-3 pb-3 pt-3 shadow-sticky backdrop-blur ${className}`}
    >
      {primary}
      {secondary}
      {hint ? (
        <p className="text-center text-sm leading-5 text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
