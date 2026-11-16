/**
 * InstallCard — explains how to install the Anden PWA.
 *
 * On Android Chrome we can open the real install prompt; on iPhone Safari the
 * only path is Share → "Añadir a inicio", so we spell out both.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Download, Smartphone } from 'lucide-react';
import { AppButton } from './AppButton';
import { SectionCard } from './SectionCard';
import { useInstallPrompt } from '../../lib/useInstallPrompt';

export function InstallCard() {
  const { t } = useTranslation();
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const [installing, setInstalling] = useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await promptInstall();
    } finally {
      setInstalling(false);
    }
  };

  if (installed) {
    return (
      <SectionCard title={t('Instala Anden en tu teléfono')}>
        <div className="flex items-start gap-3">
          <CheckCircle2 size={24} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
          <p className="flex-1 text-base leading-6 text-foreground">
            {t('Anden ya está instalada en este dispositivo')}
          </p>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={t('Instala Anden en tu teléfono')}
      subtitle={t('Se abre como una app, sin pasar por una tienda de aplicaciones.')}
    >
      <div className="flex items-start gap-3">
        <Smartphone size={24} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-base font-semibold leading-6 text-foreground">
            {t('Android con Chrome')}
          </p>
          <p className="text-sm leading-5 text-muted-foreground">
            {t('Abre el menú ⋮ y elige "Instalar aplicación" o "Agregar a pantalla principal".')}
          </p>
        </div>
      </div>
      <p className="text-sm leading-5 text-muted-foreground">
        {t('En iPhone: toca Compartir y luego "Añadir a inicio".')}
      </p>
      {canInstall ? (
        <AppButton icon={Download} loading={installing} onClick={() => void handleInstall()}>
          {t('Instalar Anden')}
        </AppButton>
      ) : null}
    </SectionCard>
  );
}
