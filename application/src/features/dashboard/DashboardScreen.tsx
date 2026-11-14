import React from 'react';
import { RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { MapPinOff } from 'lucide-react-native';

import { AppAlert } from '@/components/app/AppAlert';
import { AppButton } from '@/components/app/AppButton';
import { AppHeader } from '@/components/app/AppHeader';
import { MetricRow } from '@/components/app/Metric';
import { Screen } from '@/components/app/Screen';
import { SectionCard } from '@/components/app/SectionCard';
import { StateView } from '@/components/app/StateView';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { formatMissing, formatNumber } from '@/lib/format';
import { testIDs } from '@/design-system/testIDs';
import { useComparison } from '@/providers/ComparisonProvider';
import { useParcel } from '@/providers/ParcelProvider';

function completenessValue(value?: string): number {
  if (value === 'ready') return 100;
  if (value === 'partial') return 60;
  return 30;
}

export function DashboardScreen() {
  const { parcel, context, indicators, loading, error, refresh } = useParcel();
  const { createComparison, busy } = useComparison();

  if (!parcel && loading) {
    return (
      <Screen header={<AppHeader subtitle="Copiloto de planificación agrícola" />}>
        <StateView loading title="Cargando parcela" description="Leyendo contexto y datos NASA." />
      </Screen>
    );
  }

  if (!parcel) {
    return (
      <Screen header={<AppHeader subtitle="Copiloto de planificación agrícola" />}>
        <StateView
          icon={MapPinOff}
          title="No hay una parcela activa"
          description="Creá una parcela o cargá la demo para empezar."
          action={<AppButton onPress={() => router.replace('/onboarding')}>Ir al inicio</AppButton>}
        />
      </Screen>
    );
  }

  const firstIndicator = indicators?.indicators?.[0];
  const completeness = completenessValue(context?.completeness.comparison);

  const handleCompare = async () => {
    try {
      await createComparison();
      router.push('/comparison');
    } catch {
      // The provider exposes the error through the alert below.
    }
  };

  return (
    <Screen
      header={
        <AppHeader
          subtitle={parcel.name}
          isSimulated={parcel.is_simulated}
          onSources={() => router.push('/sources')}
        />
      }
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#1B5E20" />
      }
    >
      {error ? <AppAlert tone="error">{error}</AppAlert> : null}

      <SectionCard title="Ficha de parcela" subtitle="Lo que sabemos y lo que falta">
        <VStack className="gap-2">
          <MetricRow label="Superficie" value={parcel.area_ha ? `${parcel.area_ha} ha` : 'No disponible'} />
          <MetricRow label="Distrito" value={parcel.district ?? 'No disponible'} />
          <MetricRow label="Comparación" value={context?.completeness.comparison ?? 'Sin datos'} />
          <MetricRow label="Agua" value={context?.completeness.water ?? 'Sin datos'} />
        </VStack>
        <VStack className="gap-1 pt-1">
          <Text size="xs" className="text-muted-foreground">
            Completitud del análisis
          </Text>
          <Progress value={completeness}>
            <ProgressFilledTrack className="bg-primary" />
          </Progress>
        </VStack>
        {context?.missing_inputs?.length ? (
          <AppAlert tone="warning">
            Falta: {formatMissing(context.missing_inputs)}. Los resultados se muestran como no
            disponibles hasta completar esos datos.
          </AppAlert>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Contexto NASA"
        subtitle="NASA POWER · datos modelados de reanálisis"
      >
        <VStack className="gap-2">
          <MetricRow label="Lluvia" value={formatNumber(firstIndicator?.precip_mm, 'mm')} />
          <MetricRow label="Tmin" value={formatNumber(firstIndicator?.tmin_c, '°C')} />
          <MetricRow label="Tmax" value={formatNumber(firstIndicator?.tmax_c, '°C')} />
          <MetricRow label="ETo" value={formatNumber(firstIndicator?.eto_mm, 'mm')} />
        </VStack>
        <Text size="xs" className="text-muted-foreground">
          {indicators?.source?.source ?? 'NASA POWER'} ·{' '}
          {indicators?.source?.resolution ?? 'resolución no disponible'} ·{' '}
          {indicators?.source?.quality_flag ?? 'calidad no declarada'}
        </Text>
        <AppButton tone="outline" onPress={() => router.push('/sources')}>
          Ver ficha de fuentes
        </AppButton>
      </SectionCard>

      <SectionCard title="¿Qué querés hacer ahora?" subtitle="Tres caminos, una sola parcela">
        <AppButton
          testID={testIDs.dashboardCompare}
          loading={busy}
          onPress={handleCompare}
        >
          Comparar rotaciones
        </AppButton>
        <AppButton
          testID={testIDs.dashboardMap}
          tone="water"
          onPress={() => router.push('/map')}
        >
          Ver mapa
        </AppButton>
        <AppButton
          testID={testIDs.dashboardAgent}
          tone="earth"
          onPress={() => router.push('/agent')}
        >
          Preguntar al agente
        </AppButton>
      </SectionCard>

      <Text className="text-center text-[10px] text-muted-foreground">
        Comparación de apoyo a decisiones bajo supuestos. No es una recomendación agronómica
        validada.
      </Text>
    </Screen>
  );
}
