/** Fuentes y límites — web port of the native SourcesScreen. */
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, CloudOff } from 'lucide-react';
import { AppButton } from '../components/app/AppButton';
import { AppHeader } from '../components/app/AppHeader';
import { SectionCard } from '../components/app/SectionCard';
import { MetricRow } from '../components/app/Metric';
import { Disclosure } from '../components/app/Feedback';
import { Illustration } from '../components/illustrations/Illustration';
import { Screen } from '../components/app/Screen';
import { qualityLabel } from '../design/tokens';
import { formatDate } from '../lib/format';
import { useParcel } from '../providers/ParcelProvider';

export default function Sources() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { indicators } = useParcel();
  const source = indicators?.source;

  return (
    <Screen header={<AppHeader title="FUENTES" subtitle={t('De dónde vienen los datos')} onBack={() => navigate(-1)} />}>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <Illustration name="sources" size={64} />
        <p className="flex-1 text-sm leading-5 text-muted-foreground">
          {t('Cada número se puede rastrear hasta su fuente. Si no hay dato, lo decimos.')}
        </p>
      </div>

      <SectionCard
        title={t('Datos del clima')}
        subtitle={t('Cada número se puede rastrear hasta su fuente')}
      >
        <MetricRow label={t('Fuente')} value={source?.source ?? 'NASA POWER'} />
        <MetricRow label={t('Resolución')} value={source?.resolution ?? t('No disponible')} />
        <MetricRow
          label={t('Calidad')}
          value={
            source?.quality_flag
              ? t(qualityLabel[source.quality_flag] ?? source.quality_flag)
              : t('No declarada')
          }
        />
        <MetricRow label={t('Actualizado')} value={formatDate(source?.retrieved_at)} />
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('¿Son datos de ejemplo?')}</span>
          <span className="text-sm font-semibold text-foreground">
            {source?.is_simulated ? t('Sí, de ejemplo') : t('No, son datos reales')}
          </span>
        </div>
      </SectionCard>

      <SectionCard
        title={t('Fuentes de esta parcela')}
        subtitle={t('Clima histórico, pronóstico, terreno y precios')}
      >
        <MetricRow label="NASA POWER" value={t('Clima histórico por parcela')} />
        <MetricRow label="Open-Meteo" value={t('Pronóstico de 7 días')} />
        <MetricRow label="SRTM / Copernicus" value={t('Elevación y pendiente')} />
        <MetricRow label={t('Precios')} value={t('Ingresados por ti; referencia pendiente')} />
      </SectionCard>

      <SectionCard
        title={t('Qué funciona sin internet')}
        subtitle={t('Lo que puedes revisar y guardar sin señal')}
      >
        <ul className="space-y-2">
          <li className="flex items-start gap-3 rounded-xl bg-primary-50 px-3 py-2">
            <Check size={18} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
            <span className="text-sm leading-5 text-foreground">
              {t('Revisar tu parcela, tu ficha, tus precios y tu última comparación')}
            </span>
          </li>
          <li className="flex items-start gap-3 rounded-xl bg-primary-50 px-3 py-2">
            <Check size={18} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
            <span className="text-sm leading-5 text-foreground">
              {t('Guardar cambios: se envían cuando vuelve la señal')}
            </span>
          </li>
          <li className="flex items-start gap-3 rounded-xl bg-warning/5 px-3 py-2">
            <CloudOff size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
            <span className="text-sm leading-5 text-foreground">
              {t('El agente y el riego de la semana necesitan internet')}
            </span>
          </li>
        </ul>
        <p className="text-sm leading-5 text-muted-foreground">
          {t('Los datos se guardan en tu teléfono; no se venden.')}
        </p>
      </SectionCard>

      <SectionCard title={t('Cómo se calcula')}>
        <Disclosure title={t('Agua')}>
          <p className="text-sm leading-5 text-muted-foreground">
            {t(
              'La ETo se estima con temperatura y radiación (FAO-56). El riego usa el agua de lluvia, la eficiencia y las etapas del cultivo.',
            )}
          </p>
        </Disclosure>
        <Disclosure title={t('Ganancia')}>
          <p className="text-sm leading-5 text-muted-foreground">
            {t(
              'La ganancia usa tu rendimiento, tu precio de venta y tus costos. Si falta uno, se muestra como no calculable.',
            )}
          </p>
        </Disclosure>
        <Disclosure title={t('Qué no podemos afirmar')}>
          <p className="text-sm leading-5 text-muted-foreground">
            {t(
              'No medimos la humedad de tu parcela. No predecimos el clima ni el precio. No reemplazamos a un agrónomo.',
            )}
          </p>
        </Disclosure>
      </SectionCard>

      <SectionCard title={t('Licencia y atribución')}>
        <p className="text-sm leading-5 text-foreground">
          {t(
            'Código MIT. Datos de NASA POWER, FAO-56 y el anuario de Moquegua. App gratuita para agricultores; no se venden datos.',
          )}
        </p>
      </SectionCard>

      <AppButton tone="outline" fullWidth onClick={() => navigate('/ajustes')}>
        {t('Ajustes')}
      </AppButton>
    </Screen>
  );
}
