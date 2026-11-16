/**
 * PlanTabs — the three plans as a segmented control.
 *
 * This replaces the image-first carousel. The farmer picks Actual /
 * Alternativa B / Alternativa C at the top and only the selected plan's detail
 * is rendered underneath, so there is no horizontal scroll to miss a plan.
 *
 * Implements the WAI-ARIA tabs pattern: `tablist` + `tab` with `aria-selected`,
 * `aria-controls`, roving tabindex and arrow/Home/End keys. Targets are 48 px.
 *
 * The file keeps its historical name (`PlanCarousel.tsx`) so no other import
 * changes; the exported component is `PlanTabs`.
 */
import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { Plan } from '../../lib/types';

/** Stable ids shared with the tab panel rendered by Comparar. */
export function planTabId(index: number): string {
  return `plan-tab-${index}`;
}

export function planPanelId(index: number): string {
  return `plan-panel-${index}`;
}

/**
 * Plan name used by both the tab and the detail card. Spanish strings are the
 * i18n keys, so the backend label ("Alternativa B") translates as-is.
 */
export function planTabLabelKey(plan: Plan, index: number): string {
  if (plan.kind === 'example') return 'Ejemplo';
  if (plan.kind === 'existing') return 'Actual';
  if (plan.label) return plan.label;
  return index === 1 ? 'Alternativa B' : 'Alternativa C';
}

export function PlanTabs({
  plans,
  activePlanId,
  onSelect,
}: {
  plans: Plan[];
  activePlanId: string | null;
  onSelect: (planId: string) => void;
}) {
  const { t } = useTranslation();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = plans.findIndex((plan) => plan.plan_id === activePlanId);
  const selectedIndex = activeIndex >= 0 ? activeIndex : 0;

  const focusTab = (index: number) => {
    const plan = plans[index];
    if (!plan) return;
    onSelect(plan.plan_id);
    window.requestAnimationFrame(() => tabRefs.current[index]?.focus());
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = plans.length - 1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      focusTab(index === last ? 0 : index + 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusTab(index === 0 ? last : index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusTab(last);
    }
  };

  return (
    <section className="space-y-2" aria-labelledby="planes-titulo">
      <h2 id="planes-titulo" className="sr-only">
        {t('Planes para tu parcela')}
      </h2>
      <div role="tablist" aria-labelledby="planes-titulo" className="flex gap-2">
        {plans.map((plan, index) => {
          const selected = index === selectedIndex;
          return (
            <button
              key={plan.plan_id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              id={planTabId(index)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={selected ? planPanelId(index) : undefined}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(plan.plan_id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`flex min-h-12 flex-1 items-center justify-center rounded-xl border px-2 py-2 text-center text-sm font-semibold leading-5 transition-colors ${
                selected
                  ? 'border-primary bg-accent text-primary'
                  : 'border-border bg-card text-foreground hover:bg-primary-50'
              }`}
            >
              {t(planTabLabelKey(plan, index))}
            </button>
          );
        })}
      </div>
    </section>
  );
}
