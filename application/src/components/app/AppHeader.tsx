import React from 'react';
import { ArrowLeft, FileText, Settings } from 'lucide-react-native';

import { AppIconButton } from '@/components/app/AppButton';
import { DemoBadge } from '@/components/app/StatusBadge';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { testIDs } from '@/design-system/testIDs';

export function AppHeader({
  title = 'ANDEN',
  subtitle,
  isSimulated = false,
  onBack,
  onSources,
  onSettings,
}: {
  title?: string;
  subtitle?: string;
  isSimulated?: boolean;
  onBack?: () => void;
  onSources?: () => void;
  onSettings?: () => void;
}) {
  return (
    <HStack testID="brand.header" className="items-center gap-2 border-b border-border bg-card px-4 py-3">
      {onBack ? (
        <AppIconButton
          icon={ArrowLeft}
          label="Volver"
          onPress={onBack}
          tone="primary"
          testID="nav.back"
        />
      ) : null}
      <VStack className="flex-1 gap-0.5">
        <Text className="text-lg font-extrabold tracking-[2px] text-primary">{title}</Text>
        {subtitle ? (
          <Text size="xs" className="text-muted-foreground" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </VStack>
      {isSimulated ? <DemoBadge /> : null}
      {onSources ? (
        <AppIconButton
          icon={FileText}
          label="Ver fuentes"
          onPress={onSources}
          testID={testIDs.dashboardSources}
          tone="muted"
        />
      ) : null}
      {onSettings ? (
        <AppIconButton
          icon={Settings}
          label="Ajustes"
          onPress={onSettings}
          testID={testIDs.navSettings}
          tone="muted"
        />
      ) : null}
    </HStack>
  );
}
