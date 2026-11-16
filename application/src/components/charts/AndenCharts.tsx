import React from 'react';
import { View, useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';

import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { chartColors, darkChartColors, darkColors, colors } from '@/design-system/tokens';

export function useChartPalette() {
  return useColorScheme() === 'dark' ? darkChartColors : chartColors;
}

export type AndenBarDatum = {
  label: string;
  value: number | null;
  color?: string;
};

/**
 * Lightweight horizontal bar chart built with plain Views.
 *
 * The previous gifted-charts implementation pulled in a large JS chart engine
 * and animations for three bars. This version renders instantly, works offline
 * and keeps the accessible value labels.
 */
export function AndenBarChart({
  data,
  formatValue = (value) => String(Math.round(value)),
  negativeColor,
}: {
  data: AndenBarDatum[];
  formatValue?: (value: number) => string;
  negativeColor?: string;
}) {
  const { t } = useTranslation();
  const dark = useColorScheme() === 'dark';
  const palette = dark ? darkChartColors : chartColors;
  const track = dark ? darkColors.border : colors.border;
  const danger = negativeColor ?? (dark ? darkColors.error : colors.error);
  const clean = data.filter(
    (item): item is { label: string; value: number; color?: string } =>
      item.value !== null && Number.isFinite(item.value),
  );

  if (clean.length === 0) {
    return (
      <View className="h-24 items-center justify-center">
        <Text className="text-sm text-muted-foreground">{t('Sin datos')}</Text>
      </View>
    );
  }

  const max = Math.max(...clean.map((item) => Math.abs(item.value)), 1);

  return (
    <VStack className="gap-3">
      {clean.map((item) => {
        const isNegative = item.value < 0;
        const absValue = Math.abs(item.value);
        const width = Math.max(2, Math.round((absValue / max) * 100));
        const barColor = isNegative ? danger : (item.color ?? palette.primary);
        return (
          <VStack key={item.label} className="gap-1">
            <HStack className="items-center justify-between gap-3">
              <Text className="flex-1 text-sm font-medium text-foreground">{item.label}</Text>
              <Text
                className={`text-sm font-semibold ${isNegative ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}
              >
                {formatValue(item.value)}
              </Text>
            </HStack>
            <View
              style={{ backgroundColor: track }}
              className="h-3 w-full overflow-hidden rounded-full"
            >
              <View
                style={{
                  width: `${width}%`,
                  backgroundColor: barColor,
                }}
                className={`h-3 rounded-full ${isNegative ? 'self-end' : ''}`}
              />
            </View>
          </VStack>
        );
      })}
    </VStack>
  );
}
