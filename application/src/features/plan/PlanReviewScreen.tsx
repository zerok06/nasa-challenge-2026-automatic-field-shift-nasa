import React, { useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Sprout } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { AppAlert } from '@/components/app/AppAlert';
import { AppButton } from '@/components/app/AppButton';
import { AppHeader } from '@/components/app/AppHeader';
import { HeroCard } from '@/components/app/HeroCard';
import { MetricRow } from '@/components/app/Metric';
import { Screen } from '@/components/app/Screen';
import { SectionCard } from '@/components/app/SectionCard';
import { StateView } from '@/components/app/StateView';
import { HStack } from '@/components/ui/hstack';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { colors } from '@/design-system/tokens';
import {
  formatCropSequence,
  formatDate,
  formatMoney,
  formatNumber,
} from '@/lib/format';
import { useComparison } from '@/providers/ComparisonProvider';
import { useOffline } from '@/providers/OfflineProvider';
import { useParcel } from '@/providers/ParcelProvider';
import {
  getSavedPlans,
  reviewSavedPlan,
  type SavedPlan,
  type SavedPlanReviewAlert,
} from '@/services/api';

function AlertList({ alerts }: { alerts: SavedPlanReviewAlert[] }) {
  return (
    <>
      {alerts.map((alert) => (
        <Text key={`${alert.code}-${alert.message}`} className="text-sm leading-5">
          {' '}
          {alert.message}
        </Text>
      ))}
    </>
  );
}

function savedPlanMetrics(plan: SavedPlan) {
  return {
    sequence: plan.preferred ? formatCropSequence(plan.preferred.crop_sequence) : null,
    fallback: plan.fallback ? formatCropSequence(plan.fallback.crop_sequence) : null,
    water: plan.preferred?.water.available_mm ?? null,
    margin: plan.preferred?.economics.margin_pen ?? null,
  };
}

export function PlanReviewScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string; saved?: string }>();
  const requestedId = typeof params.id === 'string' ? params.id : null;
  const justSaved = params.saved === '1';
  const { parcel } = useParcel();
  const { online } = useOffline();
  const { comparison } = useComparison();
  const parcelId = parcel?.id;

  const plansQuery = useQuery({
    queryKey: ['saved-plans', parcelId],
    queryFn: getSavedPlans,
    enabled: Boolean(parcelId),
  });

  const plans = useMemo(
    () => (plansQuery.data ?? []).filter((plan) => plan.parcel_id === parcelId),
    [parcelId, plansQuery.data],
  );
  const plan = useMemo(
    () =>
      plans.find((item) => item.id === requestedId) ??
      plans[0] ??
      null,
    [plans, requestedId],
  );

  const hasSnapshot = Boolean(plan?.preferred);
  const reviewQuery = useQuery({
    queryKey: ['saved-plan-review', plan?.id, comparison?.comparison_id ?? 'current'],
    queryFn: () => reviewSavedPlan(plan!.id, comparison?.comparison_id),
    enabled: Boolean(online && plan?.id && hasSnapshot),
    staleTime: 0,
    retry: 0,
  });

  if (!parcel) {
    return (
      <Screen header={<AppHeader subtitle={t('Revisar mi plan')} onBack={() => router.back()} />}>
        <StateView
          illustration="empty"
          title={t('Primero crea tu parcela')}
          description={t('Necesitamos tu parcela para revisar el plan guardado.')}
          action={<AppButton onPress={() => router.replace('/parcel-new')}>{t('Crear mi parcela')}</AppButton>}
        />
      </Screen>
    );
  }

  if (plansQuery.isLoading) {
    return (
      <Screen header={<AppHeader subtitle={t('Revisar mi plan')} onBack={() => router.back()} />}>
        <StateView loading title={t('Cargando tu plan')} description={t('Leyendo lo que guardaste.')} />
      </Screen>
    );
  }

  if (plansQuery.error) {
    return (
      <Screen header={<AppHeader subtitle={t('Revisar mi plan')} onBack={() => router.back()} />}>
        <AppAlert tone="error">
          {plansQuery.error instanceof Error
            ? plansQuery.error.message
            : t('No pudimos cargar tus planes guardados.')}
        </AppAlert>
        <AppButton onPress={() => void plansQuery.refetch()}>{t('Reintentar')}</AppButton>
      </Screen>
    );
  }

  if (!plan) {
    return (
      <Screen header={<AppHeader subtitle={t('Revisar mi plan')} onBack={() => router.back()} />}>
        <StateView
          illustration="success"
          title={t('Todavía no guardaste un plan')}
          description={t('Compara tus opciones y guarda la que quieras seguir.')}
          action={<AppButton onPress={() => router.replace('/comparison')}>{t('Ir a comparar')}</AppButton>}
        />
      </Screen>
    );
  }

  const metrics = savedPlanMetrics(plan);
  const review = reviewQuery.data;
  const canReview = online;

  return (
    <Screen
      edges={['top', 'bottom']}
      header={
        <AppHeader
          title="ANDEN"
          subtitle={t('Revisar mi plan')}
          onBack={() => router.back()}
        />
      }
      footer={
        <>
          <AppButton onPress={() => router.replace('/comparison')}>
            {t('Comparar de nuevo')}
          </AppButton>
          <AppButton tone="outline" onPress={() => router.push('/scenario')}>
            {t('Probar un cambio')}
          </AppButton>
          <AppButton tone="ghost" onPress={() => router.replace('/parcel')}>
            {t('Volver a Mi parcela')}
          </AppButton>
        </>
      }
    >
      {justSaved ? (
        <AppAlert tone="success">{t('Plan guardado. Ya tienes una referencia para revisar.')}</AppAlert>
      ) : null}
      {!online ? (
        <AppAlert tone="info">
          {t('Sin conexión: no podemos recalcular el plan. Tus condiciones guardadas siguen visibles.')}
        </AppAlert>
      ) : null}

      <HeroCard
        eyebrow={t('Tu decisión')}
        title={plan.name}
        description={t('Guardado el {{date}}. Revisa si el agua o la ganancia cambiaron.', {
          date: plan.created_at ? formatDate(plan.created_at) : t('día de hoy'),
        })}
        illustration="success"
      />

      <SectionCard
        title={t('Plan preferido')}
        subtitle={metrics.sequence ?? t('Sin secuencia guardada')}
      >
        <VStack className="gap-2">
          <MetricRow
            label={t('Agua disponible al guardar')}
            value={formatNumber(metrics.water, 'mm', 0)}
          />
          <MetricRow
            label={t('Ganancia estimada al guardar')}
            value={formatMoney(metrics.margin)}
          />
          <MetricRow
            label={t('Alternativa')}
            value={metrics.fallback ?? t('Sin alternativa guardada')}
          />
          <Text className="text-sm leading-5 text-muted-foreground">
            {t(
              'Revisa si el agua baja de este valor o si la ganancia estimada cambia. No cambiamos tus datos de parcela.',
            )}
          </Text>
        </VStack>
      </SectionCard>

      {!hasSnapshot ? (
        <SectionCard
          title={t('Revisión de hoy')}
          subtitle={t('Este plan no tiene condiciones guardadas')}
        >
          <AppAlert tone="info">
            {t(
              'Este plan se guardó como borrador sin una foto de agua y ganancia. Guarda un plan nuevo para poder revisarlo.',
            )}
          </AppAlert>
          <AppButton onPress={() => router.replace('/plan-save')}>
            {t('Guardar un plan nuevo')}
          </AppButton>
        </SectionCard>
      ) : (
        <SectionCard
          title={t('Revisión de hoy')}
          subtitle={canReview ? t('Con los datos actuales de tu parcela') : t('Necesita conexión')}
        >
          {reviewQuery.isFetching ? (
            <HStack className="items-center gap-2">
              <Spinner size="small" color={colors.primary} />
              <Text className="text-sm text-muted-foreground">{t('Recalculando agua y ganancia…')}</Text>
            </HStack>
          ) : null}

          {reviewQuery.error ? (
            <>
              <AppAlert tone="error">
                {reviewQuery.error instanceof Error
                  ? reviewQuery.error.message
                  : t('No pudimos revisar el plan con los datos actuales.')}
              </AppAlert>
              <AppButton tone="outline" onPress={() => void reviewQuery.refetch()}>
                {t('Reintentar revisión')}
              </AppButton>
            </>
          ) : null}

          {review ? (
            <VStack className="gap-3">
              {review.changed ? (
                <AppAlert tone="warning">
                  <Text className="text-sm font-semibold">{t('Hay cambios desde que guardaste')}</Text>
                  <AlertList alerts={review.alerts} />
                </AppAlert>
              ) : (
                <AppAlert tone="success">
                  {t('Sin cambios importantes: el plan sigue alineado con tus datos actuales.')}
                </AppAlert>
              )}
              <VStack className="gap-2">
                <MetricRow
                  label={t('Agua disponible ahora')}
                  value={formatNumber(review.current_available_mm, 'mm', 0)}
                />
                <MetricRow
                  label={t('Ganancia estimada ahora')}
                  value={formatMoney(review.current_margin_pen)}
                />
                <MetricRow
                  label={t('Plan actual en la comparación')}
                  value={
                    review.current_preferred
                      ? formatCropSequence(review.current_preferred.crop_sequence)
                      : t('No aparece en las opciones actuales')
                  }
                />
              </VStack>
            </VStack>
          ) : null}

          {!canReview ? (
            <HStack className="items-center gap-2">
              <Sprout size={18} color={colors.muted} />
              <Text className="flex-1 text-sm leading-5 text-muted-foreground">
                {t('Vuelve a revisar cuando tengas señal para recalcular el agua y la ganancia.')}
              </Text>
            </HStack>
          ) : null}
        </SectionCard>
      )}

      <Text className="text-sm leading-5 text-muted-foreground">
        {t(
          'Esta revisión es una ayuda para decidir. No reemplaza la visita de un agrónomo ni cambia el plan guardado.',
        )}
      </Text>

      {canReview && !reviewQuery.isFetching ? (
        <AppButton
          tone="ghost"
          onPress={() => void reviewQuery.refetch()}
        >
          {t('Volver a revisar')}
        </AppButton>
      ) : null}
    </Screen>
  );
}
