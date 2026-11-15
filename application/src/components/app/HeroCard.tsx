import React from 'react';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { Illustration, type IllustrationName } from '@/components/illustrations/Illustration';

export function HeroCard({
  eyebrow,
  title,
  description,
  illustration,
  children,
  testID,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  illustration?: IllustrationName;
  children?: React.ReactNode;
  testID?: string;
}) {
  return (
    <Box className="gap-3 rounded-3xl bg-primary p-4" testID={testID}>
      <HStack className="items-center gap-3">
        <VStack className="flex-1 gap-1">
          {eyebrow ? (
            <Text className="text-sm font-semibold uppercase tracking-wider text-primary-foreground">
              {eyebrow}
            </Text>
          ) : null}
          <Text className="text-2xl font-bold leading-8 tracking-tight text-primary-foreground">
            {title}
          </Text>
          {description ? (
            <Text className="text-base leading-6 text-primary-foreground">{description}</Text>
          ) : null}
        </VStack>
        {illustration ? <Illustration name={illustration} size={76} /> : null}
      </HStack>
      {children}
    </Box>
  );
}
