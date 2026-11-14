import React from 'react';

import { Card } from '@/components/ui/card';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  testID,
  className,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  testID?: string;
  className?: string;
}) {
  return (
    <Card
      className={['gap-3 rounded-2xl border border-border bg-card p-4', className]
        .filter(Boolean)
        .join(' ')}
      testID={testID}
    >
      {title || action ? (
        <HStack className="items-start justify-between gap-3">
          <VStack className="flex-1 gap-0.5">
            {title ? (
              <Text className="text-base font-semibold text-foreground">{title}</Text>
            ) : null}
            {subtitle ? (
              <Text size="xs" className="text-muted-foreground">
                {subtitle}
              </Text>
            ) : null}
          </VStack>
          {action}
        </HStack>
      ) : null}
      {children}
    </Card>
  );
}
