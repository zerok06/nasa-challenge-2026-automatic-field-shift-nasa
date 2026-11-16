import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react-native';

import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { colors } from '@/design-system/tokens';

export function Disclosure({
  title,
  children,
  defaultOpen = false,
  testID,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  testID?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <VStack className="w-full">
      <Pressable
        testID={testID}
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        className="min-h-12 flex-row items-center justify-between gap-2 py-2"
      >
        <Text className="flex-1 text-sm font-medium text-foreground">{title}</Text>
        <ChevronDown
          size={18}
          color={colors.muted}
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </Pressable>
      {open ? (
        <VStack className="gap-2 pb-2" accessibilityLiveRegion="polite">
          {children}
        </VStack>
      ) : null}
    </VStack>
  );
}
