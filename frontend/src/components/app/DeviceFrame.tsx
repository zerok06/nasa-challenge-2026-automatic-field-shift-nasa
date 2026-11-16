/**
 * DeviceFrame — desktop presentation of the PWA.
 *
 * On a wide screen the whole app renders inside a phone-sized frame so it
 * always looks like the app it is. The `translateZ(0)` is load-bearing: it
 * turns the frame into the containing block for `position: fixed` descendants
 * (bottom nav, toasts, sticky composers), so they dock to the phone, not to
 * the browser window.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export function DeviceFrame({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const host = typeof window === 'undefined' ? '' : window.location.host;

  return (
    <div className="flex min-h-dvh items-center justify-center gap-12 bg-background px-6 py-6">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(27,94,32,0.12),transparent),radial-gradient(40%_35%_at_85%_90%,rgba(141,110,99,0.10),transparent)]"
      />
      <div className="relative hidden max-w-xs space-y-4 xl:block">
        <img
          src="/img/anden-icon.png"
          alt=""
          width={56}
          height={56}
          className="h-14 w-14 rounded-2xl"
        />
        <p className="text-3xl font-bold tracking-tight text-foreground">
          Anden en tu computadora
        </p>
        <p className="text-base leading-6 text-muted-foreground">
          {t(
            'Es la misma app del teléfono. En tu celular ábrela en Chrome y usa “Instalar aplicación”: funciona sin señal y sin tienda.',
          )}
        </p>
        {host ? (
          <p className="rounded-xl border border-border bg-card px-3 py-2 font-mono text-sm text-primary">
            {host}
          </p>
        ) : null}
      </div>

      <div className="relative">
        <div className="h-[min(880px,94dvh)] w-[400px] max-w-full overflow-y-auto overscroll-contain rounded-[2.5rem] border-[10px] border-foreground/90 bg-background shadow-float [transform:translateZ(0)]">
          {children}
        </div>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          {t('Anden · piloto Moquegua · app gratuita')}
        </p>
      </div>
    </div>
  );
}
