import React from 'react';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { Illustration, type IllustrationName } from '@/components/illustrations/Illustration';

export function ToolTile({
  title,
  subtitle,
  illustration,
  onPress,
  testID,
  badge,
}: {
  title: string;
  subtitle?: string;
  illustration: IllustrationName;
  onPress: () => void;
  testID?: string;
  badge?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}
      className="min-h-[132px] flex-1 basis-[47%] gap-2 rounded-2xl border border-border bg-card p-3"
    >
      <Illustration name={illustration} size={44} />
      <VStack className="gap-0.5">
        <Text className="text-base font-semibold text-foreground">{title}</Text>
        {subtitle ? (
          <Text className="text-sm leading-5 text-muted-foreground" numberOfLines={3}>
            {subtitle}
          </Text>
        ) : null}
      </VStack>
      {badge ? (
        <Text className="self-start rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-primary">
          {badge}
        </Text>
      ) : null}
    </Pressable>
  );
}
