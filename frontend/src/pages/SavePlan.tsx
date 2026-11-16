/**
 * Guardar plan — choose the preferred plan (and a fallback), name the decision
 * and save it. Mirrors the native plan-save flow: the farmer always confirms.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AppButton } from '../components/app/AppButton';
import { AppHeader } from '../components/app/AppHeader';
import { SectionCard } from '../components/app/SectionCard';
import { AppAlert } from '../components/app/Feedback';
import { FeedbackCard } from '../components/app/FeedbackCard';
import { FormField } from '../components/app/FormField';
import { Illustration } from '../components/illustrations/Illustration';
import { Screen } from '../components/app/Screen';
import { api } from '../lib/api';
import { formatCropSequence, formatMoney } from '../lib/format';
import { useComparison } from '../providers/ComparisonProvider';
import { useParcel } from '../providers/ParcelProvider';

export default function SavePlan() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { parcel } = useParcel();
  const { comparison, activePlanId } = useComparison();
  const [preferred, setPreferred] = useState(activePlanId ?? comparison?.plans[0]?.plan_id ?? '');
  const [fallback, setFallback] = useState(comparison?.plans[1]?.plan_id ?? '');
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      api.savePlan({
        parcelId: parcel!.id,
        comparisonId: comparison!.comparison_id,
        preferredPlanId: preferred,
        fallbackPlanId: fallback || preferred,
        name: name.trim() || t('Mi plan de campaña'),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['saved-plans'] });
      void queryClient.invalidateQueries({ queryKey: ['saved-plans', parcel?.id] });
      setSaved(true);
    },
  });

  const header = <AppHeader subtitle={t('Guardar un borrador')} onBack={() => navigate('/comparar')} />;

  if (!parcel || !comparison) {
    return (
      <Screen header={header}>
        <AppAlert tone="info">{t('Primero compara tus planes')}</AppAlert>
        <AppButton fullWidth onClick={() => navigate('/comparar')}>
          {t('Ir a comparar')}
        </AppButton>
      </Screen>
    );
  }

  if (saved) {
    return (
      <Screen header={header}>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Illustration name="success" size={96} />
          <h1 className="text-2xl font-bold text-foreground">{t('Plan guardado')}</h1>
          <p className="max-w-[320px] text-base leading-6 text-muted-foreground">
            {t('Revisa tus planes en Mi parcela')}
          </p>
        </div>
        <FeedbackCard
          title={t('¿Pudiste decidir con esto?')}
          description={t(
            'Tu respuesta nos ayuda a mejorar Anden. Sin conexión, queda guardada en el teléfono.',
          )}
          parcelId={parcel.id}
          kind="general"
          context={{ screen: 'save_plan', saved_plan_id: mutation.data?.id ?? null }}
        />
        <AppButton fullWidth size="lg" onClick={() => navigate('/parcela')}>
          {t('Ver mis planes guardados')}
        </AppButton>
      </Screen>
    );
  }

  return (
    <Screen
      header={header}
      footer={
        <AppButton
          fullWidth
          size="lg"
          loading={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {t('Confirmar y guardar')}
        </AppButton>
      }
    >
      <SectionCard title={t('¿Cuál es tu plan principal?')} subtitle={t('Puedes cambiarlo después')}>
        <div
          role="radiogroup"
          aria-label={t('¿Cuál es tu plan principal?')}
          className="space-y-2"
        >
          {comparison.plans.map((plan) => {
            const selected = plan.plan_id === preferred;
            return (
              <button
                key={plan.plan_id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setPreferred(plan.plan_id)}
                className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left ${
                  selected ? 'border-primary bg-accent' : 'border-border bg-card'
                }`}
              >
                <span
                  className={`h-4 w-4 shrink-0 rounded-full border ${
                    selected ? 'border-primary bg-primary' : 'border-border'
                  }`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold text-foreground">
                    {plan.kind === 'example'
                      ? t('Plan de ejemplo')
                      : plan.kind === 'existing'
                        ? t('Tu plan actual')
                        : t(plan.label)}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {formatCropSequence(plan.crop_sequence)} · {formatMoney(plan.economics.margin_pen)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title={t('Plan de respaldo')} subtitle={t('Si el principal no se puede')}>
        <div
          role="radiogroup"
          aria-label={t('Plan de respaldo')}
          className="space-y-2"
        >
          {comparison.plans
            .filter((plan) => plan.plan_id !== preferred)
            .map((plan) => {
              const selected = plan.plan_id === fallback;
              return (
                <button
                  key={plan.plan_id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setFallback(plan.plan_id)}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left ${
                    selected ? 'border-primary bg-accent' : 'border-border bg-card'
                  }`}
                >
                  <span
                    className={`h-4 w-4 shrink-0 rounded-full border ${
                      selected ? 'border-primary bg-primary' : 'border-border'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="text-base text-foreground">
                    {plan.kind === 'example'
                      ? t('Plan de ejemplo')
                      : plan.kind === 'existing'
                        ? t('Tu plan actual')
                        : t(plan.label)}
                  </span>
                </button>
              );
            })}
        </div>
      </SectionCard>

      <SectionCard title={t('Ponle un nombre')}>
        <FormField
          label={t('Nombre del plan')}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('Ej. Campaña 2026')}
        />
      </SectionCard>

      {mutation.isError ? (
        <AppAlert tone="error">
          {mutation.error instanceof Error ? mutation.error.message : t('No se pudo guardar.')}
        </AppAlert>
      ) : null}

      <p className="text-center text-sm leading-5 text-muted-foreground">
        {t('El plan guardado no modifica tu comparación. Es la decisión que registras.')}
      </p>
    </Screen>
  );
}
