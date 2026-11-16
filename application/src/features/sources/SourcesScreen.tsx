import React from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/app/AppHeader';
import { Disclosure } from '@/components/app/Disclosure';
import { MetricRow } from '@/components/app/Metric';
import { Screen } from '@/components/app/Screen';
import { SectionCard } from '@/components/app/SectionCard';
import { Illustration } from '@/components/illustrations/Illustration';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { qualityLabel } from '@/design-system/tokens';
import { formatDate } from '@/lib/format';
import { useParcel } from '@/providers/ParcelProvider';

export function SourcesScreen() {
  const { t } = useTranslation();
  const { indicators } = useParcel();
  const source = indicators?.source;

  return (
    <Screen
      edges={['top', 'bottom']}
      header={
        <AppHeader
          title={t('FUENTES')}
          subtitle={t('De dónde vienen los datos')}
          onBack={() => router.back()}
        />
      }
    >
      <HStack className="items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <Illustration name="sources" size={64} />
        <Text className="flex-1 text-sm leading-5 text-muted-foreground">
          {t('Cada número se puede rastrear hasta su fuente. Si no hay dato, lo decimos.')}
        </Text>
      </HStack>

      <SectionCard
        title={t('Datos del clima')}
        subtitle={t('Cada número se puede rastrear hasta su fuente')}
      >
        <VStack className="gap-2">
          <MetricRow label={t('Fuente')} value={source?.source ?? 'NASA POWER'} />
          <MetricRow
            label={t('Resolución')}
            value={source?.resolution ?? t('No disponible')}
          />
          <MetricRow
            label={t('Calidad')}
            value={
              source?.quality_flag
                ? t(qualityLabel[source.quality_flag] ?? source.quality_flag)
                : t('No declarada')
            }
          />
          <MetricRow label={t('Actualizado')} value={formatDate(source?.retrieved_at)} />
        </VStack>
        <HStack className="items-center gap-2">
          <Text className="text-sm text-muted-foreground">{t('¿Son datos de ejemplo?')}</Text>
          <Text className="text-sm font-semibold text-foreground">
            {source?.is_simulated ? t('Sí, de ejemplo') : t('No, son datos reales')}
          </Text>
        </HStack>
      </SectionCard>

      <SectionCard
        title={t('Fuentes de esta parcela')}
        subtitle={t('Clima histórico, pronóstico, terreno y precios')}
      >
        <MetricRow label="NASA POWER" value={t('Clima histórico por parcela')} />
        <MetricRow label="Open-Meteo" value={t('Pronóstico de 7 días')} />
        <MetricRow label="SRTM / Copernicus" value={t('Elevación y pendiente')} />
        <MetricRow
          label={t('Precios')}
          value={t('Ingresados por ti; referencia pendiente')}
        />
      </SectionCard>

      <SectionCard title={t('Cómo se calcula')}>
        <Disclosure title={t('Agua')}>
          <Text className="text-sm leading-5 text-muted-foreground">
            {t(
              'La ETo se estima con temperatura y radiación (FAO-56). El riego usa el agua de lluvia, la eficiencia y las etapas del cultivo.',
            )}
          </Text>
        </Disclosure>
        <Disclosure title={t('Ganancia')}>
          <Text className="text-sm leading-5 text-muted-foreground">
            {t(
              'La ganancia usa tu rendimiento, tu precio de venta y tus costos. Si falta uno, se muestra como no calculable.',
            )}
          </Text>
        </Disclosure>
        <Disclosure title={t('Qué no podemos afirmar')}>
          <Text className="text-sm leading-5 text-muted-foreground">
            {t(
              'No medimos la humedad de tu parcela. No predecimos el clima ni el precio. No reemplazamos a un agrónomo.',
            )}
          </Text>
        </Disclosure>
      </SectionCard>

      <SectionCard title={t('Licencia y atribución')}>
        <Text className="text-sm leading-5 text-foreground">
          {t(
            'Código MIT. Datos de NASA POWER, FAO-56 y el anuario de Moquegua. App gratuita para agricultores; no se venden datos.',
          )}
        </Text>
      </SectionCard>
    </Screen>
  );
}
