/** HeroCard — the deep-green headline card used on Inicio and Comparar. */
import type { ReactNode } from 'react';
import { Illustration, type IllustrationName } from '../illustrations/Illustration';

export function HeroCard({
  eyebrow,
  title,
  description,
  illustration,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  illustration?: IllustrationName;
  children?: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-3xl bg-primary p-4 text-white">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          {eyebrow ? (
            <p className="text-sm font-semibold uppercase tracking-wider text-white/90">{eyebrow}</p>
          ) : null}
          <h1 className="text-2xl font-bold leading-8 tracking-tight">{title}</h1>
          {description ? <p className="text-base leading-6 text-white/95">{description}</p> : null}
        </div>
        {illustration ? <Illustration name={illustration} size={76} /> : null}
      </div>
      {children ? <div className="space-y-3">{children}</div> : null}
    </section>
  );
}
