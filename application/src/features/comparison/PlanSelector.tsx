import React from 'react';
import { useTranslation } from 'react-i18next';

import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import type { Plan } from '@/services/api';

export function PlanSelector({
  plans,
  selectedPlanId,
  onSelect,
}: {
  plans: Plan[];
  selectedPlanId: string;
  onSelect: (planId: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <HStack className="gap-2" accessibilityRole="tablist">
      {plans.map((plan) => {
        const selected = plan.plan_id === selectedPlanId;
        const label =
          plan.kind === 'existing'
            ? t('Actual')
            : plan.kind === 'example'
              ? t('Ejemplo')
              : t(plan.label);
        return (
          <Pressable
            key={plan.plan_id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`${label}: ${plan.label}`}
            onPress={() => onSelect(plan.plan_id)}
            className={`min-h-12 flex-1 items-center justify-center rounded-xl border px-2 py-2 ${
              selected ? 'border-primary bg-accent' : 'border-border bg-card'
            }`}
          >
            <Text className={`text-sm font-semibold ${selected ? 'text-primary' : 'text-foreground'}`}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </HStack>
  );
}
