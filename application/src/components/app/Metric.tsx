import React from 'react';

import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

export function MetricRow({
  label,
  value,
  testID,
}: {
  label: string;
  value: string;
  testID?: string;
}) {
  return (
    <HStack className="items-start justify-between gap-3" testID={testID}>
      <Text size="sm" className="flex-1 text-muted-foreground">
        {label}
      </Text>
      <Text size="sm" className="flex-1 text-right font-semibold text-foreground">
        {value}
      </Text>
    </HStack>
  );
}

export function MetricTile({
  label,
  value,
  unit,
  testID,
}: {
  label: string;
  value: string;
  unit?: string;
  testID?: string;
}) {
  return (
    <VStack className="min-w-[30%] flex-1 gap-1 rounded-xl bg-muted/60 p-3" testID={testID}>
      <Text size="xs" className="text-muted-foreground">
        {label}
      </Text>
      <Text className="text-lg font-bold text-foreground">{value}</Text>
      {unit ? (
        <Text size="xs" className="text-muted-foreground">
          {unit}
        </Text>
      ) : null}
    </VStack>
  );
}
