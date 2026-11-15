import React from 'react';
import { useColorScheme } from 'react-native';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react-native';

import { Alert, AlertText } from '@/components/ui/alert';
import { colors, darkColors } from '@/design-system/tokens';

export type AlertTone = 'warning' | 'error' | 'success' | 'info' | 'neutral';

const toneClass: Record<AlertTone, string> = {
  warning: 'border-warning bg-warning/10',
  error: 'border-destructive bg-destructive/10',
  success: 'border-success bg-success/10',
  info: 'border-water bg-water/10',
  neutral: 'border-border bg-card',
};

const textClass: Record<AlertTone, string> = {
  warning: 'text-warning',
  error: 'text-destructive',
  success: 'text-success',
  info: 'text-water',
  neutral: 'text-foreground',
};

const toneIcon: Partial<Record<AlertTone, React.ComponentType<{ size?: number; color?: string }>>> = {
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
};

const toneIconColor: Record<AlertTone, string> = {
  warning: colors.warning,
  error: colors.error,
  success: colors.success,
  info: colors.water,
  neutral: colors.muted,
};

const darkToneIconColor: Record<AlertTone, string> = {
  warning: darkColors.warning,
  error: darkColors.error,
  success: '#81C784',
  info: darkColors.water,
  neutral: darkColors.muted,
};

export function AppAlert({
  tone = 'neutral',
  children,
  testID,
}: {
  tone?: AlertTone;
  children: React.ReactNode;
  testID?: string;
}) {
  const scheme = useColorScheme();
  const Icon = toneIcon[tone];
  const iconColor = scheme === 'dark' ? darkToneIconColor[tone] : toneIconColor[tone];
  return (
    <Alert
      variant={tone === 'error' ? 'destructive' : 'default'}
      className={toneClass[tone]}
      testID={testID}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      {Icon ? <Icon size={18} color={iconColor} /> : null}
      <AlertText className={textClass[tone]}>{children}</AlertText>
    </Alert>
  );
}
