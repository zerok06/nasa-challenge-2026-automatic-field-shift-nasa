/**
 * TypingDots — "Anden is writing" in the same shape as an agent message.
 *
 * The dots are decorative; the screen-reader text announces the state once.
 * The global reduced-motion rule freezes the animation but keeps the dots, so
 * the indicator still reads as "in progress" without movement.
 */
import { useTranslation } from 'react-i18next';

const DELAYS = [0, 150, 300] as const;

export function TypingDots() {
  const { t } = useTranslation();

  return (
    <div className="flex items-start gap-2" role="status">
      <img
        src="/img/anden-icon.png"
        alt=""
        aria-hidden="true"
        width={32}
        height={32}
        className="mt-1 h-8 w-8 shrink-0 rounded-full border border-border bg-white object-cover"
      />
      <div className="inline-flex items-center gap-1 rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-3.5 shadow-sm">
        <span className="sr-only">{t('Anden está escribiendo…')}</span>
        {DELAYS.map((delay) => (
          <span
            key={delay}
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-primary/60 motion-safe:animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
