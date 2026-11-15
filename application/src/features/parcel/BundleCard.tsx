import React from 'react';
import { CheckCircle2, WifiOff, XCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/app/AppButton';
import { Disclosure } from '@/components/app/Disclosure';
import { SectionCard } from '@/components/app/SectionCard';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { colors } from '@/design-system/tokens';
import { testIDs } from '@/design-system/testIDs';
import { formatDate } from '@/lib/format';
import { useOffline } from '@/providers/OfflineProvider';

function formatBytes(value: number | null | undefined): string {
  if (!value) return '—';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

const warningLabels: Record<string, string> = {
  catalog_needs_review: 'Catálogo pendiente de revisión',
  power_unavailable: 'No se pudo descargar POWER',
  climate_snapshot_missing: 'Sin datos climáticos',
  offline_estimate: 'Estimación sin internet',
};

export function BundleCard() {
  const { t } = useTranslation();
  const { online, bundle, downloading, error, lastUpdated, stored, isStale, download, clearError } =
    useOffline();

  const status = !online
    ? bundle
      ? t('Tus datos están guardados')
      : t('Sin internet y sin datos guardados')
    : bundle
      ? t('Tus datos están guardados')
      : t('Todavía no guardaste datos');

  return (
    <SectionCard
      title={t('Datos sin internet')}
      subtitle={t('Para comparar y simular cuando no tengas señal')}
      testID={testIDs.parcelOffline}
    >
      <HStack className="items-center justify-between gap-2" testID={testIDs.bundleStatus}>
        <HStack className="items-center gap-2">
          {bundle ? (
            <CheckCircle2 size={20} color={colors.success} />
          ) : online ? (
            <XCircle size={20} color={colors.muted} />
          ) : (
            <WifiOff size={20} color={colors.warning} />
          )}
          <Text className="text-base font-medium text-foreground">{status}</Text>
        </HStack>
        {isStale ? (
          <Text className="text-sm font-semibold text-warning">{t('Vencido')}</Text>
        ) : null}
      </HStack>

      {error ? (
        <Text className="text-sm text-destructive" onPress={clearError}>
          {error}
        </Text>
      ) : null}

      <Text className="text-sm leading-5 text-muted-foreground">
        {bundle
          ? t('Puedes comparar y simular sin internet. Las imágenes nuevas necesitan conexión.')
          : t('Descarga los datos de tu parcela una vez y úsalos cuando no tengas señal.')}
      </Text>

      <AppButton
        testID={testIDs.bundleDownload}
        loading={downloading}
        isDisabled={!online || downloading}
        onPress={() => void download()}
      >
        {bundle ? t('Actualizar datos') : t('Descargar datos')}
      </AppButton>

      {bundle ? (
        <Disclosure title={t('Detalles de los datos guardados')}>
          <VStack className="gap-1">
            <Text className="text-sm text-foreground">
              {t('{{months}} meses de clima · {{plans}} planes', {
                months: bundle.climate.length,
                plans: bundle.comparison.plans.length,
              })}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {t('Actualizado: {{date}}', { date: formatDate(lastUpdated) })} ·{' '}
              {t('Vence: {{date}}', { date: formatDate(bundle.expires_at) })}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {t('Tamaño: {{size}}', { size: formatBytes(stored?.sizeBytes) })}
            </Text>
            {bundle.warnings.length > 0 ? (
              <Text className="text-sm text-warning">
                {t('Avisos: {{warnings}}', {
                  warnings: bundle.warnings
                    .map((warning) => t(warningLabels[warning] ?? warning))
                    .join(', '),
                })}
              </Text>
            ) : null}
          </VStack>
        </Disclosure>
      ) : null}
    </SectionCard>
  );
}
