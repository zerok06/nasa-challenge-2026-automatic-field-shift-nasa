import React from 'react';

import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

export function MetricRow({
  label,
  value,
  testID,
  valueClassName,
}: {
  label: string;
  value: string;
  testID?: string;
  valueClassName?: string;
}) {
  return (
    <HStack className="items-start justify-between gap-3" testID={testID}>
      <Text className="flex-1 text-sm leading-5 text-muted-foreground">{label}</Text>
      <Text
        className={[
          'max-w-[58%] text-right text-base font-semibold leading-5 text-foreground',
          valueClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {value}
      </Text>
    </HStack>
  );
}

export function MetricTile({
  label,
  value,
  unit,
  icon,
  tone = 'neutral',
  testID,
}: {
  label: string;
  value: string;
  unit?: string;
  icon?: React.ReactNode;
  tone?: 'neutral' | 'water' | 'earth' | 'primary' | 'warning';
  testID?: string;
}) {
  const toneClass = {
    neutral: 'bg-muted/60',
    water: 'bg-info/10',
    earth: 'bg-earth/10',
    primary: 'bg-accent',
    warning: 'bg-warning/10',
  }[tone];

  return (
    <VStack className={`min-w-[30%] flex-1 gap-1 rounded-2xl p-3 ${toneClass}`} testID={testID}>
      <HStack className="items-center gap-1.5">
        {icon}
        <Text className="flex-1 text-sm leading-5 text-muted-foreground">{label}</Text>
      </HStack>
      <Text className="text-xl font-bold text-foreground">{value}</Text>
      {unit ? <Text className="text-sm text-muted-foreground">{unit}</Text> : null}
    </VStack>
  );
}
