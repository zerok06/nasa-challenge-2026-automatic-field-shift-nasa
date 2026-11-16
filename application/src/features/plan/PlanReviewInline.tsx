import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { AppAlert } from '@/components/app/AppAlert';
import { Text } from '@/components/ui/text';
import { useOffline } from '@/providers/OfflineProvider';
import { reviewSavedPlan, type SavedPlan } from '@/services/api';

export function PlanReviewInline({
  plan,
  comparisonId,
}: {
  plan: SavedPlan;
  comparisonId?: string | null;
}) {
  const { t } = useTranslation();
  const { online } = useOffline();
  const reviewQuery = useQuery({
    queryKey: ['saved-plan-review', plan.id, comparisonId ?? 'current'],
    queryFn: () => reviewSavedPlan(plan.id, comparisonId),
    enabled: Boolean(online && comparisonId && plan.preferred),
    staleTime: 60_000,
    retry: 0,
  });

  if (!plan.preferred) return null;
  if (!comparisonId) {
    return (
      <Text className="text-sm leading-5 text-muted-foreground">
        {t('Vuelve a comparar para revisar si el plan cambió.')}
      </Text>
    );
  }
  if (reviewQuery.isFetching) {
    return (
      <Text className="text-sm leading-5 text-muted-foreground">
        {t('Revisando cambios…')}
      </Text>
    );
  }
  if (reviewQuery.data?.changed) {
    return (
      <AppAlert tone="warning">
        {reviewQuery.data.alerts[0]?.message ?? t('Hay cambios desde que guardaste el plan.')}
      </AppAlert>
    );
  }
  if (reviewQuery.data) {
    return (
      <Text className="text-sm leading-5 text-success">
        {t('Sin cambios importantes desde que guardaste.')}
      </Text>
    );
  }
  return null;
}
