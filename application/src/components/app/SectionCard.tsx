import React from 'react';
import {
  ImageBackground,
  StyleSheet,
  type ImageSourcePropType,
  useColorScheme,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Card } from '@/components/ui/card';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { colors, darkColors } from '@/design-system/tokens';

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  testID,
  className,
  coverImage,
  coverLabel,
  coverAccessibilityLabel,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  testID?: string;
  className?: string;
  coverImage?: ImageSourcePropType;
  coverLabel?: string;
  coverAccessibilityLabel?: string;
}) {
  const colorScheme = useColorScheme();
  const surfaceColor = colorScheme === 'dark' ? darkColors.surface : colors.surface;

  return (
    <Card
      className={[
        'gap-3 rounded-2xl border border-border bg-card',
        coverImage ? 'overflow-hidden p-0' : 'p-4',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={coverImage ? { width: '100%' } : undefined}
      testID={testID}
    >
      {coverImage ? (
        <ImageBackground
          source={coverImage}
          resizeMode="cover"
          accessibilityRole="image"
          accessibilityLabel={coverAccessibilityLabel}
          style={{ width: '100%', height: 152, flexGrow: 0, flexShrink: 0 }}
          imageStyle={{ width: '100%', height: '100%' }}
        >
          <View className="h-[152px] w-full justify-between p-4">
            <Svg
              pointerEvents="none"
              width="100%"
              height="100%"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={StyleSheet.absoluteFill}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Defs>
                <LinearGradient id="parcelCoverContrast" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#000000" stopOpacity="0.58" />
                  <Stop offset="1" stopColor="#000000" stopOpacity="0.82" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100" height="100" fill="url(#parcelCoverContrast)" />
            </Svg>
            <HStack className="items-start justify-between gap-3">
              <VStack className="flex-1 gap-0.5">
                {title ? (
                  <Text className="text-2xl font-bold text-white" numberOfLines={2}>
                    {title}
                  </Text>
                ) : null}
                {subtitle ? (
                  <Text className="text-base font-medium text-white" numberOfLines={1}>
                    {subtitle}
                  </Text>
                ) : null}
              </VStack>
              {action ? <View className="rounded-full bg-white/95">{action}</View> : null}
            </HStack>
            {coverLabel ? (
              <Text className="self-start rounded-full bg-black/35 px-2 py-1 text-xs font-medium text-white">
                {coverLabel}
              </Text>
            ) : null}
          </View>
        </ImageBackground>
      ) : title || action ? (
        <HStack className="items-start justify-between gap-3">
          <VStack className="flex-1 gap-0.5">
            {title ? (
              <Text className="text-lg font-semibold text-foreground">{title}</Text>
            ) : null}
            {subtitle ? (
              <Text className="text-sm leading-5 text-muted-foreground">
                {subtitle}
              </Text>
            ) : null}
          </VStack>
          {action}
        </HStack>
      ) : null}
      <View
        className={coverImage ? 'w-full gap-3 p-4' : 'gap-3'}
        style={coverImage ? { backgroundColor: surfaceColor } : undefined}
      >
        {children}
      </View>
    </Card>
  );
}
