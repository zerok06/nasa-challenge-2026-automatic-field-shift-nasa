import React from 'react';

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
  const meta = statusMeta[status] ?? {
    label: status,
    variant: 'secondary' as const,
  };
  return (
    <Badge variant={meta.variant} className={meta.className} testID={testID}>
      <BadgeText className={meta.textClassName}>{label ?? meta.label}</BadgeText>
    </Badge>
  );
}

export function DemoBadge() {
  return (
    <Badge variant="outline" className="border-warning">
      <BadgeText className="text-warning">DEMO</BadgeText>
    </Badge>
  );
}
