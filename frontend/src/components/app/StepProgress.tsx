/**
 * StepProgress — one-thing-at-a-time flow: counter, progress bar, the current
 * step content and the previous/next controls (spec 035 guided prices).
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AppButton } from './AppButton';

export function StepProgress({
  current,
  total,
  label,
  onPrevious,
  onNext,
  previousDisabled = false,
  children,
}: {
  /** 1-based position of the current step. */
  current: number;
  total: number;
  /** Short name of the current step (for example, the crop). */
  label?: string;
  onPrevious: () => void;
  onNext: () => void;
  previousDisabled?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const safeTotal = Math.max(total, 1);
  const safeCurrent = Math.min(Math.max(current, 1), safeTotal);
  const counter = t('Paso {{current}} de {{total}}', {
    current: safeCurrent,
    total: safeTotal,
  });
  const percent = Math.round((safeCurrent / safeTotal) * 100);
  const isLast = safeCurrent >= safeTotal;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground" aria-live="polite">
          {counter}
        </p>
        {label ? (
          <p className="truncate text-sm text-muted-foreground">{label}</p>
        ) : null}
      </div>
      <div
        role="progressbar"
        aria-label={t('Avance de precios y costos')}
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-valuenow={safeCurrent}
        aria-valuetext={counter}
        className="h-2 w-full overflow-hidden rounded-full bg-primary-100"
      >
        <div
          className="h-2 rounded-full bg-primary transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>

      {children}

      <div className="flex gap-2">
        <AppButton
          tone="outline"
          icon={ChevronLeft}
          fullWidth
          onClick={onPrevious}
          disabled={previousDisabled || safeCurrent <= 1}
        >
          {t('Anterior')}
        </AppButton>
        <AppButton
          tone="secondary"
          fullWidth
          onClick={onNext}
          disabled={isLast}
        >
          {t('Siguiente')}
          <ChevronRight size={18} aria-hidden="true" />
        </AppButton>
      </div>
    </div>
  );
}
