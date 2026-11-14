import React from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/design-system/tokens';

type ScrollViewRef = React.ComponentRef<typeof ScrollView>;

export function Screen({
  children,
  header,
  scroll = true,
  keyboard = false,
  edges = ['top'],
  refreshControl,
  contentContainerStyle,
  testID,
  scrollRef,
}: {
  children: React.ReactNode;
  header?: React.ReactNode;
  scroll?: boolean;
  keyboard?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  refreshControl?: React.ReactElement;
  contentContainerStyle?: object;
  testID?: string;
  scrollRef?: React.RefObject<ScrollViewRef | null>;
}) {
  const body = scroll ? (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1 }}
      contentContainerStyle={[
        {
          padding: spacing.lg,
          paddingBottom: spacing.xxl,
          gap: spacing.lg,
        },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={refreshControl}
      testID={testID}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1 }} testID={testID}>
      {children}
    </View>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={edges}
    >
      {header}
      {keyboard ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}
