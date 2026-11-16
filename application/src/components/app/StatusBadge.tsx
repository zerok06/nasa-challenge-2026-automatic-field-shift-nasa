import React from 'react';
import { useTranslation } from 'react-i18next';

import { Badge, BadgeText } from '@/components/ui/badge';
import { statusMeta } from '@/design-system/tokens';

export function StatusBadge({
  status,
  label,
  testID,
}: {
  status: string;
  label?: string;
  testID?: string;
}) {
  const { t } = useTranslation();
  const meta = statusMeta[status] ?? {
    label: status,
    variant: 'secondary' as const,
  };
  return (
    <Badge variant={meta.variant} className={meta.className} testID={testID}>
      <BadgeText className={meta.textClassName}>{label ?? t(meta.label)}</BadgeText>
    </Badge>
  );
}


