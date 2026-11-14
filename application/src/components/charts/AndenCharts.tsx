import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui/text';
import { chartColors, colors } from '@/design-system/tokens';
import { usePreferences } from '@/providers/PreferencesProvider';

export type AndenBarDatum = {
  label: string;
  value: number | null;
  color?: string;
};

export function AndenBarChart({
  data,
  height = 180,
  formatValue = (value) => String(Math.round(value)),
}: {
  data: AndenBarDatum[];
  height?: number;
  formatValue?: (value: number) => string;
}) {
  const { t } = useTranslation();
  const { reduceMotion } = usePreferences();
  const { width } = useWindowDimensions();

  const clean = data.filter(
    (item): item is { label: string; value: number; color?: string } =>
      item.value !== null && Number.isFinite(item.value),
  );
  if (clean.length === 0) {
    return (
      <View className="h-32 items-center justify-center">
        <Text className="text-sm text-muted-foreground">{t('Sin datos')}</Text>
      </View>
    );
  }

  const maxValue = Math.max(...clean.map((item) => item.value), 1) * 1.2;
  const chartWidth = Math.max(240, width - 88);
  const barWidth = clean.length <= 2 ? 48 : clean.length === 3 ? 38 : 28;

  return (
    <BarChart
      data={clean.map((item) => ({
        value: item.value,
        label: item.label,
        frontColor: item.color ?? chartColors.primary,
      }))}
      width={chartWidth}
      height={height}
      barWidth={barWidth}
      spacing={Math.max(18, (chartWidth - clean.length * barWidth) / (clean.length + 1))}
      initialSpacing={16}
      barBorderRadius={8}
      showValuesAsTopLabel
      topLabelTextStyle={{ color: colors.text, fontSize: 10, fontWeight: '600' }}
      maxValue={maxValue}
      noOfSections={4}
      yAxisThickness={0}
      xAxisThickness={1}
      xAxisColor={colors.border}
      rulesColor={colors.border}
      yAxisTextStyle={{ color: colors.muted, fontSize: 10 }}
      xAxisLabelTextStyle={{ color: colors.muted, fontSize: 10 }}
      formatYLabel={(value: string) => formatValue(Number(value))}
      isAnimated={!reduceMotion}
      animationDuration={350}
      disableScroll
    />
  );
}

export function AndenLineChart({
  data,
  height = 160,
  formatValue = (value) => String(Math.round(value)),
}: {
  data: AndenBarDatum[];
  height?: number;
  formatValue?: (value: number) => string;
}) {
  const { t } = useTranslation();
  const { reduceMotion } = usePreferences();
  const { width } = useWindowDimensions();

  const clean = data.filter(
    (item): item is { label: string; value: number; color?: string } =>
      item.value !== null && Number.isFinite(item.value),
  );
  if (clean.length === 0) {
    return (
      <View className="h-32 items-center justify-center">
        <Text className="text-sm text-muted-foreground">{t('Sin datos')}</Text>
      </View>
    );
  }

  const chartWidth = Math.max(240, width - 88);
  const maxValue = Math.max(...clean.map((item) => item.value), 1) * 1.2;

  return (
    <LineChart
      data={clean.map((item) => ({ value: item.value, label: item.label }))}
      width={chartWidth}
      height={height}
      color={chartColors.primary}
      thickness={3}
      curved
      areaChart
      startFillColor={chartColors.primary}
      endFillColor={chartColors.primary}
      startOpacity={0.16}
      endOpacity={0.02}
      dataPointsColor={chartColors.secondary}
      dataPointsRadius={4}
      maxValue={maxValue}
      noOfSections={4}
      yAxisThickness={0}
      xAxisThickness={1}
      xAxisColor={colors.border}
      rulesColor={colors.border}
      yAxisTextStyle={{ color: colors.muted, fontSize: 10 }}
      xAxisLabelTextStyle={{ color: colors.muted, fontSize: 10 }}
      formatYLabel={(value: string) => formatValue(Number(value))}
      isAnimated={!reduceMotion}
      animationDuration={350}
      disableScroll
    />
  );
}
