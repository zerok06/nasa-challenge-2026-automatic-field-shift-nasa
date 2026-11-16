/**
 * Offline readiness card — tells the farmer, in plain words, whether this
 * parcel can still be reviewed without signal, and prepares it on demand.
 *
 * The "package" is the cached comparison plus the cached parcel list; it never
 * promises the agent works offline (it needs internet by design).
 */
import { useState } from 'react';
import { CloudOff, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppButton } from './AppButton';
import { SectionCard } from './SectionCard';
import { AppAlert } from './Feedback';
import { formatDate } from '../../lib/format';
import { loadCachedComparison, loadCachedComparisonSavedAt } from '../../lib/cache';
import { useOnline } from '../../lib/useOnline';
import { useComparison } from '../../providers/ComparisonProvider';
import { useToast } from '../../providers/ToastProvider';
import type { Parcel } from '../../lib/types';

export function OfflineReadyCard({ parcel }: { parcel: Parcel }) {
  const { t } = useTranslation();
  const online = useOnline();
  const toast = useToast();
  const { createComparison, busy } = useComparison();
  const [cached, setCached] = useState(() => loadCachedComparison(parcel.id));
  const [savedAt, setSavedAt] = useState(() => loadCachedComparisonSavedAt(parcel.id));
  const [error, setError] = useState<string | null>(null);

  const prepare = async () => {
    if (!online) {
      toast.info(t('Necesitas señal para preparar los datos. Lo que ya está guardado sigue disponible.'));
      return;
    }
    setError(null);
    try {
      await createComparison();
      setCached(loadCachedComparison(parcel.id));
      setSavedAt(loadCachedComparisonSavedAt(parcel.id));
      toast.success(t('Datos guardados. Ya puedes consultarlos sin señal.'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('No pudimos guardar los datos.'));
    }
  };

  return (
    <SectionCard title={t('Datos sin internet')} subtitle={t('Para consultar cuando no tengas señal')}>
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-water/10 text-water">
          <CloudOff size={24} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-foreground">
            {cached ? t('Tus datos están guardados') : t('Todavía no guardaste datos')}
          </p>
          <p className="text-sm leading-5 text-muted-foreground">
            {cached
              ? t('Guardado el {{date}} en este dispositivo. Incluye tus planes y los precios que declaraste.', {
                  date: formatDate(savedAt ?? cached.analysis_period.end),
                })
              : t(
                  'Descarga tus planes una vez y podrás revisarlos sin señal. El agente sí necesita internet.',
                )}
          </p>
        </div>
      </div>

      {error ? <AppAlert tone="error">{error}</AppAlert> : null}

      <AppButton
        tone="outline"
        icon={Download}
        fullWidth
        loading={busy}
        onClick={() => void prepare()}
      >
        {cached ? t('Actualizar datos guardados') : t('Preparar datos para sin señal')}
      </AppButton>

      <p className="text-sm leading-5 text-muted-foreground">
        {t('Sin conexión puedes comparar y simular. Las imágenes nuevas y el agente necesitan internet.')}
      </p>
    </SectionCard>
  );
}
