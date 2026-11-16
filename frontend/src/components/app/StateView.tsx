/** StateView — loading / empty / error state with illustration and one action. */
import type { ReactNode } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';
import { Illustration, type IllustrationName } from '../illustrations/Illustration';
import { colors } from '../../design/tokens';

export function StateView({
  title,
  description,
  loading = false,
  icon: Icon,
  illustration,
  action,
}: {
  title: string;
  description?: string;
  loading?: boolean;
  icon?: LucideIcon;
  illustration?: IllustrationName;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
      {loading ? (
        <Loader2 size={40} className="animate-spin" style={{ color: colors.primary }} aria-hidden="true" />
      ) : illustration ? (
        <Illustration name={illustration} size={96} />
      ) : Icon ? (
        <Icon size={40} style={{ color: colors.primary }} aria-hidden="true" />
      ) : null}
      <p className="text-lg font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="max-w-[320px] text-sm leading-5 text-muted-foreground">{description}</p>
      ) : null}
      {action}
    </div>
  );
}
