/**
 * Screen — page container with the same rhythm as the native `Screen`:
 * 16 px padding, 32 px bottom breathing room, optional sticky header and footer.
 */
import type { ReactNode } from 'react';

export function Screen({
  children,
  header,
  footer,
  scroll = true,
  contentClassName = '',
}: {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  contentClassName?: string;
}) {
  const body = (
    <div className={`mx-auto w-full max-w-2xl space-y-4 px-4 pb-8 pt-4 ${contentClassName}`}>
      {children}
    </div>
  );

  return (
    <div className="flex min-h-full flex-col">
      {header}
      {scroll ? <main className="flex-1">{body}</main> : <div className="flex-1">{body}</div>}
      {footer ? (
        <div className="sticky bottom-0 z-20 space-y-2 border-t border-border bg-card px-4 pb-4 pt-3">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
