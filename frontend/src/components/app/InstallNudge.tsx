/**
 * InstallNudge — mobile-only banner that suggests installing the PWA.
 *
 * Shown once until dismissed or installed. On Android Chrome with an install
 * prompt available it opens the native prompt; otherwise (iOS, desktop-class
 * browsers) it shows the two-tap manual steps.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Smartphone, X } from 'lucide-react';
import { AppButton } from './AppButton';
import { useInstallPrompt } from '../../lib/useInstallPrompt';

const DISMISS_KEY = 'anden.install_nudge.dismissed.v1';

export function InstallNudge({ mobile }: { mobile: boolean }) {
  const { t } = useTranslation();
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => window.localStorage.getItem(DISMISS_KEY) === '1',
  );

  if (!mobile || installed || dismissed) return null;

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await promptInstall();
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="flex items-start gap-3 border-b border-border bg-primary px-4 py-3 text-white">
      <Smartphone size={22} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-bold leading-5">{t('Lleva Anden en tu teléfono')}</p>
        <p className="text-sm leading-5 text-white/90">
          {canInstall
            ? t('Instálala como app: abre más rápido y guarda tus datos sin señal.')
            : t('En Chrome: menú ⋮ → “Instalar aplicación”. En iPhone: Compartir → “Añadir a inicio”.')}
        </p>
        {canInstall ? (
          <AppButton
            size="sm"
            tone="surface"
            loading={installing}
            onClick={() => void handleInstall()}
          >
            {t('Instalar Anden')}
          </AppButton>
        ) : null}
      </div>
      <button
        type="button"
        aria-label={t('Ahora no')}
        onClick={dismiss}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/90 hover:bg-white/15"
      >
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
