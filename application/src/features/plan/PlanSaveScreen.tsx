import React, { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Sprout } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { AppAlert } from '@/components/app/AppAlert';
import { AppButton } from '@/components/app/AppButton';
import { AppHeader } from '@/components/app/AppHeader';
import { FormField } from '@/components/app/FormField';
import { HeroCard } from '@/components/app/HeroCard';
import { Screen } from '@/components/app/Screen';
import { SectionCard } from '@/components/app/SectionCard';
import { StateView } from '@/components/app/StateView';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { colors } from '@/design-system/tokens';
import { formatCropSequence, formatMoney, formatNumber } from '@/lib/format';
import { useComparison } from '@/providers/ComparisonProvider';
import { useOffline } from '@/providers/OfflineProvider';
import { useParcel } from '@/providers/ParcelProvider';
import { savePlan, type Plan } from '@/services/api';

function PlanOption({
  plan,
  selected,
  disabled = false,
  onPress,
}: {
  plan: Plan;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={`${plan.label}: ${formatCropSequence(plan.crop_sequence)}`}
      className={`min-h-14 flex-row items-start gap-3 rounded-2xl border p-3 ${
        selected ? 'border-primary bg-accent' : 'border-border bg-card'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <VStack className="flex-1 gap-1">
        <Text className="text-base font-semibold text-foreground">
          {plan.kind === 'existing'
            ? t('Tu plan actual')
            : plan.kind === 'example'
              ? t('Plan de ejemplo')
              : plan.label}
        </Text>
        <Text className="text-sm leading-5 text-foreground">
          {formatCropSequence(plan.crop_sequence)}
        </Text>
        <Text className="text-sm leading-5 text-muted-foreground">
          {t('Agua disponible: {{value}}', {
            value: formatNumber(plan.water.available_mm, 'mm', 0),
          })}
          {' · '}
          {t('Ganancia: {{value}}', { value: formatMoney(plan.economics.margin_pen) })}
        </Text>
      </VStack>
      {selected ? <Check size={20} color={colors.primary} /> : null}
    </Pressable>
  );
}

export function PlanSaveScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { parcel } = useParcel();
  const { online } = useOffline();
  const { comparison, activePlanId } = useComparison();
  const [preferredId, setPreferredId] = useState<string | null>(null);
  const [fallbackId, setFallbackId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plans = useMemo(() => comparison?.plans ?? [], [comparison]);
  const preferred = useMemo(() => {
    const active = plans.find((plan) => plan.plan_id === preferredId);
    if (active) return active;
    return plans.find((plan) => plan.plan_id === activePlanId) ?? plans[0] ?? null;
  }, [activePlanId, plans, preferredId]);
  const fallback = useMemo(() => {
    const selected = plans.find(
      (plan) => plan.plan_id === fallbackId && plan.plan_id !== preferred?.plan_id,
    );
    if (selected) return selected;
    return plans.find((plan) => plan.plan_id !== preferred?.plan_id) ?? null;
  }, [fallbackId, plans, preferred?.plan_id]);

  const defaultName = comparison
    ? t('Campaña {{year}}', { year: comparison.analysis_period.start.slice(0, 4) })
    : t('Mi plan');
  const effectiveName = name.trim() || defaultName;
  const canSave = Boolean(online && preferred && fallback);

  if (!parcel) {
    return (
      <Screen header={<AppHeader subtitle={t('Guardar mi plan')} onBack={() => router.back()} />}>
        <StateView
          illustration="empty"
          title={t('Primero crea tu parcela')}
          description={t('Necesitamos tu parcela para guardar un plan.')}
          action={<AppButton onPress={() => router.replace('/parcel-new')}>{t('Crear mi parcela')}</AppButton>}
        />
      </Screen>
    );
  }

  if (!comparison || plans.length === 0) {
    return (
      <Screen header={<AppHeader subtitle={t('Guardar mi plan')} onBack={() => router.back()} />}>
        <StateView
          illustration="compare"
          title={t('Primero compara tus planes')}
          description={t('Elige una opción después de comparar el agua, el suelo y la ganancia.')}
          action={<AppButton onPress={() => router.replace('/comparison')}>{t('Ir a comparar')}</AppButton>}
        />
      </Screen>
    );
  }

  const handleSave = async () => {
    if (!preferred || !fallback) {
      setError(t('Elige una opción preferida y una alternativa distinta.'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const saved = await savePlan({
        parcelId: parcel.id,
        comparisonId: comparison.comparison_id,
        preferredPlanId: preferred.plan_id,
        fallbackPlanId: fallback.plan_id,
        name: effectiveName,
      });
      await queryClient.invalidateQueries({ queryKey: ['saved-plans', parcel.id] });
      router.replace({ pathname: '/plan-review', params: { id: saved.id, saved: '1' } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('No pudimos guardar el plan.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      edges={['top', 'bottom']}
      header={
        <AppHeader
          title="ANDEN"
          subtitle={t('Guardar mi plan')}
          onBack={() => router.back()}
        />
      }
      footer={
        <>
          <AppButton loading={busy} isDisabled={!canSave} onPress={() => void handleSave()}>
            {t('Guardar plan y revisar condiciones')}
          </AppButton>
          <AppButton tone="ghost" onPress={() => router.back()} isDisabled={busy}>
            {t('Cancelar')}
          </AppButton>
        </>
      }
    >
      {!online ? (
        <AppAlert tone="info">
          {t('Necesitas conexión para guardar el plan. Tus datos actuales no se modifican.')}
        </AppAlert>
      ) : null}
      {plans.length < 2 ? (
        <AppAlert tone="warning">
          {t('Necesitas al menos dos opciones para guardar una alternativa.')}
        </AppAlert>
      ) : null}
      {error ? <AppAlert tone="error">{error}</AppAlert> : null}

      <HeroCard
        eyebrow={t('Cierra tu decisión')}
        title={t('Elige tu plan y una alternativa')}
        description={t(
          'Guardamos una foto del agua y la ganancia para avisarte si cambian. No cambia tus datos de parcela.',
        )}
        illustration="success"
      />

      <SectionCard
        title={t('Opción preferida')}
        subtitle={t('La que quieres sembrar si las condiciones se mantienen')}
      >
        <VStack className="gap-2" accessibilityRole="radiogroup">
          {plans.map((plan) => (
            <PlanOption
              key={plan.plan_id}
              plan={plan}
              selected={plan.plan_id === preferred?.plan_id}
              onPress={() => {
                setPreferredId(plan.plan_id);
                if (fallbackId === plan.plan_id) setFallbackId(null);
                setError(null);
              }}
            />
          ))}
        </VStack>
      </SectionCard>

      <SectionCard
        title={t('Opción alternativa')}
        subtitle={t('La que revisarías si el agua o el precio cambian')}
      >
        <VStack className="gap-2" accessibilityRole="radiogroup">
          {plans.map((plan) => (
            <PlanOption
              key={plan.plan_id}
              plan={plan}
              selected={plan.plan_id === fallback?.plan_id}
              disabled={plan.plan_id === preferred?.plan_id}
              onPress={() => {
                setFallbackId(plan.plan_id);
                setError(null);
              }}
            />
          ))}
        </VStack>
      </SectionCard>

      <SectionCard title={t('Nombre del plan')} subtitle={t('Para reconocerlo en Mi parcela')}>
        <FormField
          label={t('Nombre')}
          value={name}
          onChangeText={setName}
          placeholder={defaultName}
          maxLength={120}
        />
        <Text className="text-sm leading-5 text-muted-foreground">
          {t('Se guardará como “{{name}}”.', { name: effectiveName })}
        </Text>
      </SectionCard>

      <SectionCard
        title={t('Qué vamos a guardar')}
        subtitle={t('Esta foto es la referencia para avisarte de cambios')}
      >
        <HStack className="items-start gap-2">
          <Sprout size={20} color={colors.primary} />
          <VStack className="flex-1 gap-1">
            <Text className="text-sm font-semibold text-foreground">
              {preferred ? formatCropSequence(preferred.crop_sequence) : t('Sin opción preferida')}
            </Text>
            <Text className="text-sm leading-5 text-muted-foreground">
              {preferred
                ? t('Agua disponible: {{water}} · Ganancia: {{margin}}', {
                    water: formatNumber(preferred.water.available_mm, 'mm', 0),
                    margin: formatMoney(preferred.economics.margin_pen),
                  })
                : t('Elige una opción preferida.')}
            </Text>
            <Text className="text-sm leading-5 text-muted-foreground">
              {t('Alternativa: {{plan}}', {
                plan: fallback ? formatCropSequence(fallback.crop_sequence) : t('por elegir'),
              })}
            </Text>
          </VStack>
        </HStack>
      </SectionCard>
    </Screen>
  );
}
