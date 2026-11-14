import React from 'react';

import { Alert, AlertText } from '@/components/ui/alert';

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

export function AppAlert({
  tone = 'neutral',
  children,
  testID,
}: {
  tone?: AlertTone;
  children: React.ReactNode;
  testID?: string;
}) {
  return (
    <Alert
      variant={tone === 'error' ? 'destructive' : 'default'}
      className={toneClass[tone]}
      testID={testID}
    >
      <AlertText className={textClass[tone]}>{children}</AlertText>
    </Alert>
  );
}
