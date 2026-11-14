import React from 'react';

import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { colors } from '@/design-system/tokens';

export function StateView({
  title,
  description,
  loading = false,
  icon,
  action,
  testID,
}: {
  title: string;
  description?: string;
  loading?: boolean;
  icon?: React.ComponentType<{ size?: number; color?: string }>;
  action?: React.ReactNode;
  testID?: string;
}) {
  const Icon = icon;
  return (
    <VStack className="flex-1 items-center justify-center gap-3 p-6" testID={testID}>
      {loading ? (
        <Spinner size="large" color={colors.primary} />
      ) : Icon ? (
        <Icon size={40} color={colors.primary} />
      ) : null}
      <Text className="text-center text-lg font-semibold text-foreground">{title}</Text>
      {description ? (
        <Text className="max-w-[320px] text-center text-sm text-muted-foreground">
          {description}
        </Text>
      ) : null}
      {action}
    </VStack>
  );
}
