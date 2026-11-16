/**
 * NextStepCard — the single next action after the Inicio hero.
 *
 * The farmer should not have to choose between several equal cards: the
 * eyebrow, the numbered badge and one full-width CTA make the order explicit.
 * "Ver todo" is a small secondary link to the shortcuts section, never a
 * second CTA to the same path.
 */
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NEXT_STEP_NUMBER, type NextStep } from '../../lib/nextStep';
import { AppButton } from './AppButton';
import { Badge, type BadgeTone } from './Badge';
import { SectionCard } from './SectionCard';

export function NextStepCard({
  step,
  onAction,
  seeAllHref = '#que-necesitas',
}: {
  step: NextStep;
  onAction: () => void;
  seeAllHref?: string | null;
}) {
  const { t } = useTranslation();
  const whyId = `next-step-why-${step.id}`;
  const badgeTone: BadgeTone =
    step.tone === 'water' ? 'info' : step.tone === 'earth' ? 'neutral' : 'brand';
  const accentClass =
    step.tone === 'water'
      ? 'border-l-4 border-l-water'
      : step.tone === 'earth'
        ? 'border-l-4 border-l-earth'
        : 'border-l-4 border-l-primary';

  return (
    <SectionCard className={accentClass}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            {t('TU SIGUIENTE PASO')}
          </p>
          <h2 className="mt-1 text-xl font-bold leading-7 text-foreground">{t(step.title)}</h2>
        </div>
        <Badge tone={badgeTone}>
          {t('Paso {{number}}', { number: NEXT_STEP_NUMBER[step.id] })}
        </Badge>
      </div>

      <p id={whyId} className="text-base leading-6 text-muted-foreground">
        {t(step.why)}
      </p>

      <AppButton size="lg" fullWidth onClick={onAction} aria-describedby={whyId}>
        {t(step.cta)}
      </AppButton>

      {seeAllHref ? (
        <a
          href={seeAllHref}
          className="mx-auto inline-flex min-h-12 items-center justify-center gap-1 rounded-full px-4 text-sm font-semibold text-primary hover:bg-primary-50"
        >
          {t('Ver todo')}
          <ChevronRight size={16} aria-hidden="true" />
        </a>
      ) : null}
    </SectionCard>
  );
}
