import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Disclosure } from '@/components/app/Disclosure';
import { SectionCard } from '@/components/app/SectionCard';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

export type ChartTableRow = {
  label: string;
  values: string[];
};

export function ChartTable({ columns, rows }: { columns: string[]; rows: ChartTableRow[] }) {
  return (
    <VStack className="gap-1" accessibilityLabel="Tabla de datos del gráfico">
      <HStack className="gap-2 border-b border-border pb-1">
        <Text className="flex-[1.4] text-sm font-semibold uppercase text-muted-foreground">
          {columns[0]}
        </Text>
        {columns.slice(1).map((column) => (
          <Text
            key={column}
            className="flex-1 text-right text-sm font-semibold uppercase text-muted-foreground"
          >
            {column}
          </Text>
        ))}
      </HStack>
      {rows.map((row) => (
        <HStack key={row.label} className="gap-2 py-1">
          <Text className="flex-[1.4] text-sm text-foreground">{row.label}</Text>
          {row.values.map((value, index) => (
            <Text key={`${row.label}-${columns[index + 1]}`} className="flex-1 text-right text-sm text-foreground">
              {value}
            </Text>
          ))}
        </HStack>
      ))}
    </VStack>
  );
}

export function ChartCard({
  title,
  subtitle,
  summary,
  columns,
  rows,
  testID,
  children,
}: {
  title: string;
  subtitle?: string;
  summary: string;
  columns: string[];
  rows: ChartTableRow[];
  testID?: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <SectionCard title={title} subtitle={subtitle} testID={testID}>
      <View pointerEvents="none" accessible accessibilityRole="image" accessibilityLabel={summary}>
        {children}
      </View>
      <Disclosure title={t('Ver datos')}>
        <ChartTable columns={columns} rows={rows} />
      </Disclosure>
    </SectionCard>
  );
}
