/**
 * Ajustes — language, appearance and About, mirroring the native settings copy.
 * Quechua and Aymara are marked as drafts pending native review.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, CloudOff, Globe2, Info, Leaf, Share2 } from 'lucide-react';
import { AppHeader } from '../components/app/AppHeader';
import { Badge } from '../components/app/Badge';
import { InstallCard } from '../components/app/InstallCard';
import { ListRow } from '../components/app/ListRow';
import { SectionCard } from '../components/app/SectionCard';
import { Screen } from '../components/app/Screen';
import { colors } from '../design/tokens';
import { languageOptions, setLanguage, translationStatus, type LanguageCode } from '../i18n';
import { useToast } from '../providers/ToastProvider';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const [reduceMotion, setReduceMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  const current = (i18n.language as LanguageCode) ?? 'es-PE';
  const shareText = t(
    'Abre este enlace en Chrome y agrégalo a tu pantalla de inicio. Funciona como una app y guarda tus datos para consultarlos sin señal.',
  );

  const copyShareText = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText} ${window.location.origin}`);
      toast.info(t('Enlace copiado. Puedes compartirlo por WhatsApp.'));
    } catch {
      toast.error(t('No pudimos copiar el enlace.'));
    }
  };

  const handleShare = async () => {
    const payload = { title: 'Anden', text: shareText, url: window.location.origin };
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(payload);
        return;
      } catch (cause) {
        // Closing the share sheet is not an error: stay quiet.
        if (cause instanceof Error && cause.name === 'AbortError') return;
        await copyShareText();
        return;
      }
    }
    await copyShareText();
  };

  return (
    <Screen header={<AppHeader subtitle={t('Ajustes')} onBack={() => navigate(-1)} />}>
      <SectionCard title={t('Idioma')} subtitle={t('Elige cómo quieres leer la app')}>
        {languageOptions.map((option) => {
          const selected = current === option.code;
          const draft = translationStatus[option.code] === 'review_pending';
          return (
            <button
              key={option.code}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setLanguage(option.code)}
              className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-4 py-2 ${
                selected ? 'border-primary bg-accent' : 'border-border bg-card'
              }`}
            >
              <span className="text-left">
                <span className={`block text-base ${selected ? 'font-semibold text-primary' : 'text-foreground'}`}>
                  {option.nativeLabel}
                </span>
                <span className="block text-sm text-muted-foreground">{t(option.helper)}</span>
              </span>
              {selected ? <Check size={20} style={{ color: colors.primary }} aria-hidden="true" /> : null}
              {draft && !selected ? (
                <Badge tone="warning">{t('Borrador pendiente de revisión')}</Badge>
              ) : null}
            </button>
          );
        })}
        <p className="text-sm leading-5 text-muted-foreground">
          {t('Quechua y aimara están en revisión con hablantes nativos.')}
        </p>
      </SectionCard>

      <SectionCard title={t('Accesibilidad')} subtitle={t('Reduce las animaciones de la app')}>
        <label className="flex min-h-12 items-center justify-between gap-3">
          <span className="flex-1 text-base text-foreground">{t('Reducir movimiento')}</span>
          <input
            type="checkbox"
            checked={reduceMotion}
            onChange={(event) => setReduceMotion(event.target.checked)}
            className="h-6 w-6 accent-primary"
          />
        </label>
        <p className="text-sm leading-5 text-muted-foreground">
          {t('Desactiva las animaciones de gráficos y pantallas.')}
        </p>
      </SectionCard>

      <SectionCard title={t('Sin conexión')} subtitle={t('Lo que puedes hacer sin señal')}>
        <ul className="space-y-2">
          <li className="flex items-start gap-3 rounded-xl bg-primary-50 px-3 py-2">
            <Check size={18} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
            <span className="text-sm leading-5 text-foreground">
              {t('Puedes revisar tu parcela, tu ficha, tus precios y tu última comparación')}
            </span>
          </li>
          <li className="flex items-start gap-3 rounded-xl bg-primary-50 px-3 py-2">
            <Check size={18} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
            <span className="text-sm leading-5 text-foreground">
              {t('Puedes guardar cambios: se envían cuando vuelve la señal')}
            </span>
          </li>
          <li className="flex items-start gap-3 rounded-xl bg-warning/5 px-3 py-2">
            <CloudOff size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
            <span className="text-sm leading-5 text-foreground">
              {t('El agente y el riego de la semana necesitan internet')}
            </span>
          </li>
        </ul>
      </SectionCard>

      <ListRow
        illustration="sources"
        tone="water"
        title={t('Fuentes y límites')}
        subtitle={t('De dónde vienen los datos y qué no podemos afirmar')}
        onClick={() => navigate('/fuentes')}
      />

      <InstallCard />

      <SectionCard title={t('Acerca de Anden')}>
        <div className="flex items-center gap-3">
          <Globe2 size={24} style={{ color: colors.primary }} aria-hidden="true" />
          <p className="flex-1 text-sm leading-5 text-muted-foreground">
            {t('Hecho para agricultores de Moquegua')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Info size={24} style={{ color: colors.water }} aria-hidden="true" />
          <p className="flex-1 text-sm leading-5 text-muted-foreground">
            {t('Versión')} 0.1.0 · PWA
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Leaf size={24} style={{ color: colors.earth }} aria-hidden="true" />
          <p className="flex-1 text-sm leading-5 text-muted-foreground">
            {t('Código MIT. Datos de NASA POWER, FAO-56 y el anuario de Moquegua.')}
          </p>
        </div>
      </SectionCard>

      <ListRow
        icon={Share2}
        title={t('Compartir Anden')}
        subtitle={t('Envía el enlace a otro agricultor')}
        onClick={() => void handleShare()}
      />

      <p className="text-center text-sm leading-5 text-muted-foreground">
        {t('Anden · piloto Moquegua · datos abiertos de NASA · app gratuita')}
      </p>
    </Screen>
  );
}
