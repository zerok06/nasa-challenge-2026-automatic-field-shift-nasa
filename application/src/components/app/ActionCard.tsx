import React from 'react';
import { useColorScheme } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { colors, darkColors } from '@/design-system/tokens';
import { Illustration, type IllustrationName } from '@/components/illustrations/Illustration';

export type ActionTone = 'primary' | 'water' | 'earth' | 'warning';

const toneStyles: Record<ActionTone, { bg: string; icon: string }> = {
  primary: { bg: 'bg-accent', icon: colors.primary },
  water: { bg: 'bg-info/10', icon: colors.water },
  earth: { bg: 'bg-earth/10', icon: colors.earth },
  warning: { bg: 'bg-warning/10', icon: colors.warning },
};

const darkToneIcons: Record<ActionTone, string> = {
  primary: darkColors.primary,
  water: darkColors.water,
  earth: darkColors.earth,
  warning: darkColors.warning,
};

export function ActionCard({
  icon: Icon,
  illustration,
  title,
  subtitle,
  tone = 'primary',
  onPress,
  testID,
  badge,
  disabled = false,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  illustration?: IllustrationName;
  title: string;
  subtitle?: string;
  tone?: ActionTone;
  onPress: () => void;
  testID?: string;
  badge?: string;
  disabled?: boolean;
}) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const style = toneStyles[tone];
  const iconColor = dark ? darkToneIcons[tone] : style.icon;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}
      className={`min-h-[88px] flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4 ${disabled ? 'opacity-50' : ''}`}
    >
      {illustration ? (
        <Illustration name={illustration} size={48} />
      ) : (
        <Box className={`h-12 w-12 items-center justify-center rounded-2xl ${style.bg}`}>
          <Icon size={24} color={iconColor} />
        </Box>
      )}
      <VStack className="flex-1 gap-0.5">
        <HStack className="items-center gap-2">
          <Text className="shrink text-base font-semibold text-foreground">{title}</Text>
          {badge ? (
            <Text className="rounded-full bg-primary px-2 py-0.5 text-sm font-bold text-primary-foreground">
              {badge}
            </Text>
          ) : null}
        </HStack>
        {subtitle ? (
          <Text className="text-sm leading-5 text-muted-foreground">{subtitle}</Text>
        ) : null}
      </VStack>
      <ChevronRight size={20} color={dark ? darkColors.muted : colors.subtle} />
    </Pressable>
  );
}
